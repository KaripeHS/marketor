import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { Prisma } from "@prisma/client";

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  list(where: Prisma.NotificationWhereInput = {}) {
    return this.prisma.notification.findMany({
      where,
      orderBy: { createdAt: "desc" }
    });
  }

  create(data: { userId: string; type: string; payload: Prisma.InputJsonValue }) {
    return this.prisma.notification.create({
      data
    });
  }

  async markRead(id: string, userId?: string) {
    if (userId) {
      const notif = await this.prisma.notification.findUnique({ where: { id } });
      if (!notif || notif.userId !== userId) {
        throw new NotFoundException("Notification not found for user");
      }
    }
    return this.prisma.notification.update({
      where: { id },
      data: { readAt: new Date() }
    });
  }
}
