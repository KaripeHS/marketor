import { Injectable } from "@nestjs/common";
import { InsightType, Platform } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

export interface InsightData {
    type: InsightType;
    category: string;
    insight: string;
    confidence: number;
    recommendation?: string;
    sampleSize: number;
    platforms: Platform[];
}

export interface LearningAnalysis {
    insights: InsightData[];
    bestPractices: string[];
    strategyRecommendations: string[];
    analyzedPosts: number;
    dateRange: { start: Date; end: Date };
}

interface PostAnalysisData {
    contentId: string;
    platform: Platform;
    publishedAt: Date;
    hour: number;
    dayOfWeek: number;
    format: string;
    hashtags: string[];
    titleLength: number;
    captionLength: number;
    views: number;
    engagementRate: number;
}

@Injectable()
export class LearningInsightsService {
    constructor(private readonly prisma: PrismaService) {}

    async analyzeAndGenerateInsights(
        tenantId: string,
        dateRange: { start: Date; end: Date }
    ): Promise<LearningAnalysis> {
        // Get content with metrics
        const postsData = await this.getPostsWithMetrics(tenantId, dateRange);

        if (postsData.length < 5) {
            return {
                insights: [],
                bestPractices: ["Need at least 5 published posts with metrics to generate insights"],
                strategyRecommendations: ["Continue publishing content to build data for analysis"],
                analyzedPosts: postsData.length,
                dateRange,
            };
        }

        const insights: InsightData[] = [];

        // Analyze timing patterns
        const timingInsight = this.analyzeTimingPatterns(postsData);
        if (timingInsight) insights.push(timingInsight);

        // Analyze format performance
        const formatInsight = this.analyzeFormatPerformance(postsData);
        if (formatInsight) insights.push(formatInsight);

        // Analyze hashtag effectiveness
        const hashtagInsights = this.analyzeHashtagEffectiveness(postsData);
        insights.push(...hashtagInsights);

        // Analyze content length
        const lengthInsight = this.analyzeContentLength(postsData);
        if (lengthInsight) insights.push(lengthInsight);

        // Analyze platform performance
        const platformInsight = this.analyzePlatformPerformance(postsData);
        if (platformInsight) insights.push(platformInsight);

        // Save insights to database
        await this.saveInsights(tenantId, insights, dateRange);

        // Generate best practices and recommendations
        const bestPractices = this.generateBestPractices(insights);
        const strategyRecommendations = this.generateStrategyRecommendations(insights, postsData);

        return {
            insights,
            bestPractices,
            strategyRecommendations,
            analyzedPosts: postsData.length,
            dateRange,
        };
    }

    private async getPostsWithMetrics(
        tenantId: string,
        dateRange: { start: Date; end: Date }
    ): Promise<PostAnalysisData[]> {
        const content = await this.prisma.contentItem.findMany({
            where: {
                tenantId,
                state: "PUBLISHED",
                publishedAt: {
                    gte: dateRange.start,
                    lte: dateRange.end,
                },
            },
            select: {
                id: true,
                platform: true,
                format: true,
                hashtags: true,
                title: true,
                caption: true,
                publishedAt: true,
            },
        });

        const results: PostAnalysisData[] = [];

        for (const post of content) {
            if (!post.publishedAt) continue;

            // Get latest metrics for this content
            const metrics = await this.prisma.contentMetrics.findFirst({
                where: { contentId: post.id },
                orderBy: { metricsDate: "desc" },
            });

            if (!metrics) continue;

            const publishedDate = new Date(post.publishedAt);

            results.push({
                contentId: post.id,
                platform: post.platform,
                publishedAt: publishedDate,
                hour: publishedDate.getHours(),
                dayOfWeek: publishedDate.getDay(),
                format: post.format,
                hashtags: post.hashtags,
                titleLength: post.title?.length || 0,
                captionLength: post.caption?.length || 0,
                views: metrics.views,
                engagementRate: metrics.engagementRate || 0,
            });
        }

        return results;
    }

    private analyzeTimingPatterns(posts: PostAnalysisData[]): InsightData | null {
        if (posts.length < 5) return null;

        // Group by hour and calculate average engagement
        const hourlyEngagement: Record<number, { total: number; count: number }> = {};

        for (const post of posts) {
            if (!hourlyEngagement[post.hour]) {
                hourlyEngagement[post.hour] = { total: 0, count: 0 };
            }
            hourlyEngagement[post.hour].total += post.engagementRate;
            hourlyEngagement[post.hour].count++;
        }

        // Find best hours (at least 2 posts)
        const validHours = Object.entries(hourlyEngagement)
            .filter(([, data]) => data.count >= 2)
            .map(([hour, data]) => ({
                hour: parseInt(hour),
                avgEngagement: data.total / data.count,
                count: data.count,
            }))
            .sort((a, b) => b.avgEngagement - a.avgEngagement);

        if (validHours.length === 0) return null;

        const bestHours = validHours.slice(0, 3);
        const confidence = Math.min(posts.length / 20, 1) * 0.8; // More posts = higher confidence

        const hourStr = bestHours.map((h) => this.formatHour(h.hour)).join(", ");

        return {
            type: "TIMING",
            category: "posting_time",
            insight: `Posts published at ${hourStr} have the highest engagement rates`,
            confidence,
            recommendation: `Schedule your most important content for ${this.formatHour(bestHours[0].hour)}`,
            sampleSize: posts.length,
            platforms: [...new Set(posts.map((p) => p.platform))],
        };
    }

    private analyzeFormatPerformance(posts: PostAnalysisData[]): InsightData | null {
        if (posts.length < 5) return null;

        const formatStats: Record<string, { totalEngagement: number; totalViews: number; count: number }> = {};

        for (const post of posts) {
            if (!formatStats[post.format]) {
                formatStats[post.format] = { totalEngagement: 0, totalViews: 0, count: 0 };
            }
            formatStats[post.format].totalEngagement += post.engagementRate;
            formatStats[post.format].totalViews += post.views;
            formatStats[post.format].count++;
        }

        const formats = Object.entries(formatStats)
            .filter(([, data]) => data.count >= 2)
            .map(([format, data]) => ({
                format,
                avgEngagement: data.totalEngagement / data.count,
                avgViews: data.totalViews / data.count,
                count: data.count,
            }))
            .sort((a, b) => b.avgEngagement - a.avgEngagement);

        if (formats.length === 0) return null;

        const bestFormat = formats[0];
        const confidence = Math.min(posts.length / 20, 1) * 0.75;

        return {
            type: "FORMAT",
            category: "content_format",
            insight: `${bestFormat.format.replace("_", " ")} content has ${bestFormat.avgEngagement.toFixed(1)}% average engagement rate, outperforming other formats`,
            confidence,
            recommendation: `Increase production of ${bestFormat.format.replace("_", " ").toLowerCase()} content`,
            sampleSize: posts.length,
            platforms: [...new Set(posts.map((p) => p.platform))],
        };
    }

    private analyzeHashtagEffectiveness(posts: PostAnalysisData[]): InsightData[] {
        const insights: InsightData[] = [];
        const hashtagStats: Record<string, { totalEngagement: number; count: number }> = {};

        for (const post of posts) {
            for (const hashtag of post.hashtags) {
                if (!hashtagStats[hashtag]) {
                    hashtagStats[hashtag] = { totalEngagement: 0, count: 0 };
                }
                hashtagStats[hashtag].totalEngagement += post.engagementRate;
                hashtagStats[hashtag].count++;
            }
        }

        const effectiveHashtags = Object.entries(hashtagStats)
            .filter(([, data]) => data.count >= 3)
            .map(([hashtag, data]) => ({
                hashtag,
                avgEngagement: data.totalEngagement / data.count,
                count: data.count,
            }))
            .sort((a, b) => b.avgEngagement - a.avgEngagement)
            .slice(0, 5);

        if (effectiveHashtags.length >= 3) {
            const topHashtags = effectiveHashtags.slice(0, 3).map((h) => h.hashtag).join(", ");
            insights.push({
                type: "HASHTAG",
                category: "effective_hashtags",
                insight: `Top performing hashtags: ${topHashtags}`,
                confidence: Math.min(posts.length / 30, 1) * 0.7,
                recommendation: `Continue using ${effectiveHashtags[0].hashtag} and similar hashtags`,
                sampleSize: posts.length,
                platforms: [...new Set(posts.map((p) => p.platform))],
            });
        }

        // Analyze hashtag count
        const hashtagCountStats: Record<string, { totalEngagement: number; count: number }> = {};
        for (const post of posts) {
            const bucket = this.getHashtagCountBucket(post.hashtags.length);
            if (!hashtagCountStats[bucket]) {
                hashtagCountStats[bucket] = { totalEngagement: 0, count: 0 };
            }
            hashtagCountStats[bucket].totalEngagement += post.engagementRate;
            hashtagCountStats[bucket].count++;
        }

        const bestBucket = Object.entries(hashtagCountStats)
            .filter(([, data]) => data.count >= 2)
            .map(([bucket, data]) => ({
                bucket,
                avgEngagement: data.totalEngagement / data.count,
            }))
            .sort((a, b) => b.avgEngagement - a.avgEngagement)[0];

        if (bestBucket) {
            insights.push({
                type: "HASHTAG",
                category: "hashtag_count",
                insight: `Posts with ${bestBucket.bucket} hashtags perform best`,
                confidence: Math.min(posts.length / 20, 1) * 0.65,
                recommendation: `Use ${bestBucket.bucket} hashtags per post`,
                sampleSize: posts.length,
                platforms: [...new Set(posts.map((p) => p.platform))],
            });
        }

        return insights;
    }

    private analyzeContentLength(posts: PostAnalysisData[]): InsightData | null {
        if (posts.length < 5) return null;

        // Analyze caption length
        const lengthBuckets: Record<string, { totalEngagement: number; count: number }> = {};

        for (const post of posts) {
            const bucket = this.getCaptionLengthBucket(post.captionLength);
            if (!lengthBuckets[bucket]) {
                lengthBuckets[bucket] = { totalEngagement: 0, count: 0 };
            }
            lengthBuckets[bucket].totalEngagement += post.engagementRate;
            lengthBuckets[bucket].count++;
        }

        const bestLength = Object.entries(lengthBuckets)
            .filter(([, data]) => data.count >= 2)
            .map(([bucket, data]) => ({
                bucket,
                avgEngagement: data.totalEngagement / data.count,
            }))
            .sort((a, b) => b.avgEngagement - a.avgEngagement)[0];

        if (!bestLength) return null;

        return {
            type: "LENGTH",
            category: "caption_length",
            insight: `${bestLength.bucket} captions achieve higher engagement`,
            confidence: Math.min(posts.length / 20, 1) * 0.6,
            recommendation: `Keep captions ${bestLength.bucket.toLowerCase()}`,
            sampleSize: posts.length,
            platforms: [...new Set(posts.map((p) => p.platform))],
        };
    }

    private analyzePlatformPerformance(posts: PostAnalysisData[]): InsightData | null {
        const platformStats: Record<Platform, { totalEngagement: number; totalViews: number; count: number }> = {} as never;

        for (const post of posts) {
            if (!platformStats[post.platform]) {
                platformStats[post.platform] = { totalEngagement: 0, totalViews: 0, count: 0 };
            }
            platformStats[post.platform].totalEngagement += post.engagementRate;
            platformStats[post.platform].totalViews += post.views;
            platformStats[post.platform].count++;
        }

        const platforms = Object.entries(platformStats)
            .filter(([, data]) => data.count >= 2)
            .map(([platform, data]) => ({
                platform: platform as Platform,
                avgEngagement: data.totalEngagement / data.count,
                avgViews: data.totalViews / data.count,
                count: data.count,
            }))
            .sort((a, b) => b.avgViews - a.avgViews);

        if (platforms.length < 2) return null;

        const best = platforms[0];

        return {
            type: "AUDIENCE",
            category: "platform_performance",
            insight: `${best.platform} drives the most views (avg ${Math.round(best.avgViews).toLocaleString()} per post)`,
            confidence: Math.min(posts.length / 20, 1) * 0.7,
            recommendation: `Prioritize ${best.platform} for reach-focused content`,
            sampleSize: posts.length,
            platforms: platforms.map((p) => p.platform),
        };
    }

    private async saveInsights(
        tenantId: string,
        insights: InsightData[],
        dateRange: { start: Date; end: Date }
    ): Promise<void> {
        for (const insight of insights) {
            await this.prisma.learningInsight.create({
                data: {
                    tenantId,
                    type: insight.type,
                    category: insight.category,
                    insight: insight.insight,
                    confidence: insight.confidence,
                    recommendation: insight.recommendation,
                    sampleSize: insight.sampleSize,
                    dateRange: { start: dateRange.start, end: dateRange.end },
                    platforms: insight.platforms,
                },
            });
        }
    }

    private generateBestPractices(insights: InsightData[]): string[] {
        const practices: string[] = [];

        for (const insight of insights) {
            if (insight.confidence >= 0.5 && insight.recommendation) {
                practices.push(insight.recommendation);
            }
        }

        return practices;
    }

    private generateStrategyRecommendations(insights: InsightData[], posts: PostAnalysisData[]): string[] {
        const recommendations: string[] = [];

        // Check posting frequency
        const dateSpan = posts.length > 0
            ? (posts[posts.length - 1].publishedAt.getTime() - posts[0].publishedAt.getTime()) / (1000 * 60 * 60 * 24)
            : 0;

        if (dateSpan > 0) {
            const postsPerWeek = (posts.length / dateSpan) * 7;
            if (postsPerWeek < 3) {
                recommendations.push("Consider increasing posting frequency to at least 3-5 posts per week");
            }
        }

        // Platform-specific recommendations based on insights
        const platformInsight = insights.find((i) => i.category === "platform_performance");
        if (platformInsight && platformInsight.platforms.length > 1) {
            recommendations.push(`Focus more resources on ${platformInsight.platforms[0]} based on performance data`);
        }

        // Content format recommendations
        const formatInsight = insights.find((i) => i.type === "FORMAT");
        if (formatInsight) {
            recommendations.push(`Allocate more content calendar slots for ${formatInsight.insight.split(" ")[0].toLowerCase()} content`);
        }

        return recommendations;
    }

    async getActiveInsights(tenantId: string, limit: number = 10): Promise<InsightData[]> {
        const insights = await this.prisma.learningInsight.findMany({
            where: {
                tenantId,
                isActive: true,
            },
            orderBy: [
                { confidence: "desc" },
                { createdAt: "desc" },
            ],
            take: limit,
        });

        return insights.map((i) => ({
            type: i.type,
            category: i.category,
            insight: i.insight,
            confidence: i.confidence,
            recommendation: i.recommendation || undefined,
            sampleSize: i.sampleSize,
            platforms: i.platforms,
        }));
    }

    private formatHour(hour: number): string {
        const ampm = hour >= 12 ? "PM" : "AM";
        const h = hour % 12 || 12;
        return `${h}${ampm}`;
    }

    private getHashtagCountBucket(count: number): string {
        if (count === 0) return "0";
        if (count <= 5) return "1-5";
        if (count <= 10) return "6-10";
        if (count <= 15) return "11-15";
        if (count <= 20) return "16-20";
        return "20+";
    }

    private getCaptionLengthBucket(length: number): string {
        if (length === 0) return "No caption";
        if (length <= 50) return "Very short (1-50 chars)";
        if (length <= 150) return "Short (51-150 chars)";
        if (length <= 300) return "Medium (151-300 chars)";
        if (length <= 500) return "Long (301-500 chars)";
        return "Very long (500+ chars)";
    }
}
