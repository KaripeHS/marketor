import { Injectable, Logger } from "@nestjs/common";
import { Platform } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

export interface DateRange {
    start: Date;
    end: Date;
}

export interface OverviewMetrics {
    totalViews: number;
    totalLikes: number;
    totalComments: number;
    totalShares: number;
    totalSaves: number;
    totalEngagement: number;
    avgEngagementRate: number;
    postsPublished: number;
    followersGained: number;
}

export interface PlatformBreakdown {
    platform: Platform;
    views: number;
    likes: number;
    comments: number;
    shares: number;
    saves: number;
    engagementRate: number;
    postsCount: number;
}

export interface TimeSeriesPoint {
    date: string;
    views: number;
    engagement: number;
    posts: number;
}

export interface TopContent {
    contentId: string;
    platform: Platform;
    views: number;
    likes: number;
    comments: number;
    engagementRate: number;
    title?: string;
}

export interface AnalyticsDashboard {
    overview: OverviewMetrics;
    byPlatform: PlatformBreakdown[];
    timeSeries: TimeSeriesPoint[];
    topContent: TopContent[];
    period: DateRange;
}

@Injectable()
export class AnalyticsAggregationService {
    private readonly logger = new Logger(AnalyticsAggregationService.name);

    constructor(private readonly prisma: PrismaService) {}

    async getDashboard(tenantId: string, dateRange: DateRange): Promise<AnalyticsDashboard> {
        const [overview, byPlatform, timeSeries, topContent] = await Promise.all([
            this.getOverviewMetrics(tenantId, dateRange),
            this.getPlatformBreakdown(tenantId, dateRange),
            this.getTimeSeries(tenantId, dateRange),
            this.getTopContent(tenantId, dateRange, 10),
        ]);

        return {
            overview,
            byPlatform,
            timeSeries,
            topContent,
            period: dateRange,
        };
    }

    async getOverviewMetrics(tenantId: string, dateRange: DateRange): Promise<OverviewMetrics> {
        // Get aggregated metrics from ContentMetrics
        const metrics = await this.prisma.contentMetrics.aggregate({
            where: {
                tenantId,
                metricsDate: {
                    gte: dateRange.start,
                    lte: dateRange.end,
                },
            },
            _sum: {
                views: true,
                likes: true,
                comments: true,
                shares: true,
                saves: true,
                followsGained: true,
            },
            _avg: {
                engagementRate: true,
            },
        });

        // Count unique content items
        const postsCount = await this.prisma.contentMetrics.groupBy({
            by: ["contentId"],
            where: {
                tenantId,
                metricsDate: {
                    gte: dateRange.start,
                    lte: dateRange.end,
                },
            },
        });

        const totalViews = metrics._sum.views || 0;
        const totalLikes = metrics._sum.likes || 0;
        const totalComments = metrics._sum.comments || 0;
        const totalShares = metrics._sum.shares || 0;
        const totalSaves = metrics._sum.saves || 0;
        const totalEngagement = totalLikes + totalComments + totalShares + totalSaves;

        return {
            totalViews,
            totalLikes,
            totalComments,
            totalShares,
            totalSaves,
            totalEngagement,
            avgEngagementRate: metrics._avg.engagementRate || 0,
            postsPublished: postsCount.length,
            followersGained: metrics._sum.followsGained || 0,
        };
    }

    async getPlatformBreakdown(tenantId: string, dateRange: DateRange): Promise<PlatformBreakdown[]> {
        const platforms: Platform[] = ["TIKTOK", "INSTAGRAM", "YOUTUBE", "YOUTUBE_SHORT", "FACEBOOK"];
        const results: PlatformBreakdown[] = [];

        for (const platform of platforms) {
            const metrics = await this.prisma.contentMetrics.aggregate({
                where: {
                    tenantId,
                    platform,
                    metricsDate: {
                        gte: dateRange.start,
                        lte: dateRange.end,
                    },
                },
                _sum: {
                    views: true,
                    likes: true,
                    comments: true,
                    shares: true,
                    saves: true,
                },
                _avg: {
                    engagementRate: true,
                },
            });

            const postsCount = await this.prisma.contentMetrics.groupBy({
                by: ["contentId"],
                where: {
                    tenantId,
                    platform,
                    metricsDate: {
                        gte: dateRange.start,
                        lte: dateRange.end,
                    },
                },
            });

            // Only include platforms with data
            if (metrics._sum.views && metrics._sum.views > 0) {
                results.push({
                    platform,
                    views: metrics._sum.views || 0,
                    likes: metrics._sum.likes || 0,
                    comments: metrics._sum.comments || 0,
                    shares: metrics._sum.shares || 0,
                    saves: metrics._sum.saves || 0,
                    engagementRate: metrics._avg.engagementRate || 0,
                    postsCount: postsCount.length,
                });
            }
        }

        return results.sort((a, b) => b.views - a.views);
    }

    async getTimeSeries(tenantId: string, dateRange: DateRange): Promise<TimeSeriesPoint[]> {
        // Get daily aggregates
        const dailyData = await this.prisma.contentMetrics.groupBy({
            by: ["metricsDate"],
            where: {
                tenantId,
                metricsDate: {
                    gte: dateRange.start,
                    lte: dateRange.end,
                },
            },
            _sum: {
                views: true,
                likes: true,
                comments: true,
                shares: true,
                saves: true,
            },
            _count: {
                contentId: true,
            },
            orderBy: {
                metricsDate: "asc",
            },
        });

        return dailyData.map((day) => ({
            date: day.metricsDate.toISOString().split("T")[0],
            views: day._sum.views || 0,
            engagement:
                (day._sum.likes || 0) +
                (day._sum.comments || 0) +
                (day._sum.shares || 0) +
                (day._sum.saves || 0),
            posts: day._count.contentId,
        }));
    }

    async getTopContent(tenantId: string, dateRange: DateRange, limit: number = 10): Promise<TopContent[]> {
        // Get latest metrics for each content item
        const latestMetrics = await this.prisma.contentMetrics.findMany({
            where: {
                tenantId,
                metricsDate: {
                    gte: dateRange.start,
                    lte: dateRange.end,
                },
            },
            orderBy: [
                { contentId: "asc" },
                { metricsDate: "desc" },
            ],
            distinct: ["contentId"],
        });

        // Sort by views and get top N
        const sorted = latestMetrics
            .sort((a, b) => b.views - a.views)
            .slice(0, limit);

        // Get content titles
        const contentIds = sorted.map((m) => m.contentId);
        const contents = await this.prisma.contentItem.findMany({
            where: { id: { in: contentIds } },
            select: { id: true, title: true },
        });
        const titleMap = new Map(contents.map((c) => [c.id, c.title]));

        return sorted.map((m) => ({
            contentId: m.contentId,
            platform: m.platform,
            views: m.views,
            likes: m.likes,
            comments: m.comments,
            engagementRate: m.engagementRate || 0,
            title: titleMap.get(m.contentId) || undefined,
        }));
    }

    async updateDailyAnalytics(tenantId: string, date: Date): Promise<void> {
        const platforms: Platform[] = ["TIKTOK", "INSTAGRAM", "YOUTUBE", "YOUTUBE_SHORT", "FACEBOOK"];
        const dateOnly = new Date(date.toISOString().split("T")[0]);

        for (const platform of platforms) {
            const metrics = await this.prisma.contentMetrics.aggregate({
                where: {
                    tenantId,
                    platform,
                    metricsDate: {
                        gte: dateOnly,
                        lt: new Date(dateOnly.getTime() + 24 * 60 * 60 * 1000),
                    },
                },
                _sum: {
                    views: true,
                    likes: true,
                    comments: true,
                    shares: true,
                    saves: true,
                    followsGained: true,
                },
                _avg: {
                    engagementRate: true,
                    completionRate: true,
                },
            });

            const postsCount = await this.prisma.contentMetrics.groupBy({
                by: ["contentId"],
                where: {
                    tenantId,
                    platform,
                    metricsDate: {
                        gte: dateOnly,
                        lt: new Date(dateOnly.getTime() + 24 * 60 * 60 * 1000),
                    },
                },
            });

            // Find top post
            const topPost = await this.prisma.contentMetrics.findFirst({
                where: {
                    tenantId,
                    platform,
                    metricsDate: {
                        gte: dateOnly,
                        lt: new Date(dateOnly.getTime() + 24 * 60 * 60 * 1000),
                    },
                },
                orderBy: { views: "desc" },
            });

            // Skip if no data
            if (!metrics._sum.views) continue;

            await this.prisma.dailyAnalytics.upsert({
                where: {
                    tenantId_platform_date: {
                        tenantId,
                        platform,
                        date: dateOnly,
                    },
                },
                create: {
                    tenantId,
                    platform,
                    date: dateOnly,
                    totalViews: metrics._sum.views || 0,
                    totalLikes: metrics._sum.likes || 0,
                    totalComments: metrics._sum.comments || 0,
                    totalShares: metrics._sum.shares || 0,
                    totalSaves: metrics._sum.saves || 0,
                    avgEngagementRate: metrics._avg.engagementRate,
                    avgCompletionRate: metrics._avg.completionRate,
                    postsPublished: postsCount.length,
                    topPostId: topPost?.contentId,
                    followersGained: metrics._sum.followsGained || 0,
                },
                update: {
                    totalViews: metrics._sum.views || 0,
                    totalLikes: metrics._sum.likes || 0,
                    totalComments: metrics._sum.comments || 0,
                    totalShares: metrics._sum.shares || 0,
                    totalSaves: metrics._sum.saves || 0,
                    avgEngagementRate: metrics._avg.engagementRate,
                    avgCompletionRate: metrics._avg.completionRate,
                    postsPublished: postsCount.length,
                    topPostId: topPost?.contentId,
                    followersGained: metrics._sum.followsGained || 0,
                },
            });
        }

        this.logger.debug(`Updated daily analytics for ${tenantId} on ${dateOnly.toISOString()}`);
    }

    async getComparisonMetrics(
        tenantId: string,
        currentRange: DateRange,
        previousRange: DateRange
    ): Promise<{
        current: OverviewMetrics;
        previous: OverviewMetrics;
        changes: Record<string, number>;
    }> {
        const [current, previous] = await Promise.all([
            this.getOverviewMetrics(tenantId, currentRange),
            this.getOverviewMetrics(tenantId, previousRange),
        ]);

        const calculateChange = (curr: number, prev: number): number => {
            if (prev === 0) return curr > 0 ? 100 : 0;
            return ((curr - prev) / prev) * 100;
        };

        const changes = {
            views: calculateChange(current.totalViews, previous.totalViews),
            engagement: calculateChange(current.totalEngagement, previous.totalEngagement),
            engagementRate: calculateChange(current.avgEngagementRate, previous.avgEngagementRate),
            posts: calculateChange(current.postsPublished, previous.postsPublished),
            followers: calculateChange(current.followersGained, previous.followersGained),
        };

        return { current, previous, changes };
    }
}
