import { Injectable, Logger } from "@nestjs/common";
import { Platform } from "@prisma/client";
import { MetricsData } from "../metrics-ingestion.service";
import {
    PlatformMetricsFetcher,
    PlatformConnection,
    MetricsFetchResult,
} from "./metrics-fetcher.interface";

interface TikTokVideoInsight {
    id: string;
    create_time: number;
    video_views: number;
    likes: number;
    comments: number;
    shares: number;
    average_time_watched: number;
    total_time_watched: number;
    impression_sources: {
        for_you_page: number;
        following_page: number;
        sound_page: number;
        search: number;
        profile: number;
    };
    reach: number;
    profile_views: number;
    full_video_watched_rate: number;
}

interface TikTokApiError {
    error?: {
        code?: string;
        message?: string;
    };
}

interface TikTokInsightsResponse extends TikTokApiError {
    data?: {
        videos?: TikTokVideoInsight[];
    };
}

@Injectable()
export class TikTokMetricsFetcher implements PlatformMetricsFetcher {
    private readonly logger = new Logger(TikTokMetricsFetcher.name);
    readonly platform = Platform.TIKTOK;

    async fetchMetrics(
        connection: PlatformConnection,
        contentId: string,
        platformPostId: string
    ): Promise<MetricsFetchResult> {
        try {
            // TikTok Content Posting API - Video Insights
            // https://developers.tiktok.com/doc/content-posting-api-reference-get-video-insights
            const fields = [
                "video_views",
                "likes",
                "comments",
                "shares",
                "average_time_watched",
                "total_time_watched",
                "reach",
                "profile_views",
                "full_video_watched_rate",
            ].join(",");

            const response = await fetch(
                `https://open.tiktokapis.com/v2/video/query/insights/?video_ids=${platformPostId}&fields=${fields}`,
                {
                    method: "GET",
                    headers: {
                        Authorization: `Bearer ${connection.accessToken}`,
                        "Content-Type": "application/json",
                    },
                }
            );

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({})) as TikTokApiError;
                this.logger.error(`TikTok API error: ${response.status}`, errorData);
                return {
                    success: false,
                    error: `TikTok API error: ${response.status} - ${errorData.error?.message || "Unknown error"}`,
                };
            }

            const data = await response.json() as TikTokInsightsResponse;

            if (data.error?.code !== "ok") {
                return {
                    success: false,
                    error: `TikTok API returned error: ${data.error?.message || "Unknown error"}`,
                };
            }

            const videoInsights = data.data?.videos?.[0];

            if (!videoInsights) {
                return {
                    success: false,
                    error: "No insights data returned from TikTok",
                };
            }

            const metrics: MetricsData = {
                contentId,
                platform: Platform.TIKTOK,
                platformPostId,
                metricsDate: new Date(),
                views: videoInsights.video_views || 0,
                likes: videoInsights.likes || 0,
                comments: videoInsights.comments || 0,
                shares: videoInsights.shares || 0,
                saves: 0, // TikTok doesn't expose saves directly
                watchTime: videoInsights.total_time_watched || 0,
                avgWatchTime: videoInsights.average_time_watched || 0,
                completionRate: (videoInsights.full_video_watched_rate || 0) * 100,
                reach: videoInsights.reach || 0,
                impressions: videoInsights.video_views || 0, // TikTok uses views as impressions
                followsGained: 0, // Would need separate follower API call
                profileVisits: videoInsights.profile_views || 0,
            };

            this.logger.debug(`Fetched TikTok metrics for ${platformPostId}: ${metrics.views} views`);

            return {
                success: true,
                metrics,
            };
        } catch (error) {
            this.logger.error(`Failed to fetch TikTok metrics: ${error}`);
            return {
                success: false,
                error: `Failed to fetch TikTok metrics: ${error instanceof Error ? error.message : "Unknown error"}`,
            };
        }
    }
}
