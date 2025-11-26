import { Injectable, Logger } from "@nestjs/common";
import { Platform } from "@prisma/client";
import { MetricsData } from "../metrics-ingestion.service";
import {
    PlatformMetricsFetcher,
    PlatformConnection,
    MetricsFetchResult,
} from "./metrics-fetcher.interface";

interface InstagramMediaInsights {
    data: {
        name: string;
        period: string;
        values: { value: number }[];
        title: string;
        description: string;
        id: string;
    }[];
}

interface InstagramMediaFields {
    id: string;
    media_type: string;
    timestamp: string;
    like_count?: number;
    comments_count?: number;
}

interface InstagramApiError {
    error?: {
        message?: string;
        code?: number;
    };
}

@Injectable()
export class InstagramMetricsFetcher implements PlatformMetricsFetcher {
    private readonly logger = new Logger(InstagramMetricsFetcher.name);
    readonly platform = Platform.INSTAGRAM;

    async fetchMetrics(
        connection: PlatformConnection,
        contentId: string,
        platformPostId: string
    ): Promise<MetricsFetchResult> {
        try {
            // First, get basic media fields (likes, comments)
            const mediaResponse = await fetch(
                `https://graph.facebook.com/v18.0/${platformPostId}?fields=id,media_type,timestamp,like_count,comments_count&access_token=${connection.accessToken}`
            );

            if (!mediaResponse.ok) {
                const errorData = await mediaResponse.json().catch(() => ({})) as InstagramApiError;
                this.logger.error(`Instagram media API error: ${mediaResponse.status}`, errorData);
                return {
                    success: false,
                    error: `Instagram API error: ${mediaResponse.status} - ${errorData.error?.message || "Unknown error"}`,
                };
            }

            const mediaData = await mediaResponse.json() as InstagramMediaFields;

            // Get insights based on media type
            // VIDEO/REEL metrics: reach, plays, saved, shares, total_interactions
            // IMAGE/CAROUSEL metrics: reach, impressions, saved, shares, total_interactions
            const isVideo = mediaData.media_type === "VIDEO" || mediaData.media_type === "REELS";
            const insightMetrics = isVideo
                ? "reach,plays,saved,shares,total_interactions,video_views"
                : "reach,impressions,saved,shares,total_interactions";

            const insightsResponse = await fetch(
                `https://graph.facebook.com/v18.0/${platformPostId}/insights?metric=${insightMetrics}&access_token=${connection.accessToken}`
            );

            let insights: Record<string, number> = {};

            if (insightsResponse.ok) {
                const insightsData = await insightsResponse.json() as InstagramMediaInsights;
                // Parse insights into a simple object
                for (const metric of insightsData.data || []) {
                    if (metric.values && metric.values.length > 0) {
                        insights[metric.name] = metric.values[0].value;
                    }
                }
            } else {
                this.logger.warn(`Instagram insights API error, using basic metrics only`);
            }

            const metrics: MetricsData = {
                contentId,
                platform: Platform.INSTAGRAM,
                platformPostId,
                metricsDate: new Date(),
                views: insights.plays || insights.impressions || 0,
                likes: mediaData.like_count || 0,
                comments: mediaData.comments_count || 0,
                shares: insights.shares || 0,
                saves: insights.saved || 0,
                watchTime: undefined, // Instagram doesn't provide watch time
                avgWatchTime: undefined,
                completionRate: undefined,
                reach: insights.reach || 0,
                impressions: insights.impressions || insights.plays || 0,
                followsGained: 0, // Would need account insights API
                profileVisits: 0, // Would need account insights API
            };

            this.logger.debug(`Fetched Instagram metrics for ${platformPostId}: ${metrics.views} views, ${metrics.likes} likes`);

            return {
                success: true,
                metrics,
            };
        } catch (error) {
            this.logger.error(`Failed to fetch Instagram metrics: ${error}`);
            return {
                success: false,
                error: `Failed to fetch Instagram metrics: ${error instanceof Error ? error.message : "Unknown error"}`,
            };
        }
    }
}
