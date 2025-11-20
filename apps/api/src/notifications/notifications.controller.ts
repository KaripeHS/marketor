import { Body, Controller, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { IsNotEmpty, IsOptional, IsString } from "class-validator";
import { Auth } from "../auth/auth.decorator";
import { AuthContext } from "../auth/auth.types";
import { NotificationsService } from "./notifications.service";

class CreateNotificationDto {
  @IsString()
  @IsOptional()
  userId?: string;

  @IsString()
  @IsNotEmpty()
  type!: string;

  payload!: unknown;
}

@Controller("notifications")
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  list(@Query("userId") userId?: string, @Auth() auth?: AuthContext) {
    const targetUserId = userId || auth?.userId;
    const where = targetUserId ? { userId: targetUserId } : {};
    return this.notificationsService.list(where);
  }

  @Post()
  create(@Body() dto: CreateNotificationDto, @Auth() auth: AuthContext) {
    return this.notificationsService.create({
      userId: dto.userId || auth.userId,
      type: dto.type,
      payload: dto.payload as Prisma.InputJsonValue
    });
  }

  @Patch(":id/read")
  markRead(@Param("id") id: string, @Auth() auth: AuthContext) {
    return this.notificationsService.markRead(id, auth.userId);
  }
}
