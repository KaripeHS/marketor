import { Injectable, Inject, Logger } from "@nestjs/common";
import { CACHE_MANAGER } from "@nestjs/cache-manager";
import { Cache } from "cache-manager";

export interface CacheOptions {
    ttl?: number; // Time to live in milliseconds
    prefix?: string;
}

@Injectable()
export class CacheService {
    private readonly logger = new Logger(CacheService.name);
    private readonly defaultTTL = 60 * 1000; // 60 seconds

    constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

    /**
     * Get a value from cache
     */
    async get<T>(key: string): Promise<T | undefined> {
        try {
            const value = await this.cacheManager.get<T>(key);
            if (value !== undefined) {
                this.logger.debug(`Cache hit: ${key}`);
            }
            return value;
        } catch (error) {
            this.logger.error(`Cache get error for ${key}:`, error);
            return undefined;
        }
    }

    /**
     * Set a value in cache
     */
    async set<T>(key: string, value: T, options?: CacheOptions): Promise<void> {
        try {
            const ttl = options?.ttl ?? this.defaultTTL;
            await this.cacheManager.set(key, value, ttl);
            this.logger.debug(`Cache set: ${key} (TTL: ${ttl}ms)`);
        } catch (error) {
            this.logger.error(`Cache set error for ${key}:`, error);
        }
    }

    /**
     * Delete a value from cache
     */
    async del(key: string): Promise<void> {
        try {
            await this.cacheManager.del(key);
            this.logger.debug(`Cache del: ${key}`);
        } catch (error) {
            this.logger.error(`Cache del error for ${key}:`, error);
        }
    }

    /**
     * Delete all keys matching a pattern (prefix-based)
     */
    async delByPrefix(prefix: string): Promise<void> {
        try {
            // Note: This requires Redis with pattern support
            // For in-memory cache, this is a no-op
            const stores = (this.cacheManager as any).stores;
            if (stores && stores[0] && stores[0].keys) {
                const keys = await stores[0].keys(`${prefix}*`);
                if (keys.length > 0) {
                    await Promise.all(keys.map((key: string) => this.cacheManager.del(key)));
                    this.logger.debug(`Cache delByPrefix: ${prefix}* (${keys.length} keys)`);
                }
            }
        } catch (error) {
            this.logger.error(`Cache delByPrefix error for ${prefix}:`, error);
        }
    }

    /**
     * Get or set pattern - retrieves from cache or executes factory function
     */
    async getOrSet<T>(
        key: string,
        factory: () => Promise<T>,
        options?: CacheOptions
    ): Promise<T> {
        const cached = await this.get<T>(key);
        if (cached !== undefined) {
            return cached;
        }

        const value = await factory();
        await this.set(key, value, options);
        return value;
    }

    /**
     * Build a cache key with optional prefix
     */
    buildKey(parts: string[], prefix?: string): string {
        const key = parts.filter(Boolean).join(":");
        return prefix ? `${prefix}:${key}` : key;
    }

    /**
     * Cache keys for common entities
     */
    keys = {
        tenant: (id: string) => `tenant:${id}`,
        tenantList: () => "tenant:list",
        user: (id: string) => `user:${id}`,
        campaign: (id: string) => `campaign:${id}`,
        campaignsByTenant: (tenantId: string) => `campaigns:tenant:${tenantId}`,
        content: (id: string) => `content:${id}`,
        contentByTenant: (tenantId: string) => `content:tenant:${tenantId}`,
        contentByCampaign: (campaignId: string) => `content:campaign:${campaignId}`,
        analytics: (contentId: string) => `analytics:${contentId}`,
        analyticsByTenant: (tenantId: string) => `analytics:tenant:${tenantId}`,
        brandProfile: (tenantId: string) => `brand:${tenantId}`,
        strategy: (tenantId: string) => `strategy:${tenantId}`,
    };

    /**
     * TTL presets in milliseconds
     */
    ttl = {
        short: 30 * 1000,      // 30 seconds
        medium: 5 * 60 * 1000, // 5 minutes
        long: 30 * 60 * 1000,  // 30 minutes
        hour: 60 * 60 * 1000,  // 1 hour
        day: 24 * 60 * 60 * 1000, // 24 hours
    };
}
