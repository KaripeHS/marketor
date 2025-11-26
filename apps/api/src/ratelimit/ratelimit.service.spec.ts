import { RateLimitService } from "./ratelimit.service";
import { Platform } from "@prisma/client";

describe("RateLimitService", () => {
    let service: RateLimitService;
    const testTenantId = "tenant-123";

    beforeEach(() => {
        service = new RateLimitService();
        service.onModuleInit();
        service.clearAll(); // Ensure clean state
    });

    describe("canMakeRequest", () => {
        it("should allow first request for any platform", () => {
            expect(service.canMakeRequest(Platform.TIKTOK, testTenantId)).toBe(true);
            expect(service.canMakeRequest(Platform.INSTAGRAM, testTenantId)).toBe(true);
            expect(service.canMakeRequest(Platform.YOUTUBE, testTenantId)).toBe(true);
            expect(service.canMakeRequest(Platform.FACEBOOK, testTenantId)).toBe(true);
        });

        it("should still allow requests after some are recorded", () => {
            service.recordRequest(Platform.TIKTOK, testTenantId);
            service.recordRequest(Platform.TIKTOK, testTenantId);
            expect(service.canMakeRequest(Platform.TIKTOK, testTenantId)).toBe(true);
        });

        it("should track requests separately per tenant", () => {
            const tenant1 = "tenant-1";
            const tenant2 = "tenant-2";

            service.recordRequest(Platform.INSTAGRAM, tenant1);

            // Both should still be allowed
            expect(service.canMakeRequest(Platform.INSTAGRAM, tenant1)).toBe(true);
            expect(service.canMakeRequest(Platform.INSTAGRAM, tenant2)).toBe(true);
        });

        it("should track requests separately per platform", () => {
            service.recordRequest(Platform.TIKTOK, testTenantId);

            // Both platforms should still be allowed
            expect(service.canMakeRequest(Platform.TIKTOK, testTenantId)).toBe(true);
            expect(service.canMakeRequest(Platform.INSTAGRAM, testTenantId)).toBe(true);
        });
    });

    describe("recordRequest", () => {
        it("should increment request count", () => {
            const initialStatus = service.getStatus(Platform.TIKTOK, testTenantId);
            const config = service.getConfig(Platform.TIKTOK);

            expect(initialStatus.windowRemaining).toBe(config.maxRequests);

            service.recordRequest(Platform.TIKTOK, testTenantId);

            const newStatus = service.getStatus(Platform.TIKTOK, testTenantId);
            expect(newStatus.windowRemaining).toBe(config.maxRequests - 1);
        });

        it("should increment daily count", () => {
            const initialStatus = service.getStatus(Platform.FACEBOOK, testTenantId);
            const config = service.getConfig(Platform.FACEBOOK);

            expect(initialStatus.dailyRemaining).toBe(config.dailyLimit);

            service.recordRequest(Platform.FACEBOOK, testTenantId);

            const newStatus = service.getStatus(Platform.FACEBOOK, testTenantId);
            expect(newStatus.dailyRemaining).toBe(config.dailyLimit - 1);
        });
    });

    describe("getStatus", () => {
        it("should return correct initial status", () => {
            const status = service.getStatus(Platform.INSTAGRAM, testTenantId);
            const config = service.getConfig(Platform.INSTAGRAM);

            expect(status.platform).toBe(Platform.INSTAGRAM);
            expect(status.windowRemaining).toBe(config.maxRequests);
            expect(status.dailyRemaining).toBe(config.dailyLimit);
            expect(status.isLimited).toBe(false);
        });

        it("should indicate limited when window limit reached", () => {
            const config = service.getConfig(Platform.INSTAGRAM);

            // Record max requests
            for (let i = 0; i < config.maxRequests; i++) {
                service.recordRequest(Platform.INSTAGRAM, testTenantId);
            }

            const status = service.getStatus(Platform.INSTAGRAM, testTenantId);
            expect(status.windowRemaining).toBe(0);
            expect(status.isLimited).toBe(true);
        });
    });

    describe("getWaitTime", () => {
        it("should return 0 when not rate limited", () => {
            const waitTime = service.getWaitTime(Platform.YOUTUBE, testTenantId);
            expect(waitTime).toBe(0);
        });

        it("should return positive wait time when window limited", () => {
            const config = service.getConfig(Platform.INSTAGRAM);

            // Exhaust window limit
            for (let i = 0; i < config.maxRequests; i++) {
                service.recordRequest(Platform.INSTAGRAM, testTenantId);
            }

            const waitTime = service.getWaitTime(Platform.INSTAGRAM, testTenantId);
            expect(waitTime).toBeGreaterThan(0);
            expect(waitTime).toBeLessThanOrEqual(config.windowMs);
        });
    });

    describe("getAllStatus", () => {
        it("should return status for all platforms", () => {
            const statuses = service.getAllStatus(testTenantId);

            expect(statuses.length).toBe(8); // 8 platforms

            const platforms = statuses.map(s => s.platform);
            expect(platforms).toContain(Platform.TIKTOK);
            expect(platforms).toContain(Platform.INSTAGRAM);
            expect(platforms).toContain(Platform.YOUTUBE);
            expect(platforms).toContain(Platform.YOUTUBE_SHORT);
            expect(platforms).toContain(Platform.FACEBOOK);
            expect(platforms).toContain(Platform.TWITTER);
            expect(platforms).toContain(Platform.LINKEDIN);
            expect(platforms).toContain(Platform.PINTEREST);
        });
    });

    describe("getConfig", () => {
        it("should return config for each platform", () => {
            const tiktokConfig = service.getConfig(Platform.TIKTOK);
            expect(tiktokConfig.maxRequests).toBeGreaterThan(0);
            expect(tiktokConfig.windowMs).toBeGreaterThan(0);
            expect(tiktokConfig.dailyLimit).toBeGreaterThan(0);
            expect(tiktokConfig.description).toBeDefined();
        });

        it("should return a copy (not the original object)", () => {
            const config1 = service.getConfig(Platform.YOUTUBE);
            const config2 = service.getConfig(Platform.YOUTUBE);

            expect(config1).not.toBe(config2);
            expect(config1).toEqual(config2);
        });
    });

    describe("getAllConfigs", () => {
        it("should return configs for all platforms", () => {
            const configs = service.getAllConfigs();

            expect(Object.keys(configs).length).toBe(8);
            expect(configs.TIKTOK).toBeDefined();
            expect(configs.INSTAGRAM).toBeDefined();
            expect(configs.YOUTUBE).toBeDefined();
            expect(configs.YOUTUBE_SHORT).toBeDefined();
            expect(configs.FACEBOOK).toBeDefined();
            expect(configs.TWITTER).toBeDefined();
            expect(configs.LINKEDIN).toBeDefined();
            expect(configs.PINTEREST).toBeDefined();
        });
    });

    describe("resetBucket", () => {
        it("should reset request counts for platform/tenant", () => {
            service.recordRequest(Platform.TIKTOK, testTenantId);
            service.recordRequest(Platform.TIKTOK, testTenantId);

            const statusBefore = service.getStatus(Platform.TIKTOK, testTenantId);
            const config = service.getConfig(Platform.TIKTOK);
            expect(statusBefore.windowRemaining).toBe(config.maxRequests - 2);

            service.resetBucket(Platform.TIKTOK, testTenantId);

            const statusAfter = service.getStatus(Platform.TIKTOK, testTenantId);
            expect(statusAfter.windowRemaining).toBe(config.maxRequests);
        });

        it("should not affect other platforms", () => {
            service.recordRequest(Platform.TIKTOK, testTenantId);
            service.recordRequest(Platform.FACEBOOK, testTenantId);

            service.resetBucket(Platform.TIKTOK, testTenantId);

            // TikTok should be reset
            const tiktokConfig = service.getConfig(Platform.TIKTOK);
            expect(service.getStatus(Platform.TIKTOK, testTenantId).windowRemaining).toBe(tiktokConfig.maxRequests);

            // Facebook should still have 1 request recorded
            const fbConfig = service.getConfig(Platform.FACEBOOK);
            expect(service.getStatus(Platform.FACEBOOK, testTenantId).windowRemaining).toBe(fbConfig.maxRequests - 1);
        });
    });

    describe("clearAll", () => {
        it("should clear all buckets", () => {
            service.recordRequest(Platform.TIKTOK, "tenant-1");
            service.recordRequest(Platform.INSTAGRAM, "tenant-2");
            service.recordRequest(Platform.FACEBOOK, testTenantId);

            service.clearAll();

            // All should be reset
            const tiktokConfig = service.getConfig(Platform.TIKTOK);
            const igConfig = service.getConfig(Platform.INSTAGRAM);
            const fbConfig = service.getConfig(Platform.FACEBOOK);

            expect(service.getStatus(Platform.TIKTOK, "tenant-1").windowRemaining).toBe(tiktokConfig.maxRequests);
            expect(service.getStatus(Platform.INSTAGRAM, "tenant-2").windowRemaining).toBe(igConfig.maxRequests);
            expect(service.getStatus(Platform.FACEBOOK, testTenantId).windowRemaining).toBe(fbConfig.maxRequests);
        });
    });
});
