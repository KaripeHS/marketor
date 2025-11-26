import { Platform } from "@prisma/client";
import { MetricsData } from "../metrics-ingestion.service";

export interface PlatformConnection {
    accessToken: string;
    refreshToken?: string | null;
    accountId: string;
}

export interface MetricsFetchResult {
    success: boolean;
    metrics?: MetricsData;
    error?: string;
}

export interface PlatformMetricsFetcher {
    platform: Platform;
    fetchMetrics(
        connection: PlatformConnection,
        contentId: string,
        platformPostId: string
    ): Promise<MetricsFetchResult>;
}
