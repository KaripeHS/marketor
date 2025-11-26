import { BadRequestException, Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcryptjs";
import { PrismaService } from "../prisma/prisma.service";

export interface JwtPayload {
    sub: string;
    email: string;
}

export interface TokenResponse {
    accessToken: string;
    user: {
        id: string;
        email: string;
        name: string | null;
    };
    memberships: {
        tenantId: string;
        tenantName: string;
        tenantSlug: string;
        role: string;
    }[];
}

@Injectable()
export class AuthService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly jwtService: JwtService
    ) { }

    async register(email: string, password: string, name?: string): Promise<TokenResponse> {
        const existingUser = await this.prisma.user.findUnique({
            where: { email: email.toLowerCase() }
        });

        if (existingUser) {
            throw new BadRequestException("Email already registered");
        }

        const passwordHash = await bcrypt.hash(password, 10);

        const user = await this.prisma.user.create({
            data: {
                email: email.toLowerCase(),
                name,
                passwordHash,
                authProvider: "local"
            }
        });

        // Create a default tenant for the user
        const tenant = await this.prisma.tenant.create({
            data: {
                name: name ? `${name}'s Workspace` : "My Workspace",
                slug: `workspace-${user.id.slice(0, 8)}`
            }
        });

        // Add user as admin of the tenant
        await this.prisma.userTenantRole.create({
            data: {
                userId: user.id,
                tenantId: tenant.id,
                role: "ADMIN"
            }
        });

        return this.generateTokenResponse(user.id);
    }

    async login(email: string, password: string): Promise<TokenResponse> {
        const user = await this.prisma.user.findUnique({
            where: { email: email.toLowerCase() }
        });

        if (!user || !user.passwordHash) {
            throw new UnauthorizedException("Invalid email or password");
        }

        const isValidPassword = await bcrypt.compare(password, user.passwordHash);
        if (!isValidPassword) {
            throw new UnauthorizedException("Invalid email or password");
        }

        return this.generateTokenResponse(user.id);
    }

    async validateToken(token: string): Promise<JwtPayload> {
        try {
            return this.jwtService.verify<JwtPayload>(token);
        } catch {
            throw new UnauthorizedException("Invalid or expired token");
        }
    }

    private async generateTokenResponse(userId: string): Promise<TokenResponse> {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            include: {
                memberships: {
                    include: {
                        tenant: true
                    }
                }
            }
        });

        if (!user) {
            throw new UnauthorizedException("User not found");
        }

        const payload: JwtPayload = {
            sub: user.id,
            email: user.email
        };

        const accessToken = this.jwtService.sign(payload);

        return {
            accessToken,
            user: {
                id: user.id,
                email: user.email,
                name: user.name
            },
            memberships: user.memberships.map(m => ({
                tenantId: m.tenant.id,
                tenantName: m.tenant.name,
                tenantSlug: m.tenant.slug,
                role: m.role
            }))
        };
    }

    async refreshUserData(userId: string): Promise<TokenResponse> {
        return this.generateTokenResponse(userId);
    }
}
