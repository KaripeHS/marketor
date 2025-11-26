import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, Max, Min } from "class-validator";
import { NotificationChannel, NotificationType } from "@prisma/client";
import { Transform } from "class-transformer";
import { Auth } from "../auth/auth.decorator";
import { AuthContext } from "../auth/auth.types";
import { Roles } from "../auth/roles.decorator";
import { NotificationsService } from "./notifications.service";

class ListNotificationsDto {
    @IsOptional()
    @IsEnum(NotificationType)
    type?: NotificationType;

    @IsOptional()
    @IsEnum(NotificationChannel)
    channel?: NotificationChannel;

    @IsOptional()
    @Transform(({ value }) => value === "true")
    @IsBoolean()
    unreadOnly?: boolean;

    @IsOptional()
    @Transform(({ value }) => parseInt(value))
    @IsInt()
    @Min(1)
    @Max(100)
    limit?: number;

    @IsOptional()
    @Transform(({ value }) => parseInt(value))
    @IsInt()
    @Min(0)
    offset?: number;
}

class UpdatePreferencesDto {
    @IsOptional() @IsBoolean() emailEnabled?: boolean;
    @IsOptional() @IsBoolean() pushEnabled?: boolean;
    @IsOptional() @IsBoolean() inAppEnabled?: boolean;
    @IsOptional() @IsBoolean() approvalRequests?: boolean;
    @IsOptional() @IsBoolean() approvalDecisions?: boolean;
    @IsOptional() @IsBoolean() revisionRequests?: boolean;
    @IsOptional() @IsBoolean() comments?: boolean;
    @IsOptional() @IsBoolean() mentions?: boolean;
    @IsOptional() @IsBoolean() scheduleReminders?: boolean;
    @IsOptional() @IsBoolean() publishSuccess?: boolean;
    @IsOptional() @IsBoolean() publishFailure?: boolean;
    @IsOptional() @IsBoolean() tokenExpiry?: boolean;
    @IsOptional() @IsBoolean() weeklyDigest?: boolean;
    @IsOptional() @IsBoolean() analyticsAlerts?: boolean;
    @IsOptional() @IsInt() @Min(0) @Max(23) quietHoursStart?: number;
    @IsOptional() @IsInt() @Min(0) @Max(23) quietHoursEnd?: number;
    @IsOptional() @IsString() timezone?: string;
}

@Controller("notifications")
export class NotificationsController {
    constructor(private readonly notificationsService: NotificationsService) {}

    @Get()
    async list(
        @Query() query: ListNotificationsDto,
        @Auth() auth: AuthContext
    ) {
        return this.notificationsService.list({
            userId: auth.userId,
            tenantId: auth.tenantId,
            type: query.type,
            channel: query.channel,
            unreadOnly: query.unreadOnly,
            limit: query.limit,
            offset: query.offset,
        });
    }

    @Get("unread-count")
    async getUnreadCount(@Auth() auth: AuthContext) {
        const count = await this.notificationsService.getUnreadCount(auth.userId, auth.tenantId);
        return { count };
    }

    @Patch(":id/read")
    async markRead(@Param("id") id: string, @Auth() auth: AuthContext) {
        return this.notificationsService.markRead(id, auth.userId);
    }

    @Post("read-all")
    async markAllRead(@Auth() auth: AuthContext) {
        return this.notificationsService.markAllRead(auth.userId, auth.tenantId);
    }

    @Delete(":id")
    async delete(@Param("id") id: string, @Auth() auth: AuthContext) {
        return this.notificationsService.delete(id, auth.userId);
    }

    @Delete()
    async deleteAll(@Auth() auth: AuthContext) {
        return this.notificationsService.deleteAll(auth.userId, auth.tenantId);
    }

    // Preferences endpoints
    @Get("preferences")
    async getPreferences(@Auth() auth: AuthContext) {
        return this.notificationsService.getPreferences(auth.userId, auth.tenantId);
    }

    @Patch("preferences")
    async updatePreferences(
        @Body() dto: UpdatePreferencesDto,
        @Auth() auth: AuthContext
    ) {
        return this.notificationsService.updatePreferences(auth.userId, auth.tenantId, dto);
    }

    // Admin endpoint
    @Get("stats")
    @Roles("ADMIN")
    async getStats(@Auth() auth: AuthContext) {
        return this.notificationsService.getStats(auth.tenantId);
    }
}
