import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { JwtService } from "@nestjs/jwt";
import { PrismaService } from "../prisma/prisma.service";
import { AuthContext } from "./auth.types";
import { IS_PUBLIC_KEY } from "./auth.decorator";
import { JwtPayload } from "./auth.service";

@Injectable()
export class AuthGuard implements CanActivate {
    constructor(
        private readonly prisma: PrismaService,
        private readonly reflector: Reflector,
        private readonly jwtService: JwtService
    ) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
            context.getHandler(),
            context.getClass()
        ]);
        if (isPublic) {
            return true;
        }

        const request = context.switchToHttp().getRequest();

        // Try JWT Bearer token first
        const authHeader = request.headers.authorization;
        if (authHeader?.startsWith("Bearer ")) {
            return this.validateJwtAuth(request, authHeader.slice(7));
        }

        // Fall back to legacy header-based auth (for development/testing)
        const userId = (request.headers["x-user-id"] as string | undefined)?.trim();
        const tenantId = (request.headers["x-tenant-id"] as string | undefined)?.trim();

        if (userId && tenantId) {
            return this.validateHeaderAuth(request, userId, tenantId);
        }

        throw new UnauthorizedException("Missing authentication");
    }

    private async validateJwtAuth(request: any, token: string): Promise<boolean> {
        let payload: JwtPayload;
        try {
            payload = this.jwtService.verify<JwtPayload>(token);
        } catch {
            throw new UnauthorizedException("Invalid or expired token");
        }

        const userId = payload.sub;
        const tenantId = (request.headers["x-tenant-id"] as string | undefined)?.trim();

        if (!tenantId) {
            // If no tenant specified, get the user's first/default tenant
            const membership = await this.prisma.userTenantRole.findFirst({
                where: { userId },
                orderBy: { createdAt: "asc" }
            });

            if (!membership) {
                throw new ForbiddenException("User has no tenant memberships");
            }

            const authContext: AuthContext = {
                userId,
                tenantId: membership.tenantId,
                role: membership.role
            };
            request.auth = authContext;
            return true;
        }

        // Validate membership for specific tenant
        const membership = await this.prisma.userTenantRole.findUnique({
            where: {
                userId_tenantId: { userId, tenantId }
            }
        });

        if (!membership) {
            throw new ForbiddenException("Not a member of this tenant");
        }

        const authContext: AuthContext = {
            userId,
            tenantId,
            role: membership.role
        };
        request.auth = authContext;
        return true;
    }

    private async validateHeaderAuth(request: any, userId: string, tenantId: string): Promise<boolean> {
        const membership = await this.prisma.userTenantRole.findUnique({
            where: {
                userId_tenantId: { userId, tenantId }
            }
        });

        if (!membership) {
            throw new ForbiddenException("Not a member of this tenant");
        }

        const authContext: AuthContext = {
            userId,
            tenantId,
            role: membership.role
        };
        request.auth = authContext;
        return true;
    }
}
