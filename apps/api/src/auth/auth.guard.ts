import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { PrismaService } from "../prisma/prisma.service";
import { AuthContext } from "./auth.types";
import { IS_PUBLIC_KEY } from "./public.decorator";

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService, private readonly reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass()
    ]);
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const userId = (request.headers["x-user-id"] as string | undefined)?.trim();
    const tenantId = (request.headers["x-tenant-id"] as string | undefined)?.trim();

    if (!userId || !tenantId) {
      throw new UnauthorizedException("Missing auth headers");
    }

    const membership = await this.prisma.userTenantRole.findUnique({
      where: {
        userId_tenantId: {
          userId,
          tenantId
        }
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
