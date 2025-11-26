import { Injectable, Logger } from "@nestjs/common";
import { Platform } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { CryptoService } from "../../crypto/crypto.service";
import { MetricsData, MetricsIngestionService } from "../metrics-ingestion.service";
import {
    PlatformMetricsFetcher,
    PlatformConnection,
    MetricsFetchResult,
} from "./metrics-fetcher.interface";
import { TikTokMetricsFetcher } from "./tiktok-metrics.fetcher";
import { InstagramMetricsFetcher } from "./instagram-metrics.fetcher";
import { YouTubeMetricsFetcher, YouTubeShortMetricsFetcher } from "./youtube-metrics.fetcher";
import { FacebookMetricsFetcher } from "./facebook-metrics.fetcher";

@Injectable()
export class MetricsFetcherService {
    private readonly logger = new Logger(MetricsFetcherService.name);
    private readonly fetchers: Map<Platform, PlatformMetricsFetcher>;

    constructor(
        private readonly prisma: PrismaService,
        private readonly crypto: CryptoService,
        private readonly ingestion: MetricsIngestionService,
        tiktokFetcher: TikTokMetricsFetcher,
        instagramFetcher: InstagramMetricsFetcher,
        youtubeFetcher: YouTubeMetricsFetcher,
        youtubeShortFetcher: YouTubeShortMetricsFetcher,
        facebookFetcher: FacebookMetricsFetcher
    ) {
        this.fetchers = new Map<Platform, PlatformMetricsFetcher>();
        this.fetchers.set(Platform.TIKTOK, tiktokFetcher);
        this.fetchers.set(Platform.INSTAGRAM, instagramFetcher);
        this.fetchers.set(Platform.YOUTUBE, youtubeFetcher);
        this.fetchers.set(Platform.YOUTUBE_SHORT, youtubeShortFetcher);
        this.fetchers.set(Platform.FACEBOOK, facebookFetcher);
    }

    getSupportedPlatforms(): Platform[] {
        return Array.from(this.fetchers.keys());
    }

    isSupported(platform: Platform): boolean {
        return this.fetchers.has(platform);
    }

    getFetcher(platform: Platform): PlatformMetricsFetcher | undefined {
        return this.fetchers.get(platform);
    }

    async fetchAndIngestMetrics(
        tenantId: string,
        contentId: string,
        platform: Platform,
        platformPostId: string
    ): Promise<MetricsFetchResult> {
        const fetcher = this.fetchers.get(platform);

        if (!fetcher) {
            return {
                success: false,
                error: `No metrics fetcher available for platform: ${platform}`,
            };
        }

        // Get platform connection for the tenant
        const connection = await this.getConnection(tenantId, platform);

        if (!connection) {
            this.logger.warn(`No connected account found for ${platform} on tenant ${tenantId}`);
            return {
                success: false,
                error: `No connected ${platform} account found. Please connect your account first.`,
            };
        }

        // Fetch metrics from platform
        const result = await fetcher.fetchMetrics(connection, contentId, platformPostId);

        // If successful, ingest the metrics
        if (result.success && result.metrics) {
            await this.ingestion.ingestMetrics(tenantId, result.metrics);
            this.logger.log(`Ingested metrics for ${platform} post ${platformPostId}`);
        }

        return result;
    }

    async fetchAllPublishedContent(tenantId: string): Promise<{
        total: number;
        success: number;
        failed: number;
        results: { contentId: string; platform: Platform; success: boolean; error?: string }[];
    }> {
        // Get all completed post jobs that have publish results with platformPostId
        const completedJobs = await this.prisma.postJob.findMany({
            where: {
                tenantId,
                status: "COMPLETED",
                publishResult: {
                    isNot: null,
                },
            },
            include: {
                publishResult: true,
            },
        });

        const results: { contentId: string; platform: Platform; success: boolean; error?: string }[] = [];
        let successCount = 0;
        let failedCount = 0;

        for (const job of completedJobs) {
            const publishResult = job.publishResult;
            if (!publishResult?.platformPostId) continue;

            const result = await this.fetchAndIngestMetrics(
                tenantId,
                job.contentId,
                publishResult.platform,
                publishResult.platformPostId
            );

            results.push({
                contentId: job.contentId,
                platform: publishResult.platform,
                success: result.success,
                error: result.error,
            });

            if (result.success) {
                successCount++;
            } else {
                failedCount++;
            }
        }

        return {
            total: results.length,
            success: successCount,
            failed: failedCount,
            results,
        };
    }

    async fetchMetricsForContent(
        tenantId: string,
        contentId: string
    ): Promise<{
        success: number;
        failed: number;
        results: { platform: Platform; success: boolean; error?: string; metrics?: MetricsData }[];
    }> {
        // Get publish results for this content via PostJob
        const postJobs = await this.prisma.postJob.findMany({
            where: {
                contentId,
                tenantId,
                status: "COMPLETED",
            },
            include: {
                publishResult: true,
            },
        });

        const results: { platform: Platform; success: boolean; error?: string; metrics?: MetricsData }[] = [];
        let successCount = 0;
        let failedCount = 0;

        for (const job of postJobs) {
            const publishResult = job.publishResult;
            if (!publishResult?.platformPostId) continue;

            const result = await this.fetchAndIngestMetrics(
                tenantId,
                contentId,
                publishResult.platform,
                publishResult.platformPostId
            );

            results.push({
                platform: publishResult.platform,
                success: result.success,
                error: result.error,
                metrics: result.metrics,
            });

            if (result.success) {
                successCount++;
            } else {
                failedCount++;
            }
        }

        return {
            success: successCount,
            failed: failedCount,
            results,
        };
    }

    private async getConnection(
        tenantId: string,
        platform: Platform
    ): Promise<PlatformConnection | null> {
        // Use SocialConnection model (not socialAccount)
        const socialConnection = await this.prisma.socialConnection.findFirst({
            where: {
                tenantId,
                platform,
                isActive: true,
            },
        });

        if (!socialConnection) {
            return null;
        }

        // Decrypt the access token
        const accessToken = this.crypto.decrypt(socialConnection.accessToken);
        const refreshToken = socialConnection.refreshToken
            ? this.crypto.decrypt(socialConnection.refreshToken)
            : null;

        return {
            accessToken,
            refreshToken,
            accountId: socialConnection.accountId,
        };
    }
}
