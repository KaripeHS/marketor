import { Body, Controller, Get, Post } from "@nestjs/common";
import { IsEmail, IsOptional, IsString, MinLength } from "class-validator";
import { Auth } from "./auth.decorator";
import { AuthContext } from "./auth.types";
import { AuthService } from "./auth.service";
import { PrismaService } from "../prisma/prisma.service";
import { Public } from "./public.decorator";

class RegisterDto {
    @IsEmail()
    email!: string;

    @IsString()
    @MinLength(8)
    password!: string;

    @IsOptional()
    @IsString()
    name?: string;
}

class LoginDto {
    @IsEmail()
    email!: string;

    @IsString()
    password!: string;
}

@Controller("auth")
export class AuthController {
    constructor(
        private readonly prisma: PrismaService,
        private readonly authService: AuthService
    ) { }

    @Public()
    @Post("register")
    async register(@Body() dto: RegisterDto) {
        return this.authService.register(dto.email, dto.password, dto.name);
    }

    @Public()
    @Post("login")
    async login(@Body() dto: LoginDto) {
        return this.authService.login(dto.email, dto.password);
    }

    @Get("whoami")
    async whoami(@Auth() auth: AuthContext) {
        const [user, tenant] = await Promise.all([
            this.prisma.user.findUnique({
                where: { id: auth.userId },
                include: {
                    memberships: {
                        where: { tenantId: auth.tenantId },
                        include: { tenant: true }
                    }
                }
            }),
            this.prisma.tenant.findUnique({
                where: { id: auth.tenantId }
            })
        ]);

        return {
            user: user ? {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.memberships[0]?.role
            } : null,
            tenant: tenant ? {
                id: tenant.id,
                name: tenant.name,
                slug: tenant.slug
            } : null
        };
    }

    @Get("refresh")
    async refresh(@Auth() auth: AuthContext) {
        return this.authService.refreshUserData(auth.userId);
    }
}
