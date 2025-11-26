import { Module } from "@nestjs/common";
import { AnalyticsController } from "./analytics.controller";
import { MetricsIngestionService } from "./metrics-ingestion.service";
import { AnalyticsAggregationService } from "./analytics-aggregation.service";
import { LearningInsightsService } from "./learning-insights.service";

@Module({
    controllers: [AnalyticsController],
    providers: [
        MetricsIngestionService,
        AnalyticsAggregationService,
        LearningInsightsService,
    ],
    exports: [
        MetricsIngestionService,
        AnalyticsAggregationService,
        LearningInsightsService,
    ],
})
export class AnalyticsModule { }
