import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

export interface SystemHealth {
    status: "healthy" | "degraded" | "unhealthy";
    uptime: number;
    timestamp: Date;
    services: {
        database: ServiceStatus;
        cache: ServiceStatus;
        queue: ServiceStatus;
    };
    memory: {
        used: number;
        total: number;
        percentage: number;
    };
}

export interface ServiceStatus {
    status: "up" | "down" | "degraded";
    latency?: number;
    lastCheck: Date;
    error?: string;
}

export interface SystemStats {
    tenants: {
        total: number;
        active: number;
        newThisMonth: number;
    };
    users: {
        total: number;
        active: number;
        newThisMonth: number;
    };
    content: {
        total: number;
        published: number;
        scheduled: number;
        draft: number;
    };
    campaigns: {
        total: number;
        active: number;
    };
    social: {
        connections: number;
        postsPublished: number;
        failedPosts: number;
    };
}

export interface AuditLogEntry {
    id: string;
    userId: string;
    userEmail: string;
    action: string;
    resource: string;
    resourceId?: string;
    details?: Record<string, unknown>;
    ipAddress?: string;
    timestamp: Date;
}

@Injectable()
export class AdminService {
    private readonly logger = new Logger(AdminService.name);
    private readonly startTime = Date.now();

    constructor(private readonly prisma: PrismaService) {}

    async getSystemHealth(): Promise<SystemHealth> {
        const dbStatus = await this.checkDatabaseHealth();
        const cacheStatus = this.checkCacheHealth();
        const queueStatus = this.checkQueueHealth();

        const memoryUsage = process.memoryUsage();
        const totalMemory = memoryUsage.heapTotal;
        const usedMemory = memoryUsage.heapUsed;

        const allHealthy =
            dbStatus.status === "up" &&
            cacheStatus.status === "up" &&
            queueStatus.status === "up";

        const anyDown =
            dbStatus.status === "down" ||
            cacheStatus.status === "down" ||
            queueStatus.status === "down";

        return {
            status: anyDown ? "unhealthy" : allHealthy ? "healthy" : "degraded",
            uptime: Date.now() - this.startTime,
            timestamp: new Date(),
            services: {
                database: dbStatus,
                cache: cacheStatus,
                queue: queueStatus,
            },
            memory: {
                used: Math.round(usedMemory / 1024 / 1024),
                total: Math.round(totalMemory / 1024 / 1024),
                percentage: Math.round((usedMemory / totalMemory) * 100),
            },
        };
    }

    private async checkDatabaseHealth(): Promise<ServiceStatus> {
        const start = Date.now();
        try {
            await this.prisma.$queryRaw`SELECT 1`;
            return {
                status: "up",
                latency: Date.now() - start,
                lastCheck: new Date(),
            };
        } catch (error) {
            this.logger.error("Database health check failed", error);
            return {
                status: "down",
                lastCheck: new Date(),
                error: error instanceof Error ? error.message : "Unknown error",
            };
        }
    }

    private checkCacheHealth(): ServiceStatus {
        // In production, this would check Redis connection
        return {
            status: process.env.REDIS_URL ? "up" : "degraded",
            lastCheck: new Date(),
            error: process.env.REDIS_URL ? undefined : "Redis not configured",
        };
    }

    private checkQueueHealth(): ServiceStatus {
        // In production, this would check BullMQ connection
        return {
            status: process.env.REDIS_URL ? "up" : "degraded",
            lastCheck: new Date(),
            error: process.env.REDIS_URL ? undefined : "Queue requires Redis",
        };
    }

    async getSystemStats(): Promise<SystemStats> {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        const [
            totalTenants,
            newTenants,
            totalUsers,
            newUsers,
            contentStats,
            campaignStats,
            socialStats,
        ] = await Promise.all([
            this.prisma.tenant.count(),
            this.prisma.tenant.count({
                where: { createdAt: { gte: startOfMonth } },
            }),
            this.prisma.user.count(),
            this.prisma.user.count({
                where: { createdAt: { gte: startOfMonth } },
            }),
            this.prisma.contentItem.groupBy({
                by: ["state"],
                _count: true,
            }),
            this.prisma.campaign.groupBy({
                by: ["status"],
                _count: true,
            }),
            this.prisma.postJob.groupBy({
                by: ["status"],
                _count: true,
            }),
        ]);

        const contentByState = Object.fromEntries(
            contentStats.map((s) => [s.state, s._count])
        );

        const campaignByStatus = Object.fromEntries(
            campaignStats.map((s) => [s.status, s._count])
        );

        const postsByStatus = Object.fromEntries(
            socialStats.map((s) => [s.status, s._count])
        );

        const connections = await this.prisma.socialConnection.count({
            where: { isActive: true },
        });

        return {
            tenants: {
                total: totalTenants,
                active: totalTenants, // Could be based on recent activity
                newThisMonth: newTenants,
            },
            users: {
                total: totalUsers,
                active: totalUsers, // Could be based on recent logins
                newThisMonth: newUsers,
            },
            content: {
                total: Object.values(contentByState).reduce((a, b) => a + b, 0),
                published: contentByState["PUBLISHED"] || 0,
                scheduled: contentByState["SCHEDULED"] || 0,
                draft: contentByState["DRAFT"] || 0,
            },
            campaigns: {
                total: Object.values(campaignByStatus).reduce((a, b) => a + b, 0),
                active: campaignByStatus["ACTIVE"] || 0,
            },
            social: {
                connections,
                postsPublished: postsByStatus["COMPLETED"] || 0,
                failedPosts: postsByStatus["FAILED"] || 0,
            },
        };
    }

    async getAllTenants(page: number = 1, limit: number = 20) {
        const skip = (page - 1) * limit;

        const [tenants, total] = await Promise.all([
            this.prisma.tenant.findMany({
                skip,
                take: limit,
                orderBy: { createdAt: "desc" },
                include: {
                    _count: {
                        select: {
                            users: true,
                            content: true,
                            campaigns: true,
                        },
                    },
                    subscription: {
                        select: {
                            status: true,
                            plan: true,
                        },
                    },
                },
            }),
            this.prisma.tenant.count(),
        ]);

        return {
            data: tenants.map((t: typeof tenants[number]) => ({
                id: t.id,
                name: t.name,
                slug: t.slug,
                createdAt: t.createdAt,
                userCount: t._count.users,
                contentCount: t._count.content,
                campaignCount: t._count.campaigns,
                subscription: t.subscription,
            })),
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit),
            },
        };
    }

    async getAllUsers(page: number = 1, limit: number = 20) {
        const skip = (page - 1) * limit;

        const [users, total] = await Promise.all([
            this.prisma.user.findMany({
                skip,
                take: limit,
                orderBy: { createdAt: "desc" },
                include: {
                    memberships: {
                        include: {
                            tenant: {
                                select: {
                                    id: true,
                                    name: true,
                                    slug: true,
                                },
                            },
                        },
                    },
                },
            }),
            this.prisma.user.count(),
        ]);

        return {
            data: users.map((u) => ({
                id: u.id,
                email: u.email,
                name: u.name,
                authProvider: u.authProvider,
                createdAt: u.createdAt,
                memberships: u.memberships.map((m) => ({
                    tenantId: m.tenantId,
                    tenantName: m.tenant.name,
                    role: m.role,
                })),
            })),
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit),
            },
        };
    }

    async getAuditLogs(
        page: number = 1,
        limit: number = 50,
        filters?: {
            userId?: string;
            action?: string;
            resource?: string;
            startDate?: Date;
            endDate?: Date;
        }
    ) {
        const skip = (page - 1) * limit;

        const where: Record<string, unknown> = {};
        if (filters?.userId) where.actorId = filters.userId;
        if (filters?.action) where.action = filters.action;
        if (filters?.resource) where.targetType = filters.resource;
        if (filters?.startDate || filters?.endDate) {
            where.createdAt = {};
            if (filters.startDate) (where.createdAt as Record<string, Date>).gte = filters.startDate;
            if (filters.endDate) (where.createdAt as Record<string, Date>).lte = filters.endDate;
        }

        const [logs, total] = await Promise.all([
            this.prisma.auditLog.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: "desc" },
            }),
            this.prisma.auditLog.count({ where }),
        ]);

        return {
            data: logs.map((log) => ({
                id: log.id,
                userId: log.actorId,
                userEmail: "Unknown", // Would need to join with User table
                action: log.action,
                resource: log.targetType,
                resourceId: log.targetId,
                details: log.meta as Record<string, unknown>,
                timestamp: log.createdAt,
            })),
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit),
            },
        };
    }

    async getUsageMetrics(tenantId?: string) {
        const where = tenantId ? { tenantId } : {};

        const [
            contentByPlatform,
            contentByMonth,
            topTenants,
        ] = await Promise.all([
            this.prisma.contentItem.groupBy({
                by: ["platform"],
                where,
                _count: true,
            }),
            this.prisma.$queryRaw<{ month: string; count: bigint }[]>`
                SELECT
                    TO_CHAR(DATE_TRUNC('month', "createdAt"), 'YYYY-MM') as month,
                    COUNT(*) as count
                FROM "ContentItem"
                ${tenantId ? this.prisma.$queryRaw`WHERE "tenantId" = ${tenantId}` : this.prisma.$queryRaw``}
                GROUP BY DATE_TRUNC('month', "createdAt")
                ORDER BY month DESC
                LIMIT 12
            `,
            this.prisma.tenant.findMany({
                take: 10,
                orderBy: {
                    content: {
                        _count: "desc",
                    },
                },
                select: {
                    id: true,
                    name: true,
                    _count: {
                        select: {
                            content: true,
                            users: true,
                        },
                    },
                },
            }),
        ]);

        return {
            contentByPlatform: contentByPlatform.map((p) => ({
                platform: p.platform,
                count: p._count,
            })),
            contentByMonth: contentByMonth.map((m) => ({
                month: m.month,
                count: Number(m.count),
            })),
            topTenants: topTenants.map((t) => ({
                id: t.id,
                name: t.name,
                contentCount: t._count.content,
                userCount: t._count.users,
            })),
        };
    }

    async suspendTenant(tenantId: string, reason: string, adminUserId: string) {
        this.logger.warn(`Suspending tenant ${tenantId}: ${reason}`);

        // In a real app, this would update a status field and disable access
        await this.prisma.auditLog.create({
            data: {
                actorId: adminUserId,
                action: "SUSPEND_TENANT",
                targetType: "Tenant",
                targetId: tenantId,
                meta: { reason },
            },
        });

        return { success: true, message: `Tenant ${tenantId} suspended` };
    }

    async unsuspendTenant(tenantId: string, adminUserId: string) {
        this.logger.log(`Unsuspending tenant ${tenantId}`);

        await this.prisma.auditLog.create({
            data: {
                actorId: adminUserId,
                action: "UNSUSPEND_TENANT",
                targetType: "Tenant",
                targetId: tenantId,
            },
        });

        return { success: true, message: `Tenant ${tenantId} unsuspended` };
    }

    async deleteUser(userId: string, adminUserId: string) {
        this.logger.warn(`Deleting user ${userId}`);

        await this.prisma.auditLog.create({
            data: {
                actorId: adminUserId,
                action: "DELETE_USER",
                targetType: "User",
                targetId: userId,
            },
        });

        await this.prisma.user.delete({
            where: { id: userId },
        });

        return { success: true, message: `User ${userId} deleted` };
    }

    async impersonateUser(userId: string, adminUserId: string) {
        this.logger.warn(`Admin ${adminUserId} impersonating user ${userId}`);

        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            include: {
                memberships: {
                    include: {
                        tenant: true,
                    },
                },
            },
        });

        if (!user) {
            throw new Error("User not found");
        }

        await this.prisma.auditLog.create({
            data: {
                actorId: adminUserId,
                action: "IMPERSONATE_USER",
                targetType: "User",
                targetId: userId,
            },
        });

        return {
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
            },
            memberships: user.memberships,
            impersonatedBy: adminUserId,
        };
    }
}
