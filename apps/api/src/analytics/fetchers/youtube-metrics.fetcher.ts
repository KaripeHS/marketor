import { Injectable, Logger } from "@nestjs/common";
import { Platform } from "@prisma/client";
import { MetricsData } from "../metrics-ingestion.service";
import {
    PlatformMetricsFetcher,
    PlatformConnection,
    MetricsFetchResult,
} from "./metrics-fetcher.interface";

interface YouTubeVideoStatistics {
    viewCount: string;
    likeCount: string;
    commentCount: string;
    favoriteCount: string;
}

interface YouTubeVideoResponse {
    items: {
        id: string;
        statistics: YouTubeVideoStatistics;
    }[];
}

interface YouTubeAnalyticsResponse {
    rows?: (string | number)[][];
    columnHeaders?: { name: string; dataType: string }[];
}

interface YouTubeApiError {
    error?: {
        message?: string;
        code?: number;
    };
}

@Injectable()
export class YouTubeMetricsFetcher implements PlatformMetricsFetcher {
    private readonly logger = new Logger(YouTubeMetricsFetcher.name);
    readonly platform: Platform = Platform.YOUTUBE;

    async fetchMetrics(
        connection: PlatformConnection,
        contentId: string,
        platformPostId: string
    ): Promise<MetricsFetchResult> {
        try {
            // YouTube Data API v3 - Videos: list (statistics)
            // https://developers.google.com/youtube/v3/docs/videos/list
            const videoResponse = await fetch(
                `https://www.googleapis.com/youtube/v3/videos?part=statistics&id=${platformPostId}&key=${process.env.YOUTUBE_API_KEY}`,
                {
                    headers: {
                        Authorization: `Bearer ${connection.accessToken}`,
                    },
                }
            );

            if (!videoResponse.ok) {
                const errorData = await videoResponse.json().catch(() => ({})) as YouTubeApiError;
                this.logger.error(`YouTube Data API error: ${videoResponse.status}`, errorData);
                return {
                    success: false,
                    error: `YouTube API error: ${videoResponse.status} - ${errorData.error?.message || "Unknown error"}`,
                };
            }

            const videoData = await videoResponse.json() as YouTubeVideoResponse;
            const stats = videoData.items?.[0]?.statistics;

            if (!stats) {
                return {
                    success: false,
                    error: "No statistics found for YouTube video",
                };
            }

            // Try to get detailed analytics from YouTube Analytics API
            // This provides watch time, avg view duration, etc.
            let analyticsData: Record<string, number> = {};
            try {
                analyticsData = await this.fetchYouTubeAnalytics(connection, platformPostId);
            } catch (analyticsError) {
                this.logger.warn(`Could not fetch YouTube Analytics: ${analyticsError}`);
            }

            const metrics: MetricsData = {
                contentId,
                platform: this.platform,
                platformPostId,
                metricsDate: new Date(),
                views: parseInt(stats.viewCount) || 0,
                likes: parseInt(stats.likeCount) || 0,
                comments: parseInt(stats.commentCount) || 0,
                shares: analyticsData.shares || 0,
                saves: parseInt(stats.favoriteCount) || 0, // Favorites as saves
                watchTime: analyticsData.estimatedMinutesWatched || undefined,
                avgWatchTime: analyticsData.averageViewDuration || undefined,
                completionRate: analyticsData.averageViewPercentage || undefined,
                reach: parseInt(stats.viewCount) || 0, // YouTube doesn't have reach, use views
                impressions: analyticsData.impressions || 0,
                followsGained: analyticsData.subscribersGained || 0,
                profileVisits: 0, // YouTube doesn't provide channel visits per video
            };

            this.logger.debug(`Fetched YouTube metrics for ${platformPostId}: ${metrics.views} views`);

            return {
                success: true,
                metrics,
            };
        } catch (error) {
            this.logger.error(`Failed to fetch YouTube metrics: ${error}`);
            return {
                success: false,
                error: `Failed to fetch YouTube metrics: ${error instanceof Error ? error.message : "Unknown error"}`,
            };
        }
    }

    private async fetchYouTubeAnalytics(
        connection: PlatformConnection,
        videoId: string
    ): Promise<Record<string, number>> {
        // YouTube Analytics API - Get video-specific metrics
        // https://developers.google.com/youtube/analytics/reference/reports/query
        const endDate = new Date().toISOString().split("T")[0];
        const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

        const metrics = [
            "estimatedMinutesWatched",
            "averageViewDuration",
            "averageViewPercentage",
            "shares",
            "subscribersGained",
            "annotationClickThroughRate",
        ].join(",");

        const response = await fetch(
            `https://youtubeanalytics.googleapis.com/v2/reports?` +
            `ids=channel==MINE&` +
            `startDate=${startDate}&` +
            `endDate=${endDate}&` +
            `metrics=${metrics}&` +
            `filters=video==${videoId}`,
            {
                headers: {
                    Authorization: `Bearer ${connection.accessToken}`,
                },
            }
        );

        if (!response.ok) {
            throw new Error(`YouTube Analytics API error: ${response.status}`);
        }

        const data = await response.json() as YouTubeAnalyticsResponse;

        if (!data.rows || data.rows.length === 0 || !data.columnHeaders) {
            return {};
        }

        const result: Record<string, number> = {};
        const row = data.rows[0];
        data.columnHeaders.forEach((header, index) => {
            const value = row[index];
            if (typeof value === "number") {
                result[header.name] = value;
            }
        });

        return result;
    }
}

@Injectable()
export class YouTubeShortMetricsFetcher extends YouTubeMetricsFetcher {
    override readonly platform = Platform.YOUTUBE_SHORT;
}
