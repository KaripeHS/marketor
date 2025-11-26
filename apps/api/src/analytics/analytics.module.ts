import { Module } from "@nestjs/common";
import { AnalyticsController } from "./analytics.controller";
import { MetricsIngestionService } from "./metrics-ingestion.service";
import { AnalyticsAggregationService } from "./analytics-aggregation.service";
import { LearningInsightsService } from "./learning-insights.service";
import {
    MetricsFetcherService,
    TikTokMetricsFetcher,
    InstagramMetricsFetcher,
    YouTubeMetricsFetcher,
    YouTubeShortMetricsFetcher,
    FacebookMetricsFetcher,
} from "./fetchers";
import { CryptoModule } from "../crypto/crypto.module";

@Module({
    imports: [CryptoModule],
    controllers: [AnalyticsController],
    providers: [
        MetricsIngestionService,
        AnalyticsAggregationService,
        LearningInsightsService,
        MetricsFetcherService,
        TikTokMetricsFetcher,
        InstagramMetricsFetcher,
        YouTubeMetricsFetcher,
        YouTubeShortMetricsFetcher,
        FacebookMetricsFetcher,
    ],
    exports: [
        MetricsIngestionService,
        AnalyticsAggregationService,
        LearningInsightsService,
        MetricsFetcherService,
    ],
})
export class AnalyticsModule { }
