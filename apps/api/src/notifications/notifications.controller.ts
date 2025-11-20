import { Body, Controller, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { IsNotEmpty, IsString } from "class-validator";
import { NotificationsService } from "./notifications.service";

class CreateNotificationDto {
  @IsString()
  @IsNotEmpty()
  userId!: string;

  @IsString()
  @IsNotEmpty()
  type!: string;

  payload!: unknown;
}

@Controller("notifications")
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  list(@Query("userId") userId?: string) {
    const where = userId ? { userId } : {};
    return this.notificationsService.list(where);
  }

  @Post()
  create(@Body() dto: CreateNotificationDto) {
    return this.notificationsService.create({
      userId: dto.userId,
      type: dto.type,
      payload: dto.payload as Prisma.InputJsonValue
    });
  }

  @Patch(":id/read")
  markRead(@Param("id") id: string) {
    return this.notificationsService.markRead(id);
  }
}
