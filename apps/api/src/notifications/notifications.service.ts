import { Injectable } from "@nestjs/common";
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

  markRead(id: string) {
    return this.prisma.notification.update({
      where: { id },
      data: { readAt: new Date() }
    });
  }
}
