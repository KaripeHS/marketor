import { Body, Controller, Get, Param, Post, Query } from "@nestjs/common";
import { IsArray, IsDate, IsEnum, IsNumber, IsOptional, IsString } from "class-validator";
import { Type } from "class-transformer";
import { Platform } from "@prisma/client";
import { Auth } from "../auth/auth.decorator";
import { AuthContext } from "../auth/auth.types";
import { Roles } from "../auth/roles.decorator";
import { MetricsIngestionService, MetricsData } from "./metrics-ingestion.service";
import { AnalyticsAggregationService } from "./analytics-aggregation.service";
import { LearningInsightsService } from "./learning-insights.service";
import { MetricsFetcherService } from "./fetchers";

class IngestMetricsDto {
    @IsString()
    contentId!: string;

    @IsEnum(Platform)
    platform!: Platform;

    @IsOptional()
    @IsString()
    platformPostId?: string;

    @Type(() => Date)
    @IsDate()
    metricsDate!: Date;

    @IsOptional()
    @IsNumber()
    views?: number;

    @IsOptional()
    @IsNumber()
    likes?: number;

    @IsOptional()
    @IsNumber()
    comments?: number;

    @IsOptional()
    @IsNumber()
    shares?: number;

    @IsOptional()
    @IsNumber()
    saves?: number;

    @IsOptional()
    @IsNumber()
    watchTime?: number;

    @IsOptional()
    @IsNumber()
    avgWatchTime?: number;

    @IsOptional()
    @IsNumber()
    completionRate?: number;

    @IsOptional()
    @IsNumber()
    reach?: number;

    @IsOptional()
    @IsNumber()
    impressions?: number;

    @IsOptional()
    @IsNumber()
    followsGained?: number;

    @IsOptional()
    @IsNumber()
    profileVisits?: number;
}

class BatchIngestDto {
    @IsArray()
    metrics!: IngestMetricsDto[];
}

@Controller("analytics")
export class AnalyticsController {
    constructor(
        private readonly ingestion: MetricsIngestionService,
        private readonly aggregation: AnalyticsAggregationService,
        private readonly learning: LearningInsightsService,
        private readonly fetcher: MetricsFetcherService
    ) {}

    // Dashboard endpoints

    @Get("dashboard")
    async getDashboard(
        @Query("period") period: string = "30d",
        @Auth() auth: AuthContext
    ) {
        const dateRange = this.parsePeriod(period);
        return this.aggregation.getDashboard(auth.tenantId, dateRange);
    }

    @Get("overview")
    async getOverview(
        @Query("period") period: string = "30d",
        @Auth() auth: AuthContext
    ) {
        const dateRange = this.parsePeriod(period);
        return this.aggregation.getOverviewMetrics(auth.tenantId, dateRange);
    }

    @Get("platforms")
    async getPlatformBreakdown(
        @Query("period") period: string = "30d",
        @Auth() auth: AuthContext
    ) {
        const dateRange = this.parsePeriod(period);
        return this.aggregation.getPlatformBreakdown(auth.tenantId, dateRange);
    }

    @Get("timeseries")
    async getTimeSeries(
        @Query("period") period: string = "30d",
        @Auth() auth: AuthContext
    ) {
        const dateRange = this.parsePeriod(period);
        return this.aggregation.getTimeSeries(auth.tenantId, dateRange);
    }

    @Get("top-content")
    async getTopContent(
        @Query("period") period: string = "30d",
        @Query("limit") limit: number = 10,
        @Auth() auth: AuthContext
    ) {
        const dateRange = this.parsePeriod(period);
        return this.aggregation.getTopContent(auth.tenantId, dateRange, limit);
    }

    @Get("comparison")
    async getComparison(
        @Query("period") period: string = "30d",
        @Auth() auth: AuthContext
    ) {
        const current = this.parsePeriod(period);
        const periodMs = current.end.getTime() - current.start.getTime();
        const previous = {
            start: new Date(current.start.getTime() - periodMs),
            end: new Date(current.start.getTime() - 1),
        };
        return this.aggregation.getComparisonMetrics(auth.tenantId, current, previous);
    }

    // Content metrics endpoints

    @Get("content/:contentId")
    async getContentMetrics(
        @Param("contentId") contentId: string,
        @Auth() _auth: AuthContext
    ) {
        return this.ingestion.getLatestMetrics(contentId);
    }

    @Get("content/:contentId/history")
    async getContentHistory(
        @Param("contentId") contentId: string,
        @Query("period") period: string = "30d",
        @Auth() _auth: AuthContext
    ) {
        const dateRange = this.parsePeriod(period);
        return this.ingestion.getMetricsHistory(contentId, dateRange.start, dateRange.end);
    }

    // Metrics ingestion endpoints

    @Post("ingest")
    @Roles("ADMIN", "AGENCY")
    async ingestMetrics(
        @Body() dto: IngestMetricsDto,
        @Auth() auth: AuthContext
    ) {
        const metricsData: MetricsData = {
            contentId: dto.contentId,
            platform: dto.platform,
            platformPostId: dto.platformPostId,
            metricsDate: dto.metricsDate,
            views: dto.views,
            likes: dto.likes,
            comments: dto.comments,
            shares: dto.shares,
            saves: dto.saves,
            watchTime: dto.watchTime,
            avgWatchTime: dto.avgWatchTime,
            completionRate: dto.completionRate,
            reach: dto.reach,
            impressions: dto.impressions,
            followsGained: dto.followsGained,
            profileVisits: dto.profileVisits,
        };

        await this.ingestion.ingestMetrics(auth.tenantId, metricsData);
        return { success: true, message: "Metrics ingested" };
    }

    @Post("ingest/batch")
    @Roles("ADMIN", "AGENCY")
    async batchIngestMetrics(
        @Body() dto: BatchIngestDto,
        @Auth() auth: AuthContext
    ) {
        const metricsArray: MetricsData[] = dto.metrics.map((m) => ({
            contentId: m.contentId,
            platform: m.platform,
            platformPostId: m.platformPostId,
            metricsDate: m.metricsDate,
            views: m.views,
            likes: m.likes,
            comments: m.comments,
            shares: m.shares,
            saves: m.saves,
            watchTime: m.watchTime,
            avgWatchTime: m.avgWatchTime,
            completionRate: m.completionRate,
            reach: m.reach,
            impressions: m.impressions,
            followsGained: m.followsGained,
            profileVisits: m.profileVisits,
        }));

        const result = await this.ingestion.batchIngestMetrics(auth.tenantId, metricsArray);
        return result;
    }

    @Post("fetch/:contentId")
    @Roles("ADMIN", "AGENCY")
    async fetchFromPlatform(
        @Param("contentId") contentId: string,
        @Query("platform") platform: Platform,
        @Query("platformPostId") platformPostId: string,
        @Auth() auth: AuthContext
    ) {
        // Use real platform fetcher instead of mock
        return this.fetcher.fetchAndIngestMetrics(
            auth.tenantId,
            contentId,
            platform,
            platformPostId
        );
    }

    @Post("fetch-content/:contentId")
    @Roles("ADMIN", "AGENCY")
    async fetchAllPlatformsForContent(
        @Param("contentId") contentId: string,
        @Auth() auth: AuthContext
    ) {
        return this.fetcher.fetchMetricsForContent(auth.tenantId, contentId);
    }

    @Post("fetch-all")
    @Roles("ADMIN")
    async fetchAllPublishedMetrics(@Auth() auth: AuthContext) {
        return this.fetcher.fetchAllPublishedContent(auth.tenantId);
    }

    // Learning insights endpoints

    @Get("insights")
    async getInsights(
        @Query("limit") limit: number = 10,
        @Auth() auth: AuthContext
    ) {
        return this.learning.getActiveInsights(auth.tenantId, limit);
    }

    @Post("insights/analyze")
    @Roles("ADMIN", "AGENCY")
    async analyzeAndGenerateInsights(
        @Query("period") period: string = "90d",
        @Auth() auth: AuthContext
    ) {
        const dateRange = this.parsePeriod(period);
        return this.learning.analyzeAndGenerateInsights(auth.tenantId, dateRange);
    }

    // Daily aggregation endpoint (for cron/scheduler)

    @Post("aggregate/daily")
    @Roles("ADMIN")
    async aggregateDaily(
        @Query("date") dateStr?: string,
        @Auth() auth?: AuthContext
    ) {
        const date = dateStr ? new Date(dateStr) : new Date();
        if (auth) {
            await this.aggregation.updateDailyAnalytics(auth.tenantId, date);
        }
        return { success: true, date: date.toISOString() };
    }

    private parsePeriod(period: string): { start: Date; end: Date } {
        const now = new Date();
        const end = new Date(now);
        end.setHours(23, 59, 59, 999);

        let start: Date;

        const match = period.match(/^(\d+)(d|w|m|y)$/);
        if (match) {
            const value = parseInt(match[1]);
            const unit = match[2];

            start = new Date(now);
            switch (unit) {
                case "d":
                    start.setDate(start.getDate() - value);
                    break;
                case "w":
                    start.setDate(start.getDate() - value * 7);
                    break;
                case "m":
                    start.setMonth(start.getMonth() - value);
                    break;
                case "y":
                    start.setFullYear(start.getFullYear() - value);
                    break;
            }
        } else {
            // Default to 30 days
            start = new Date(now);
            start.setDate(start.getDate() - 30);
        }

        start.setHours(0, 0, 0, 0);
        return { start, end };
    }
}
