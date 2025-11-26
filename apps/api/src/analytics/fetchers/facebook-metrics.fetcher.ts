import { Injectable, Logger } from "@nestjs/common";
import { Platform } from "@prisma/client";
import { MetricsData } from "../metrics-ingestion.service";
import {
    PlatformMetricsFetcher,
    PlatformConnection,
    MetricsFetchResult,
} from "./metrics-fetcher.interface";

interface FacebookPostInsight {
    name: string;
    period: string;
    values: { value: number | Record<string, number> }[];
    title: string;
    id: string;
}

interface FacebookPostFields {
    id: string;
    created_time: string;
    shares?: { count: number };
    reactions?: { summary: { total_count: number } };
    comments?: { summary: { total_count: number } };
}

interface FacebookInsightsResponse {
    data: FacebookPostInsight[];
}

interface FacebookApiError {
    error?: {
        message?: string;
        code?: number;
    };
}

@Injectable()
export class FacebookMetricsFetcher implements PlatformMetricsFetcher {
    private readonly logger = new Logger(FacebookMetricsFetcher.name);
    readonly platform = Platform.FACEBOOK;

    async fetchMetrics(
        connection: PlatformConnection,
        contentId: string,
        platformPostId: string
    ): Promise<MetricsFetchResult> {
        try {
            // Facebook Graph API - Get post fields
            // https://developers.facebook.com/docs/graph-api/reference/page-post
            const fieldsResponse = await fetch(
                `https://graph.facebook.com/v18.0/${platformPostId}?` +
                `fields=id,created_time,shares,reactions.summary(true),comments.summary(true)&` +
                `access_token=${connection.accessToken}`
            );

            if (!fieldsResponse.ok) {
                const errorData = await fieldsResponse.json().catch(() => ({})) as FacebookApiError;
                this.logger.error(`Facebook post API error: ${fieldsResponse.status}`, errorData);
                return {
                    success: false,
                    error: `Facebook API error: ${fieldsResponse.status} - ${errorData.error?.message || "Unknown error"}`,
                };
            }

            const postData = await fieldsResponse.json() as FacebookPostFields;

            // Get post insights
            // Available metrics depend on post type and page permissions
            const insightMetrics = [
                "post_impressions",
                "post_impressions_unique", // Reach
                "post_engaged_users",
                "post_clicks",
                "post_reactions_by_type_total",
                "post_video_views", // Only for video posts
                "post_video_avg_time_watched", // Only for video posts
                "post_video_complete_views_30s", // Only for video posts
            ].join(",");

            const insightsResponse = await fetch(
                `https://graph.facebook.com/v18.0/${platformPostId}/insights?` +
                `metric=${insightMetrics}&` +
                `access_token=${connection.accessToken}`
            );

            let insights: Record<string, number> = {};

            if (insightsResponse.ok) {
                const insightsData = await insightsResponse.json() as FacebookInsightsResponse;
                for (const insight of insightsData.data || []) {
                    if (insight.values && insight.values.length > 0) {
                        const value = insight.values[0].value;
                        if (typeof value === "number") {
                            insights[insight.name] = value;
                        } else if (typeof value === "object") {
                            // For reactions by type, sum them all
                            if (insight.name === "post_reactions_by_type_total") {
                                insights[insight.name] = Object.values(value).reduce(
                                    (sum: number, v) => sum + (typeof v === "number" ? v : 0),
                                    0
                                );
                            }
                        }
                    }
                }
            } else {
                this.logger.warn(`Facebook insights API error, using basic metrics only`);
            }

            const metrics: MetricsData = {
                contentId,
                platform: Platform.FACEBOOK,
                platformPostId,
                metricsDate: new Date(),
                views: insights.post_impressions || 0,
                likes: postData.reactions?.summary?.total_count ||
                    insights.post_reactions_by_type_total || 0,
                comments: postData.comments?.summary?.total_count || 0,
                shares: postData.shares?.count || 0,
                saves: 0, // Facebook doesn't expose saves
                watchTime: undefined, // Would need video-specific endpoint
                avgWatchTime: insights.post_video_avg_time_watched || undefined,
                completionRate: undefined,
                reach: insights.post_impressions_unique || 0,
                impressions: insights.post_impressions || 0,
                followsGained: 0, // Would need page insights API
                profileVisits: insights.post_clicks || 0, // Using clicks as proxy
            };

            this.logger.debug(`Fetched Facebook metrics for ${platformPostId}: ${metrics.views} impressions`);

            return {
                success: true,
                metrics,
            };
        } catch (error) {
            this.logger.error(`Failed to fetch Facebook metrics: ${error}`);
            return {
                success: false,
                error: `Failed to fetch Facebook metrics: ${error instanceof Error ? error.message : "Unknown error"}`,
            };
        }
    }
}
