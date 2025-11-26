import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { Platform } from "@prisma/client";

export interface RateLimitConfig {
    maxRequests: number;      // Max requests per window
    windowMs: number;         // Time window in milliseconds
    dailyLimit: number;       // Daily limit (resets at midnight UTC)
    description: string;
}

interface RateLimitBucket {
    requests: number;
    windowStart: number;
    dailyRequests: number;
    dailyReset: number;
}

export interface RateLimitStatus {
    platform: Platform;
    windowRemaining: number;
    windowResetIn: number;
    dailyRemaining: number;
    dailyResetIn: number;
    isLimited: boolean;
}

@Injectable()
export class RateLimitService implements OnModuleInit {
    private readonly logger = new Logger(RateLimitService.name);
    private buckets: Map<string, RateLimitBucket> = new Map();

    // Platform-specific rate limits based on official API documentation
    // These are conservative defaults - adjust based on actual API tier
    private readonly configs: Record<Platform, RateLimitConfig> = {
        TIKTOK: {
            maxRequests: 100,        // ~100 requests per 10 minutes
            windowMs: 10 * 60 * 1000,
            dailyLimit: 1000,
            description: "TikTok Content Posting API",
        },
        INSTAGRAM: {
            maxRequests: 25,         // Instagram Graph API is restrictive
            windowMs: 60 * 60 * 1000, // 1 hour window
            dailyLimit: 200,
            description: "Instagram Graph API (via Facebook)",
        },
        YOUTUBE: {
            maxRequests: 10000,      // YouTube Data API v3 quota units
            windowMs: 24 * 60 * 60 * 1000, // Daily quota
            dailyLimit: 10000,
            description: "YouTube Data API v3 (quota units)",
        },
        YOUTUBE_SHORT: {
            maxRequests: 10000,      // Shares quota with YouTube
            windowMs: 24 * 60 * 60 * 1000,
            dailyLimit: 10000,
            description: "YouTube Shorts (shares YouTube quota)",
        },
        FACEBOOK: {
            maxRequests: 200,        // Facebook Graph API
            windowMs: 60 * 60 * 1000, // 1 hour window
            dailyLimit: 4800,        // ~200 calls per hour * 24 hours
            description: "Facebook Graph API",
        },
        TWITTER: {
            maxRequests: 200,        // Twitter API v2
            windowMs: 15 * 60 * 1000, // 15 minute window
            dailyLimit: 2400,        // 200 tweets per 15 min, app-level
            description: "Twitter API v2",
        },
        LINKEDIN: {
            maxRequests: 100,        // LinkedIn Marketing API
            windowMs: 60 * 60 * 1000, // 1 hour window
            dailyLimit: 800,
            description: "LinkedIn Marketing API",
        },
        PINTEREST: {
            maxRequests: 1000,       // Pinterest API
            windowMs: 60 * 60 * 1000, // 1 hour window
            dailyLimit: 10000,
            description: "Pinterest API",
        },
    };

    onModuleInit() {
        this.logger.log("Rate limit service initialized with platform budgets");
        this.logConfigs();
    }

    private logConfigs() {
        for (const [platform, config] of Object.entries(this.configs)) {
            this.logger.debug(
                `${platform}: ${config.maxRequests} req/${config.windowMs / 1000}s, ${config.dailyLimit}/day`
            );
        }
    }

    private getBucketKey(platform: Platform, tenantId: string): string {
        return `${platform}:${tenantId}`;
    }

    private getOrCreateBucket(platform: Platform, tenantId: string): RateLimitBucket {
        const key = this.getBucketKey(platform, tenantId);
        let bucket = this.buckets.get(key);

        if (!bucket) {
            const now = Date.now();
            bucket = {
                requests: 0,
                windowStart: now,
                dailyRequests: 0,
                dailyReset: this.getNextMidnightUTC(),
            };
            this.buckets.set(key, bucket);
        }

        return bucket;
    }

    private getNextMidnightUTC(): number {
        const now = new Date();
        const tomorrow = new Date(Date.UTC(
            now.getUTCFullYear(),
            now.getUTCMonth(),
            now.getUTCDate() + 1,
            0, 0, 0, 0
        ));
        return tomorrow.getTime();
    }

    private resetBucketIfNeeded(bucket: RateLimitBucket, config: RateLimitConfig): void {
        const now = Date.now();

        // Reset window if expired
        if (now - bucket.windowStart >= config.windowMs) {
            bucket.requests = 0;
            bucket.windowStart = now;
        }

        // Reset daily counter if past midnight UTC
        if (now >= bucket.dailyReset) {
            bucket.dailyRequests = 0;
            bucket.dailyReset = this.getNextMidnightUTC();
        }
    }

    canMakeRequest(platform: Platform, tenantId: string): boolean {
        const config = this.configs[platform];
        const bucket = this.getOrCreateBucket(platform, tenantId);

        this.resetBucketIfNeeded(bucket, config);

        const withinWindowLimit = bucket.requests < config.maxRequests;
        const withinDailyLimit = bucket.dailyRequests < config.dailyLimit;

        return withinWindowLimit && withinDailyLimit;
    }

    recordRequest(platform: Platform, tenantId: string): void {
        const config = this.configs[platform];
        const bucket = this.getOrCreateBucket(platform, tenantId);

        this.resetBucketIfNeeded(bucket, config);

        bucket.requests++;
        bucket.dailyRequests++;

        this.logger.debug(
            `${platform}/${tenantId}: ${bucket.requests}/${config.maxRequests} window, ${bucket.dailyRequests}/${config.dailyLimit} daily`
        );
    }

    getStatus(platform: Platform, tenantId: string): RateLimitStatus {
        const config = this.configs[platform];
        const bucket = this.getOrCreateBucket(platform, tenantId);

        this.resetBucketIfNeeded(bucket, config);

        const now = Date.now();
        const windowRemaining = Math.max(0, config.maxRequests - bucket.requests);
        const windowResetIn = Math.max(0, config.windowMs - (now - bucket.windowStart));
        const dailyRemaining = Math.max(0, config.dailyLimit - bucket.dailyRequests);
        const dailyResetIn = Math.max(0, bucket.dailyReset - now);

        return {
            platform,
            windowRemaining,
            windowResetIn,
            dailyRemaining,
            dailyResetIn,
            isLimited: windowRemaining === 0 || dailyRemaining === 0,
        };
    }

    getAllStatus(tenantId: string): RateLimitStatus[] {
        return Object.keys(this.configs).map((platform) =>
            this.getStatus(platform as Platform, tenantId)
        );
    }

    getWaitTime(platform: Platform, tenantId: string): number {
        const config = this.configs[platform];
        const bucket = this.getOrCreateBucket(platform, tenantId);

        this.resetBucketIfNeeded(bucket, config);

        const now = Date.now();

        // If within limits, no wait needed
        if (bucket.requests < config.maxRequests && bucket.dailyRequests < config.dailyLimit) {
            return 0;
        }

        // If window limit reached, wait for window reset
        if (bucket.requests >= config.maxRequests) {
            return config.windowMs - (now - bucket.windowStart);
        }

        // If daily limit reached, wait until midnight UTC
        return bucket.dailyReset - now;
    }

    getConfig(platform: Platform): RateLimitConfig {
        return { ...this.configs[platform] };
    }

    getAllConfigs(): Record<Platform, RateLimitConfig> {
        const result: Record<string, RateLimitConfig> = {};
        for (const [platform, config] of Object.entries(this.configs)) {
            result[platform] = { ...config };
        }
        return result as Record<Platform, RateLimitConfig>;
    }

    // For testing/admin purposes - reset a tenant's bucket
    resetBucket(platform: Platform, tenantId: string): void {
        const key = this.getBucketKey(platform, tenantId);
        this.buckets.delete(key);
        this.logger.log(`Reset rate limit bucket for ${platform}/${tenantId}`);
    }

    // Clear all buckets (for testing)
    clearAll(): void {
        this.buckets.clear();
        this.logger.log("Cleared all rate limit buckets");
    }
}
