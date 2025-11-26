import { Body, Controller, Delete, Get, Param, Patch, Post } from "@nestjs/common";
import { IsEmail, IsEnum } from "class-validator";
import { Role } from "@prisma/client";
import { InvitationsService } from "./invitations.service";
import { Auth } from "../auth/auth.decorator";
import { AuthContext } from "../auth/auth.types";
import { Roles } from "../auth/roles.decorator";
import { Public } from "../auth/public.decorator";

class CreateInvitationDto {
    @IsEmail()
    email!: string;

    @IsEnum(Role)
    role!: Role;
}

@Controller("invitations")
export class InvitationsController {
    constructor(private readonly invitationsService: InvitationsService) { }

    @Get()
    @Roles("ADMIN", "AGENCY")
    list(@Auth() auth: AuthContext) {
        return this.invitationsService.list(auth.tenantId);
    }

    @Get("pending")
    getPendingForUser(@Auth() auth: AuthContext) {
        return this.invitationsService.getPendingForUser(auth.userId);
    }

    @Get("verify/:token")
    @Public()
    verifyToken(@Param("token") token: string) {
        return this.invitationsService.getByToken(token);
    }

    @Get(":id")
    @Roles("ADMIN", "AGENCY")
    getById(@Param("id") id: string) {
        return this.invitationsService.getById(id);
    }

    @Post()
    @Roles("ADMIN", "AGENCY")
    create(@Body() dto: CreateInvitationDto, @Auth() auth: AuthContext) {
        return this.invitationsService.create(auth.tenantId, auth.userId, dto);
    }

    @Post(":token/accept")
    accept(@Param("token") token: string, @Auth() auth: AuthContext) {
        return this.invitationsService.accept(token, auth.userId);
    }

    @Patch(":id/cancel")
    @Roles("ADMIN", "AGENCY")
    cancel(@Param("id") id: string, @Auth() auth: AuthContext) {
        return this.invitationsService.cancel(id, auth.tenantId);
    }

    @Patch(":id/resend")
    @Roles("ADMIN", "AGENCY")
    resend(@Param("id") id: string, @Auth() auth: AuthContext) {
        return this.invitationsService.resend(id, auth.tenantId, auth.userId);
    }

    @Delete(":id")
    @Roles("ADMIN", "AGENCY")
    delete(@Param("id") id: string, @Auth() auth: AuthContext) {
        return this.invitationsService.delete(id, auth.tenantId);
    }
}
