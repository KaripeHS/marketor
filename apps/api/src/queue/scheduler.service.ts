import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { QueueService } from "./queue.service";
import { NotificationType, PostJobStatus } from "@prisma/client";

@Injectable()
export class SchedulerService implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(SchedulerService.name);
    private schedulerInterval: NodeJS.Timeout | null = null;
    private cleanupInterval: NodeJS.Timeout | null = null;
    private tokenRefreshInterval: NodeJS.Timeout | null = null;

    constructor(
        private readonly prisma: PrismaService,
        private readonly queueService: QueueService
    ) {}

    onModuleInit() {
        if (!this.queueService.isQueueEnabled()) {
            this.logger.warn("Queue not enabled - scheduler disabled");
            return;
        }

        // Check for due jobs every minute
        this.schedulerInterval = setInterval(
            () => this.scheduleUpcomingJobs(),
            60000
        );

        // Run cleanup daily
        this.cleanupInterval = setInterval(
            () => this.cleanupOldJobs(),
            86400000
        );

        // Check token expiry every hour
        this.tokenRefreshInterval = setInterval(
            () => this.checkTokenExpiry(),
            3600000
        );

        // Initial run
        this.scheduleUpcomingJobs();
        this.checkTokenExpiry();

        this.logger.log("Scheduler service initialized");
    }

    onModuleDestroy() {
        if (this.schedulerInterval) {
            clearInterval(this.schedulerInterval);
        }
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
        }
        if (this.tokenRefreshInterval) {
            clearInterval(this.tokenRefreshInterval);
        }
    }

    async scheduleUpcomingJobs() {
        try {
            // Find pending jobs that are due in the next 5 minutes
            const fiveMinutesFromNow = new Date(Date.now() + 5 * 60 * 1000);

            const pendingJobs = await this.prisma.postJob.findMany({
                where: {
                    status: PostJobStatus.PENDING,
                    scheduledFor: {
                        lte: fiveMinutesFromNow,
                    },
                },
                take: 100,
            });

            if (pendingJobs.length === 0) {
                return;
            }

            this.logger.log(`Found ${pendingJobs.length} jobs to schedule`);

            for (const job of pendingJobs) {
                // Find active connection for this platform
                const connection = await this.prisma.socialConnection.findFirst({
                    where: {
                        tenantId: job.tenantId,
                        platform: job.platform,
                        isActive: true,
                    },
                });

                if (!connection) {
                    this.logger.warn(`No active connection for job ${job.id} on ${job.platform}`);
                    await this.prisma.postJob.update({
                        where: { id: job.id },
                        data: {
                            status: PostJobStatus.FAILED,
                            lastError: `No active ${job.platform} connection`,
                        },
                    });
                    continue;
                }

                // Add to BullMQ queue
                await this.queueService.addPostJob({
                    jobId: job.id,
                    contentId: job.contentId,
                    tenantId: job.tenantId,
                    platform: job.platform,
                    scheduledFor: job.scheduledFor,
                    connectionId: connection.id,
                });
            }
        } catch (error) {
            this.logger.error("Error scheduling jobs:", error);
        }
    }

    async cleanupOldJobs() {
        try {
            // Delete completed jobs older than 30 days
            const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

            const result = await this.prisma.postJob.deleteMany({
                where: {
                    status: PostJobStatus.COMPLETED,
                    updatedAt: { lt: thirtyDaysAgo },
                },
            });

            if (result.count > 0) {
                this.logger.log(`Cleaned up ${result.count} old completed jobs`);
            }

            // Delete cancelled jobs older than 7 days
            const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

            const cancelledResult = await this.prisma.postJob.deleteMany({
                where: {
                    status: PostJobStatus.CANCELLED,
                    updatedAt: { lt: sevenDaysAgo },
                },
            });

            if (cancelledResult.count > 0) {
                this.logger.log(`Cleaned up ${cancelledResult.count} old cancelled jobs`);
            }
        } catch (error) {
            this.logger.error("Error cleaning up old jobs:", error);
        }
    }

    async checkTokenExpiry() {
        try {
            // Find connections expiring in the next 24 hours
            const oneDayFromNow = new Date(Date.now() + 24 * 60 * 60 * 1000);

            const expiringConnections = await this.prisma.socialConnection.findMany({
                where: {
                    isActive: true,
                    tokenExpiry: {
                        lte: oneDayFromNow,
                        gt: new Date(),
                    },
                },
                include: {
                    tenant: true,
                },
            });

            if (expiringConnections.length > 0) {
                this.logger.warn(`Found ${expiringConnections.length} connections with expiring tokens`);

                // Create notifications for each tenant admin
                for (const connection of expiringConnections) {
                    // Find an admin user for this tenant
                    const adminMembership = await this.prisma.userTenantRole.findFirst({
                        where: {
                            tenantId: connection.tenantId,
                            role: "ADMIN",
                        },
                    });

                    if (adminMembership) {
                        await this.prisma.notification.create({
                            data: {
                                userId: adminMembership.userId,
                                tenantId: connection.tenantId,
                                type: NotificationType.TOKEN_EXPIRY_WARNING,
                                channel: "IN_APP",
                                title: "Social Connection Token Expiring",
                                body: `Your ${connection.platform} connection "${connection.accountName || connection.accountId}" token expires soon. Please reconnect to avoid publishing interruptions.`,
                                payload: {
                                    connectionId: connection.id,
                                    platform: connection.platform,
                                    expiresAt: connection.tokenExpiry?.toISOString(),
                                },
                            },
                        });
                    }
                }
            }

            // Find already expired connections
            const expiredConnections = await this.prisma.socialConnection.findMany({
                where: {
                    isActive: true,
                    tokenExpiry: { lt: new Date() },
                },
            });

            if (expiredConnections.length > 0) {
                this.logger.warn(`Found ${expiredConnections.length} connections with expired tokens`);

                // Mark them as inactive and notify admins
                for (const connection of expiredConnections) {
                    await this.prisma.socialConnection.update({
                        where: { id: connection.id },
                        data: { isActive: false },
                    });

                    // Find an admin user for this tenant
                    const adminMembership = await this.prisma.userTenantRole.findFirst({
                        where: {
                            tenantId: connection.tenantId,
                            role: "ADMIN",
                        },
                    });

                    if (adminMembership) {
                        await this.prisma.notification.create({
                            data: {
                                userId: adminMembership.userId,
                                tenantId: connection.tenantId,
                                type: NotificationType.TOKEN_EXPIRED,
                                channel: "IN_APP",
                                title: "Social Connection Disconnected",
                                body: `Your ${connection.platform} connection "${connection.accountName || connection.accountId}" has been disconnected due to expired credentials. Please reconnect to resume publishing.`,
                                payload: {
                                    connectionId: connection.id,
                                    platform: connection.platform,
                                },
                            },
                        });
                    }
                }
            }
        } catch (error) {
            this.logger.error("Error checking token expiry:", error);
        }
    }

    async getSchedulerStats() {
        const [pendingJobs, processingJobs, completedToday, failedToday] = await Promise.all([
            this.prisma.postJob.count({ where: { status: PostJobStatus.PENDING } }),
            this.prisma.postJob.count({ where: { status: PostJobStatus.PROCESSING } }),
            this.prisma.postJob.count({
                where: {
                    status: PostJobStatus.COMPLETED,
                    updatedAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
                },
            }),
            this.prisma.postJob.count({
                where: {
                    status: PostJobStatus.FAILED,
                    updatedAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
                },
            }),
        ]);

        const queueStats = await this.queueService.getQueueStats();

        return {
            database: {
                pendingJobs,
                processingJobs,
                completedToday,
                failedToday,
            },
            queue: queueStats,
            isEnabled: this.queueService.isQueueEnabled(),
        };
    }
}
