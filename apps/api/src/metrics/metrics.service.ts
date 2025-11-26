import { Injectable, OnModuleInit } from "@nestjs/common";
import {
    Counter,
    Gauge,
    Histogram,
    Registry,
    collectDefaultMetrics,
} from "prom-client";

@Injectable()
export class MetricsService implements OnModuleInit {
    private readonly registry: Registry;

    // HTTP metrics
    readonly httpRequestsTotal: Counter<string>;
    readonly httpRequestDuration: Histogram<string>;
    readonly httpRequestsInFlight: Gauge<string>;

    // Publishing metrics
    readonly publishJobsTotal: Counter<string>;
    readonly publishJobDuration: Histogram<string>;
    readonly publishJobsActive: Gauge<string>;

    // Social platform API metrics
    readonly socialApiCallsTotal: Counter<string>;
    readonly socialApiCallDuration: Histogram<string>;
    readonly socialApiErrors: Counter<string>;

    // Queue metrics
    readonly queueJobsTotal: Counter<string>;
    readonly queueJobsWaiting: Gauge<string>;
    readonly queueJobsActive: Gauge<string>;
    readonly queueJobsFailed: Counter<string>;

    // Notification metrics
    readonly notificationsSentTotal: Counter<string>;
    readonly notificationsFailed: Counter<string>;
    readonly notificationDeliveryDuration: Histogram<string>;

    // Business metrics
    readonly activeTenantsGauge: Gauge<string>;
    readonly activeUsersGauge: Gauge<string>;
    readonly contentItemsTotal: Counter<string>;
    readonly metricsIngested: Counter<string>;

    // Rate limit metrics
    readonly rateLimitHits: Counter<string>;
    readonly rateLimitBudgetRemaining: Gauge<string>;

    constructor() {
        this.registry = new Registry();

        // HTTP metrics
        this.httpRequestsTotal = new Counter({
            name: "http_requests_total",
            help: "Total number of HTTP requests",
            labelNames: ["method", "path", "status"],
            registers: [this.registry],
        });

        this.httpRequestDuration = new Histogram({
            name: "http_request_duration_seconds",
            help: "HTTP request duration in seconds",
            labelNames: ["method", "path", "status"],
            buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
            registers: [this.registry],
        });

        this.httpRequestsInFlight = new Gauge({
            name: "http_requests_in_flight",
            help: "Number of HTTP requests currently being processed",
            labelNames: ["method"],
            registers: [this.registry],
        });

        // Publishing metrics
        this.publishJobsTotal = new Counter({
            name: "publish_jobs_total",
            help: "Total number of publish jobs processed",
            labelNames: ["platform", "status"],
            registers: [this.registry],
        });

        this.publishJobDuration = new Histogram({
            name: "publish_job_duration_seconds",
            help: "Time taken to publish content",
            labelNames: ["platform"],
            buckets: [0.5, 1, 2, 5, 10, 30, 60],
            registers: [this.registry],
        });

        this.publishJobsActive = new Gauge({
            name: "publish_jobs_active",
            help: "Number of publish jobs currently running",
            labelNames: ["platform"],
            registers: [this.registry],
        });

        // Social platform API metrics
        this.socialApiCallsTotal = new Counter({
            name: "social_api_calls_total",
            help: "Total social platform API calls",
            labelNames: ["platform", "endpoint"],
            registers: [this.registry],
        });

        this.socialApiCallDuration = new Histogram({
            name: "social_api_call_duration_seconds",
            help: "Social platform API call duration",
            labelNames: ["platform", "endpoint"],
            buckets: [0.1, 0.25, 0.5, 1, 2, 5, 10],
            registers: [this.registry],
        });

        this.socialApiErrors = new Counter({
            name: "social_api_errors_total",
            help: "Total social platform API errors",
            labelNames: ["platform", "error_type"],
            registers: [this.registry],
        });

        // Queue metrics
        this.queueJobsTotal = new Counter({
            name: "queue_jobs_total",
            help: "Total queue jobs processed",
            labelNames: ["queue", "status"],
            registers: [this.registry],
        });

        this.queueJobsWaiting = new Gauge({
            name: "queue_jobs_waiting",
            help: "Number of jobs waiting in queue",
            labelNames: ["queue"],
            registers: [this.registry],
        });

        this.queueJobsActive = new Gauge({
            name: "queue_jobs_active",
            help: "Number of jobs currently being processed",
            labelNames: ["queue"],
            registers: [this.registry],
        });

        this.queueJobsFailed = new Counter({
            name: "queue_jobs_failed_total",
            help: "Total failed queue jobs",
            labelNames: ["queue", "error_type"],
            registers: [this.registry],
        });

        // Notification metrics
        this.notificationsSentTotal = new Counter({
            name: "notifications_sent_total",
            help: "Total notifications sent",
            labelNames: ["channel", "type"],
            registers: [this.registry],
        });

        this.notificationsFailed = new Counter({
            name: "notifications_failed_total",
            help: "Total failed notifications",
            labelNames: ["channel", "type", "error_type"],
            registers: [this.registry],
        });

        this.notificationDeliveryDuration = new Histogram({
            name: "notification_delivery_duration_seconds",
            help: "Time taken to deliver notification",
            labelNames: ["channel"],
            buckets: [0.1, 0.5, 1, 2, 5, 10],
            registers: [this.registry],
        });

        // Business metrics
        this.activeTenantsGauge = new Gauge({
            name: "active_tenants",
            help: "Number of active tenants",
            registers: [this.registry],
        });

        this.activeUsersGauge = new Gauge({
            name: "active_users",
            help: "Number of active users",
            registers: [this.registry],
        });

        this.contentItemsTotal = new Counter({
            name: "content_items_created_total",
            help: "Total content items created",
            labelNames: ["platform", "format"],
            registers: [this.registry],
        });

        this.metricsIngested = new Counter({
            name: "analytics_metrics_ingested_total",
            help: "Total analytics metrics ingested",
            labelNames: ["platform"],
            registers: [this.registry],
        });

        // Rate limit metrics
        this.rateLimitHits = new Counter({
            name: "rate_limit_hits_total",
            help: "Total rate limit hits",
            labelNames: ["platform", "tenant_id"],
            registers: [this.registry],
        });

        this.rateLimitBudgetRemaining = new Gauge({
            name: "rate_limit_budget_remaining",
            help: "Remaining rate limit budget",
            labelNames: ["platform", "tenant_id"],
            registers: [this.registry],
        });
    }

    onModuleInit() {
        // Collect default Node.js metrics (CPU, memory, etc.)
        collectDefaultMetrics({ register: this.registry });
    }

    async getMetrics(): Promise<string> {
        return this.registry.metrics();
    }

    async getContentType(): Promise<string> {
        return this.registry.contentType;
    }

    // Helper methods for common metric operations
    recordHttpRequest(
        method: string,
        path: string,
        status: number,
        durationMs: number
    ) {
        const normalizedPath = this.normalizePath(path);
        this.httpRequestsTotal.labels(method, normalizedPath, String(status)).inc();
        this.httpRequestDuration
            .labels(method, normalizedPath, String(status))
            .observe(durationMs / 1000);
    }

    recordPublishJob(platform: string, status: "success" | "failure", durationMs: number) {
        this.publishJobsTotal.labels(platform, status).inc();
        this.publishJobDuration.labels(platform).observe(durationMs / 1000);
    }

    recordSocialApiCall(platform: string, endpoint: string, durationMs: number) {
        this.socialApiCallsTotal.labels(platform, endpoint).inc();
        this.socialApiCallDuration.labels(platform, endpoint).observe(durationMs / 1000);
    }

    recordSocialApiError(platform: string, errorType: string) {
        this.socialApiErrors.labels(platform, errorType).inc();
    }

    recordNotification(channel: string, type: string, success: boolean, durationMs?: number) {
        if (success) {
            this.notificationsSentTotal.labels(channel, type).inc();
            if (durationMs !== undefined) {
                this.notificationDeliveryDuration.labels(channel).observe(durationMs / 1000);
            }
        } else {
            this.notificationsFailed.labels(channel, type, "delivery_failed").inc();
        }
    }

    recordRateLimitHit(platform: string, tenantId: string) {
        this.rateLimitHits.labels(platform, tenantId).inc();
    }

    updateRateLimitBudget(platform: string, tenantId: string, remaining: number) {
        this.rateLimitBudgetRemaining.labels(platform, tenantId).set(remaining);
    }

    updateQueueStats(queue: string, waiting: number, active: number) {
        this.queueJobsWaiting.labels(queue).set(waiting);
        this.queueJobsActive.labels(queue).set(active);
    }

    // Normalize paths to prevent high cardinality
    private normalizePath(path: string): string {
        // Replace UUIDs and numeric IDs with placeholders
        return path
            .replace(/\/[a-f0-9-]{36}/gi, "/:id")
            .replace(/\/\d+/g, "/:id")
            .replace(/\?.*$/, ""); // Remove query params
    }
}
