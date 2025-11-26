import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NotificationChannel, NotificationType, PostJobStatus, Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { EmailService } from "./email.service";
import { NotificationTemplatesService } from "./templates.service";

export interface DigestStats {
    totalViews: number;
    totalEngagement: number;
    postsPublished: number;
    engagementRate: number;
    topPost: {
        title: string;
        views: number;
        engagement: number;
    } | null;
}

interface UserDigestData {
    userId: string;
    email: string;
    name: string | null;
    tenantId: string;
    stats: DigestStats;
}

@Injectable()
export class DigestService implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(DigestService.name);
    private readonly appUrl: string;
    private digestInterval: NodeJS.Timeout | null = null;

    constructor(
        private readonly prisma: PrismaService,
        private readonly email: EmailService,
        private readonly templates: NotificationTemplatesService,
        private readonly config: ConfigService
    ) {
        this.appUrl = this.config.get<string>("APP_URL") || "http://localhost:3000";
    }

    onModuleInit() {
        // Schedule weekly digest for Sunday at 9am UTC
        this.scheduleWeeklyDigest();
        this.logger.log("Digest service initialized");
    }

    onModuleDestroy() {
        if (this.digestInterval) {
            clearInterval(this.digestInterval);
        }
    }

    private scheduleWeeklyDigest() {
        // Check every hour if it's time to send digests
        this.digestInterval = setInterval(
            () => this.checkAndSendDigest(),
            3600000 // 1 hour
        );

        // Initial check
        this.checkAndSendDigest();
    }

    private async checkAndSendDigest() {
        const now = new Date();
        // Send on Sunday (0) between 9-10 AM UTC
        if (now.getUTCDay() === 0 && now.getUTCHours() === 9) {
            await this.sendWeeklyDigests();
        }
    }

    async sendWeeklyDigests(): Promise<{ sent: number; failed: number }> {
        this.logger.log("Starting weekly digest emails");

        // Find users with weekly digest enabled
        const eligibleUsers = await this.getEligibleUsers();
        this.logger.log(`Found ${eligibleUsers.length} users eligible for weekly digest`);

        let sent = 0;
        let failed = 0;

        for (const userData of eligibleUsers) {
            try {
                await this.sendDigestEmail(userData);
                sent++;
            } catch (error) {
                this.logger.error(`Failed to send digest to ${userData.email}:`, error);
                failed++;
            }
        }

        this.logger.log(`Weekly digest complete: ${sent} sent, ${failed} failed`);
        return { sent, failed };
    }

    private async getEligibleUsers(): Promise<UserDigestData[]> {
        // Get users with at least one active tenant membership
        const usersWithMemberships = await this.prisma.user.findMany({
            where: {
                memberships: {
                    some: {},
                },
            },
            include: {
                memberships: {
                    take: 1,
                },
            },
        });

        const result: UserDigestData[] = [];

        for (const user of usersWithMemberships) {
            // Check if user has digest disabled
            const hasDisabled = await this.prisma.notificationPreference.findFirst({
                where: {
                    userId: user.id,
                    weeklyDigest: false,
                },
            });

            if (hasDisabled) continue;

            const tenantId = user.memberships[0]?.tenantId;
            if (!tenantId || !user.email) continue;

            // Gather stats for this user's tenant
            const stats = await this.gatherDigestStats(tenantId);

            result.push({
                userId: user.id,
                email: user.email,
                name: user.name,
                tenantId,
                stats,
            });
        }

        return result;
    }

    private async gatherDigestStats(tenantId: string): Promise<DigestStats> {
        const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

        // Get metrics from the past week
        const metrics = await this.prisma.contentMetrics.findMany({
            where: {
                tenantId,
                metricsDate: { gte: oneWeekAgo },
            },
        });

        // Get content items for titles
        const contentIds = [...new Set(metrics.map((m) => m.contentId))];
        const contentItems = await this.prisma.contentItem.findMany({
            where: { id: { in: contentIds } },
            select: { id: true, title: true },
        });
        const contentMap = new Map(contentItems.map((c) => [c.id, c.title]));

        // Aggregate metrics
        let totalViews = 0;
        let totalEngagement = 0;
        const contentStats: Map<string, { title: string; views: number; engagement: number }> = new Map();

        for (const metric of metrics) {
            const views = metric.views || 0;
            const engagement = (metric.likes || 0) + (metric.comments || 0) + (metric.shares || 0);

            totalViews += views;
            totalEngagement += engagement;

            const existing = contentStats.get(metric.contentId);
            if (existing) {
                existing.views += views;
                existing.engagement += engagement;
            } else {
                contentStats.set(metric.contentId, {
                    title: contentMap.get(metric.contentId) || "Untitled",
                    views,
                    engagement,
                });
            }
        }

        // Find top post
        let topPost: DigestStats["topPost"] = null;
        let maxEngagement = 0;
        for (const stats of contentStats.values()) {
            if (stats.engagement > maxEngagement) {
                maxEngagement = stats.engagement;
                topPost = stats;
            }
        }

        // Count posts published this week
        const postsPublished = await this.prisma.postJob.count({
            where: {
                tenantId,
                status: PostJobStatus.COMPLETED,
                updatedAt: { gte: oneWeekAgo },
            },
        });

        // Calculate engagement rate
        const engagementRate = totalViews > 0
            ? Math.round((totalEngagement / totalViews) * 10000) / 100
            : 0;

        return {
            totalViews,
            totalEngagement,
            postsPublished,
            engagementRate,
            topPost,
        };
    }

    private async sendDigestEmail(userData: UserDigestData): Promise<void> {
        const rendered = await this.templates.renderTemplate(
            NotificationType.WEEKLY_DIGEST,
            NotificationChannel.EMAIL,
            {
                recipientName: userData.name || "there",
                totalViews: userData.stats.totalViews.toLocaleString(),
                totalEngagement: userData.stats.totalEngagement.toLocaleString(),
                postsPublished: userData.stats.postsPublished,
                engagementRate: userData.stats.engagementRate.toFixed(2),
                topPost: userData.stats.topPost,
                appUrl: this.appUrl,
            }
        );

        if (!rendered || !rendered.subject) {
            this.logger.warn("No template found for weekly digest");
            return;
        }

        // Create notification record
        const notification = await this.prisma.notification.create({
            data: {
                userId: userData.userId,
                tenantId: userData.tenantId,
                type: NotificationType.WEEKLY_DIGEST,
                channel: NotificationChannel.EMAIL,
                title: rendered.subject,
                body: rendered.body,
                payload: {
                    totalViews: userData.stats.totalViews,
                    totalEngagement: userData.stats.totalEngagement,
                    postsPublished: userData.stats.postsPublished,
                    engagementRate: userData.stats.engagementRate,
                    topPost: userData.stats.topPost,
                    weekEnding: new Date().toISOString(),
                } as Prisma.InputJsonValue,
            },
        });

        // Send email
        const result = await this.email.send({
            to: userData.email,
            subject: rendered.subject,
            html: this.wrapEmailHtml(rendered.body),
        });

        // Update notification status
        if (result.success) {
            await this.prisma.notification.update({
                where: { id: notification.id },
                data: { sentAt: new Date(), deliveredAt: new Date() },
            });
            this.logger.debug(`Weekly digest sent to ${userData.email}`);
        } else {
            await this.prisma.notification.update({
                where: { id: notification.id },
                data: { failedAt: new Date(), error: result.error },
            });
            throw new Error(result.error);
        }
    }

    private wrapEmailHtml(body: string): string {
        return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        a { color: #4F46E5; }
        h2 { color: #1f2937; margin-top: 0; }
        h3 { color: #374151; }
        table { width: 100%; }
        td { padding: 8px 0; }
    </style>
</head>
<body>
    ${body}
    <hr style="margin: 32px 0; border: none; border-top: 1px solid #e5e7eb;">
    <p style="color: #9ca3af; font-size: 12px;">
        This email was sent by GrowthPilot.
        <a href="${this.appUrl}/settings/notifications">Manage notification preferences</a>
    </p>
</body>
</html>
`;
    }

    // Manual trigger for testing or admin use
    async sendDigestForTenant(tenantId: string): Promise<{ sent: number; failed: number }> {
        this.logger.log(`Manually sending digest for tenant ${tenantId}`);

        const users = await this.prisma.user.findMany({
            where: {
                memberships: {
                    some: {
                        tenantId,
                    },
                },
            },
            select: {
                id: true,
                email: true,
                name: true,
            },
        });

        const stats = await this.gatherDigestStats(tenantId);

        let sent = 0;
        let failed = 0;

        for (const user of users) {
            if (!user.email) continue;

            try {
                await this.sendDigestEmail({
                    userId: user.id,
                    email: user.email,
                    name: user.name,
                    tenantId,
                    stats,
                });
                sent++;
            } catch (error) {
                this.logger.error(`Failed to send digest to ${user.email}:`, error);
                failed++;
            }
        }

        return { sent, failed };
    }

    // Get preview of digest stats
    async getDigestPreview(tenantId: string): Promise<DigestStats> {
        return this.gatherDigestStats(tenantId);
    }
}
