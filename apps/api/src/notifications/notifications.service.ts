import { Injectable, NotFoundException } from "@nestjs/common";
import { NotificationChannel, NotificationType, Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

export interface NotificationFilters {
    userId?: string;
    tenantId?: string;
    type?: NotificationType;
    channel?: NotificationChannel;
    unreadOnly?: boolean;
    limit?: number;
    offset?: number;
}

export interface NotificationPreferencesUpdate {
    emailEnabled?: boolean;
    pushEnabled?: boolean;
    inAppEnabled?: boolean;
    approvalRequests?: boolean;
    approvalDecisions?: boolean;
    revisionRequests?: boolean;
    comments?: boolean;
    mentions?: boolean;
    scheduleReminders?: boolean;
    publishSuccess?: boolean;
    publishFailure?: boolean;
    tokenExpiry?: boolean;
    weeklyDigest?: boolean;
    analyticsAlerts?: boolean;
    quietHoursStart?: number | null;
    quietHoursEnd?: number | null;
    timezone?: string;
}

@Injectable()
export class NotificationsService {
    constructor(private readonly prisma: PrismaService) {}

    async list(filters: NotificationFilters = {}) {
        const where: Prisma.NotificationWhereInput = {};

        if (filters.userId) where.userId = filters.userId;
        if (filters.tenantId) where.tenantId = filters.tenantId;
        if (filters.type) where.type = filters.type;
        if (filters.channel) where.channel = filters.channel;
        if (filters.unreadOnly) where.readAt = null;

        const [notifications, total] = await Promise.all([
            this.prisma.notification.findMany({
                where,
                orderBy: { createdAt: "desc" },
                take: filters.limit || 50,
                skip: filters.offset || 0,
            }),
            this.prisma.notification.count({ where }),
        ]);

        return { notifications, total };
    }

    async getUnreadCount(userId: string, tenantId?: string): Promise<number> {
        return this.prisma.notification.count({
            where: {
                userId,
                tenantId,
                readAt: null,
            },
        });
    }

    async markRead(id: string, userId: string) {
        const notification = await this.prisma.notification.findUnique({ where: { id } });
        if (!notification || notification.userId !== userId) {
            throw new NotFoundException("Notification not found");
        }
        return this.prisma.notification.update({
            where: { id },
            data: { readAt: new Date() },
        });
    }

    async markAllRead(userId: string, tenantId?: string) {
        const result = await this.prisma.notification.updateMany({
            where: {
                userId,
                tenantId,
                readAt: null,
            },
            data: { readAt: new Date() },
        });
        return { marked: result.count };
    }

    async delete(id: string, userId: string) {
        const notification = await this.prisma.notification.findUnique({ where: { id } });
        if (!notification || notification.userId !== userId) {
            throw new NotFoundException("Notification not found");
        }
        await this.prisma.notification.delete({ where: { id } });
        return { deleted: true };
    }

    async deleteAll(userId: string, tenantId?: string) {
        const result = await this.prisma.notification.deleteMany({
            where: { userId, tenantId },
        });
        return { deleted: result.count };
    }

    // Preferences
    async getPreferences(userId: string, tenantId?: string) {
        let prefs = await this.prisma.notificationPreference.findFirst({
            where: {
                userId,
                OR: [{ tenantId }, { tenantId: null }],
            },
            orderBy: { tenantId: "desc" },
        });

        if (!prefs) {
            // Create default preferences
            prefs = await this.prisma.notificationPreference.create({
                data: {
                    userId,
                    tenantId,
                },
            });
        }

        return prefs;
    }

    async updatePreferences(userId: string, tenantId: string | undefined, updates: NotificationPreferencesUpdate) {
        return this.prisma.notificationPreference.upsert({
            where: {
                userId_tenantId: {
                    userId,
                    tenantId: tenantId || "",
                },
            },
            create: {
                userId,
                tenantId,
                ...updates,
            },
            update: updates,
        });
    }

    // Stats for admin
    async getStats(tenantId?: string) {
        const where = tenantId ? { tenantId } : {};

        const [total, unread, byType, byChannel] = await Promise.all([
            this.prisma.notification.count({ where }),
            this.prisma.notification.count({ where: { ...where, readAt: null } }),
            this.prisma.notification.groupBy({
                by: ["type"],
                where,
                _count: true,
            }),
            this.prisma.notification.groupBy({
                by: ["channel"],
                where,
                _count: true,
            }),
        ]);

        return {
            total,
            unread,
            byType: byType.reduce((acc, item) => {
                acc[item.type] = item._count;
                return acc;
            }, {} as Record<string, number>),
            byChannel: byChannel.reduce((acc, item) => {
                acc[item.channel] = item._count;
                return acc;
            }, {} as Record<string, number>),
        };
    }
}
