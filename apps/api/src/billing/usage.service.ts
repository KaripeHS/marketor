import { Injectable, Logger } from "@nestjs/common";
import { PlanType, UsageType } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

export interface UsageSummary {
    type: UsageType;
    current: number;
    limit: number;
    percentage: number;
    isOverLimit: boolean;
}

export interface Entitlements {
    plan: PlanType;
    limits: {
        maxUsers: number;
        maxPosts: number;
        maxStorage: number;
        maxPlatforms: number;
    };
    usage: {
        users: number;
        posts: number;
        storage: number;
        platforms: number;
    };
    features: string[];
    canPublish: boolean;
    canAddUser: boolean;
    canConnectPlatform: boolean;
    canUpload: boolean;
}

@Injectable()
export class UsageService {
    private readonly logger = new Logger(UsageService.name);

    constructor(private readonly prisma: PrismaService) {}

    async getCurrentUsage(tenantId: string): Promise<UsageSummary[]> {
        const subscription = await this.prisma.subscription.findUnique({
            where: { tenantId },
        });

        if (!subscription) {
            return [];
        }

        // Get plan limits
        const planDef = await this.prisma.planDefinition.findUnique({
            where: { plan: subscription.plan },
        });

        const limits = {
            maxUsers: subscription.maxUsers ?? planDef?.maxUsers ?? 1,
            maxPosts: subscription.maxPosts ?? planDef?.maxPosts ?? 10,
            maxStorage: subscription.maxStorage ?? planDef?.maxStorage ?? 100,
            maxPlatforms: subscription.maxPlatforms ?? planDef?.maxPlatforms ?? 1,
        };

        // Get current period start/end
        const periodStart = subscription.currentPeriodStart || new Date(new Date().setDate(1));
        const periodEnd = subscription.currentPeriodEnd || new Date(new Date().setMonth(new Date().getMonth() + 1, 0));

        // Get or create usage records
        const usageTypes: UsageType[] = [
            UsageType.POSTS_PUBLISHED,
            UsageType.STORAGE_MB,
            UsageType.TEAM_MEMBERS,
            UsageType.PLATFORMS_CONNECTED,
            UsageType.AI_GENERATIONS,
        ];

        const summaries: UsageSummary[] = [];

        for (const type of usageTypes) {
            let record = await this.prisma.usageRecord.findFirst({
                where: {
                    subscriptionId: subscription.id,
                    type,
                    periodStart,
                },
            });

            if (!record) {
                // Calculate current usage
                const current = await this.calculateUsage(tenantId, type, periodStart, periodEnd);
                record = await this.prisma.usageRecord.create({
                    data: {
                        subscriptionId: subscription.id,
                        tenantId,
                        type,
                        periodStart,
                        periodEnd,
                        quantity: current,
                    },
                });
            }

            const limit = this.getLimitForType(type, limits);
            summaries.push({
                type,
                current: record.quantity,
                limit,
                percentage: limit > 0 ? Math.round((record.quantity / limit) * 100) : 0,
                isOverLimit: record.quantity >= limit,
            });
        }

        return summaries;
    }

    async getUsageHistory(tenantId: string, months: number = 6) {
        const subscription = await this.prisma.subscription.findUnique({
            where: { tenantId },
        });

        if (!subscription) {
            return [];
        }

        const startDate = new Date();
        startDate.setMonth(startDate.getMonth() - months);

        return this.prisma.usageRecord.findMany({
            where: {
                subscriptionId: subscription.id,
                periodStart: { gte: startDate },
            },
            orderBy: { periodStart: "desc" },
        });
    }

    async getEntitlements(tenantId: string): Promise<Entitlements> {
        const subscription = await this.prisma.subscription.findUnique({
            where: { tenantId },
        });

        // Default to free plan if no subscription
        const plan = subscription?.plan || PlanType.FREE;

        const planDef = await this.prisma.planDefinition.findUnique({
            where: { plan },
        });

        const limits = {
            maxUsers: subscription?.maxUsers ?? planDef?.maxUsers ?? 1,
            maxPosts: subscription?.maxPosts ?? planDef?.maxPosts ?? 10,
            maxStorage: subscription?.maxStorage ?? planDef?.maxStorage ?? 100,
            maxPlatforms: subscription?.maxPlatforms ?? planDef?.maxPlatforms ?? 1,
        };

        // Get current usage
        const [userCount, postCount, platformCount, storageUsed] = await Promise.all([
            this.prisma.userTenantRole.count({ where: { tenantId } }),
            this.getPostsThisMonth(tenantId),
            this.prisma.socialConnection.count({ where: { tenantId, isActive: true } }),
            this.getStorageUsed(tenantId),
        ]);

        const usage = {
            users: userCount,
            posts: postCount,
            storage: storageUsed,
            platforms: platformCount,
        };

        return {
            plan,
            limits,
            usage,
            features: planDef?.features || [],
            canPublish: postCount < limits.maxPosts,
            canAddUser: userCount < limits.maxUsers,
            canConnectPlatform: platformCount < limits.maxPlatforms,
            canUpload: storageUsed < limits.maxStorage,
        };
    }

    async incrementUsage(tenantId: string, type: UsageType, amount: number = 1): Promise<void> {
        const subscription = await this.prisma.subscription.findUnique({
            where: { tenantId },
        });

        if (!subscription) {
            this.logger.warn(`No subscription found for tenant ${tenantId}`);
            return;
        }

        const periodStart = subscription.currentPeriodStart || new Date(new Date().setDate(1));
        const periodEnd = subscription.currentPeriodEnd || new Date(new Date().setMonth(new Date().getMonth() + 1, 0));

        await this.prisma.usageRecord.upsert({
            where: {
                subscriptionId_type_periodStart: {
                    subscriptionId: subscription.id,
                    type,
                    periodStart,
                },
            },
            create: {
                subscriptionId: subscription.id,
                tenantId,
                type,
                periodStart,
                periodEnd,
                quantity: amount,
            },
            update: {
                quantity: { increment: amount },
            },
        });

        this.logger.debug(`Incremented ${type} usage for tenant ${tenantId} by ${amount}`);
    }

    async checkLimit(tenantId: string, type: UsageType): Promise<{ allowed: boolean; current: number; limit: number }> {
        const entitlements = await this.getEntitlements(tenantId);

        let current: number;
        let limit: number;

        switch (type) {
            case UsageType.POSTS_PUBLISHED:
                current = entitlements.usage.posts;
                limit = entitlements.limits.maxPosts;
                break;
            case UsageType.TEAM_MEMBERS:
                current = entitlements.usage.users;
                limit = entitlements.limits.maxUsers;
                break;
            case UsageType.PLATFORMS_CONNECTED:
                current = entitlements.usage.platforms;
                limit = entitlements.limits.maxPlatforms;
                break;
            case UsageType.STORAGE_MB:
                current = entitlements.usage.storage;
                limit = entitlements.limits.maxStorage;
                break;
            default:
                current = 0;
                limit = Infinity;
        }

        return {
            allowed: current < limit,
            current,
            limit,
        };
    }

    private async calculateUsage(
        tenantId: string,
        type: UsageType,
        periodStart: Date,
        _periodEnd: Date
    ): Promise<number> {
        switch (type) {
            case UsageType.POSTS_PUBLISHED:
                return this.prisma.contentItem.count({
                    where: {
                        tenantId,
                        state: "PUBLISHED",
                        publishedAt: { gte: periodStart },
                    },
                });
            case UsageType.TEAM_MEMBERS:
                return this.prisma.userTenantRole.count({ where: { tenantId } });
            case UsageType.PLATFORMS_CONNECTED:
                return this.prisma.socialConnection.count({
                    where: { tenantId, isActive: true },
                });
            case UsageType.STORAGE_MB:
                return this.getStorageUsed(tenantId);
            case UsageType.AI_GENERATIONS:
                // Would track AI API calls - placeholder
                return 0;
            default:
                return 0;
        }
    }

    private async getPostsThisMonth(tenantId: string): Promise<number> {
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        return this.prisma.contentItem.count({
            where: {
                tenantId,
                state: "PUBLISHED",
                publishedAt: { gte: startOfMonth },
            },
        });
    }

    private async getStorageUsed(tenantId: string): Promise<number> {
        const result = await this.prisma.mediaAsset.aggregate({
            where: { tenantId },
            _sum: { size: true },
        });
        // Convert bytes to MB
        return Math.round((result._sum.size || 0) / (1024 * 1024));
    }

    private getLimitForType(
        type: UsageType,
        limits: { maxUsers: number; maxPosts: number; maxStorage: number; maxPlatforms: number }
    ): number {
        switch (type) {
            case UsageType.POSTS_PUBLISHED:
                return limits.maxPosts;
            case UsageType.TEAM_MEMBERS:
                return limits.maxUsers;
            case UsageType.PLATFORMS_CONNECTED:
                return limits.maxPlatforms;
            case UsageType.STORAGE_MB:
                return limits.maxStorage;
            case UsageType.AI_GENERATIONS:
                return 1000; // Default AI generation limit
            default:
                return Infinity;
        }
    }
}
