import { Injectable, Logger } from "@nestjs/common";
import { Platform } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

export interface MetricsData {
    contentId: string;
    platform: Platform;
    platformPostId?: string;
    metricsDate: Date;

    // Core metrics
    views?: number;
    likes?: number;
    comments?: number;
    shares?: number;
    saves?: number;

    // Video metrics
    watchTime?: number;
    avgWatchTime?: number;
    completionRate?: number;

    // Reach metrics
    reach?: number;
    impressions?: number;

    // Follower impact
    followsGained?: number;
    profileVisits?: number;
}

export interface PlatformMetricsResponse {
    success: boolean;
    metrics?: MetricsData;
    error?: string;
}

@Injectable()
export class MetricsIngestionService {
    private readonly logger = new Logger(MetricsIngestionService.name);

    constructor(private readonly prisma: PrismaService) {}

    async ingestMetrics(tenantId: string, data: MetricsData): Promise<void> {
        // Calculate engagement rate
        const totalEngagement = (data.likes || 0) + (data.comments || 0) + (data.shares || 0) + (data.saves || 0);
        const engagementRate = data.views && data.views > 0
            ? (totalEngagement / data.views) * 100
            : null;

        // Calculate click rate if we have impressions
        const clickRate = data.impressions && data.impressions > 0 && data.views
            ? (data.views / data.impressions) * 100
            : null;

        await this.prisma.contentMetrics.upsert({
            where: {
                contentId_platform_metricsDate: {
                    contentId: data.contentId,
                    platform: data.platform,
                    metricsDate: data.metricsDate,
                },
            },
            create: {
                tenantId,
                contentId: data.contentId,
                platform: data.platform,
                platformPostId: data.platformPostId,
                metricsDate: data.metricsDate,
                views: data.views || 0,
                likes: data.likes || 0,
                comments: data.comments || 0,
                shares: data.shares || 0,
                saves: data.saves || 0,
                engagementRate,
                clickRate,
                watchTime: data.watchTime,
                avgWatchTime: data.avgWatchTime,
                completionRate: data.completionRate,
                reach: data.reach,
                impressions: data.impressions,
                followsGained: data.followsGained,
                profileVisits: data.profileVisits,
            },
            update: {
                views: data.views || 0,
                likes: data.likes || 0,
                comments: data.comments || 0,
                shares: data.shares || 0,
                saves: data.saves || 0,
                engagementRate,
                clickRate,
                watchTime: data.watchTime,
                avgWatchTime: data.avgWatchTime,
                completionRate: data.completionRate,
                reach: data.reach,
                impressions: data.impressions,
                followsGained: data.followsGained,
                profileVisits: data.profileVisits,
                fetchedAt: new Date(),
            },
        });

        this.logger.debug(`Ingested metrics for content ${data.contentId} on ${data.platform}`);
    }

    async batchIngestMetrics(tenantId: string, metricsArray: MetricsData[]): Promise<{ success: number; failed: number }> {
        let success = 0;
        let failed = 0;

        for (const data of metricsArray) {
            try {
                await this.ingestMetrics(tenantId, data);
                success++;
            } catch (error) {
                this.logger.warn(`Failed to ingest metrics for ${data.contentId}:`, error);
                failed++;
            }
        }

        return { success, failed };
    }

    // Mock platform API fetchers - in production, these would call actual platform APIs
    async fetchMetricsFromPlatform(
        tenantId: string,
        contentId: string,
        platform: Platform,
        platformPostId: string
    ): Promise<PlatformMetricsResponse> {
        this.logger.debug(`Fetching metrics for ${platformPostId} from ${platform}`);

        // In production, this would call the actual platform API
        // For now, return mock data that simulates realistic metrics
        const mockMetrics = this.generateMockMetrics(contentId, platform, platformPostId);

        // Ingest the fetched metrics
        await this.ingestMetrics(tenantId, mockMetrics);

        return {
            success: true,
            metrics: mockMetrics,
        };
    }

    private generateMockMetrics(contentId: string, platform: Platform, platformPostId: string): MetricsData {
        // Generate realistic-looking mock metrics based on platform
        const baseViews = Math.floor(Math.random() * 10000) + 500;
        const engagementMultiplier = this.getPlatformEngagementMultiplier(platform);

        return {
            contentId,
            platform,
            platformPostId,
            metricsDate: new Date(),
            views: baseViews,
            likes: Math.floor(baseViews * engagementMultiplier * (0.03 + Math.random() * 0.07)),
            comments: Math.floor(baseViews * engagementMultiplier * (0.005 + Math.random() * 0.015)),
            shares: Math.floor(baseViews * engagementMultiplier * (0.002 + Math.random() * 0.008)),
            saves: Math.floor(baseViews * engagementMultiplier * (0.01 + Math.random() * 0.03)),
            watchTime: Math.floor(baseViews * (15 + Math.random() * 45)), // 15-60 seconds average
            avgWatchTime: 15 + Math.random() * 45,
            completionRate: 20 + Math.random() * 60, // 20-80%
            reach: Math.floor(baseViews * (0.7 + Math.random() * 0.3)),
            impressions: Math.floor(baseViews * (1.2 + Math.random() * 0.5)),
            followsGained: Math.floor(Math.random() * 50),
            profileVisits: Math.floor(baseViews * (0.01 + Math.random() * 0.03)),
        };
    }

    private getPlatformEngagementMultiplier(platform: Platform): number {
        const multipliers: Record<Platform, number> = {
            TIKTOK: 1.5,      // Higher engagement on TikTok
            INSTAGRAM: 1.2,   // Good engagement on Instagram
            YOUTUBE: 0.8,     // Lower engagement rate but higher watch time
            YOUTUBE_SHORT: 1.3, // Shorts have higher engagement
            FACEBOOK: 0.9,    // Moderate engagement
        };
        return multipliers[platform] || 1.0;
    }

    async getLatestMetrics(contentId: string): Promise<MetricsData | null> {
        const metrics = await this.prisma.contentMetrics.findFirst({
            where: { contentId },
            orderBy: { metricsDate: "desc" },
        });

        if (!metrics) return null;

        return {
            contentId: metrics.contentId,
            platform: metrics.platform,
            platformPostId: metrics.platformPostId || undefined,
            metricsDate: metrics.metricsDate,
            views: metrics.views,
            likes: metrics.likes,
            comments: metrics.comments,
            shares: metrics.shares,
            saves: metrics.saves,
            watchTime: metrics.watchTime || undefined,
            avgWatchTime: metrics.avgWatchTime || undefined,
            completionRate: metrics.completionRate || undefined,
            reach: metrics.reach || undefined,
            impressions: metrics.impressions || undefined,
            followsGained: metrics.followsGained || undefined,
            profileVisits: metrics.profileVisits || undefined,
        };
    }

    async getMetricsHistory(
        contentId: string,
        startDate: Date,
        endDate: Date
    ): Promise<MetricsData[]> {
        const metrics = await this.prisma.contentMetrics.findMany({
            where: {
                contentId,
                metricsDate: {
                    gte: startDate,
                    lte: endDate,
                },
            },
            orderBy: { metricsDate: "asc" },
        });

        return metrics.map((m) => ({
            contentId: m.contentId,
            platform: m.platform,
            platformPostId: m.platformPostId || undefined,
            metricsDate: m.metricsDate,
            views: m.views,
            likes: m.likes,
            comments: m.comments,
            shares: m.shares,
            saves: m.saves,
            watchTime: m.watchTime || undefined,
            avgWatchTime: m.avgWatchTime || undefined,
            completionRate: m.completionRate || undefined,
            reach: m.reach || undefined,
            impressions: m.impressions || undefined,
            followsGained: m.followsGained || undefined,
            profileVisits: m.profileVisits || undefined,
        }));
    }
}
