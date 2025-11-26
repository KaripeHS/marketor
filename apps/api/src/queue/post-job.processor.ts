import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { Worker, Job } from "bullmq";
import Redis from "ioredis";
import { PrismaService } from "../prisma/prisma.service";
import { CryptoService } from "../crypto/crypto.service";
import { RateLimitService } from "../ratelimit/ratelimit.service";
import { PostJobStatus, Platform } from "@prisma/client";
import { PostJobData, JobResult } from "./queue.service";

@Injectable()
export class PostJobProcessor implements OnModuleInit {
    private readonly logger = new Logger(PostJobProcessor.name);
    private worker: Worker<PostJobData, JobResult> | null = null;
    private redisConnection: Redis | null = null;

    constructor(
        private readonly prisma: PrismaService,
        private readonly crypto: CryptoService,
        private readonly rateLimit: RateLimitService
    ) {}

    async onModuleInit() {
        const redisUrl = process.env.REDIS_URL;
        if (!redisUrl) {
            this.logger.warn("REDIS_URL not configured - worker disabled");
            return;
        }

        try {
            this.redisConnection = new Redis(redisUrl, {
                maxRetriesPerRequest: null,
                enableReadyCheck: false,
            });

            this.worker = new Worker<PostJobData, JobResult>(
                "post-jobs",
                async (job: Job<PostJobData>) => this.processJob(job),
                {
                    connection: this.redisConnection,
                    concurrency: 5,
                    limiter: {
                        max: 10,
                        duration: 60000, // 10 jobs per minute per platform
                    },
                }
            );

            this.worker.on("completed", (job, result) => {
                this.logger.log(`Job ${job.id} completed: ${result.success ? "success" : "failed"}`);
            });

            this.worker.on("failed", (job, error) => {
                this.logger.error(`Job ${job?.id} failed:`, error.message);
            });

            this.worker.on("error", (error) => {
                this.logger.error("Worker error:", error.message);
            });

            this.logger.log("Post job worker initialized");
        } catch (error) {
            this.logger.error("Failed to initialize worker:", error);
        }
    }

    async onModuleDestroy() {
        if (this.worker) {
            await this.worker.close();
        }
        if (this.redisConnection) {
            await this.redisConnection.quit();
        }
    }

    private async processJob(job: Job<PostJobData>): Promise<JobResult> {
        const { jobId, contentId, tenantId, platform } = job.data;
        this.logger.log(`Processing job ${jobId} for ${platform}`);

        // Update database job status to processing
        await this.prisma.postJob.update({
            where: { id: jobId },
            data: {
                status: PostJobStatus.PROCESSING,
                attempts: { increment: 1 },
            },
        });

        try {
            // Get content and connection
            const [content, connection] = await Promise.all([
                this.prisma.contentItem.findUnique({ where: { id: contentId } }),
                this.prisma.socialConnection.findFirst({
                    where: { tenantId, platform: platform as Platform, isActive: true },
                }),
            ]);

            if (!content) {
                throw new Error("Content not found");
            }
            if (!connection) {
                throw new Error(`No active ${platform} connection found`);
            }

            // Check token expiry
            if (connection.tokenExpiry && connection.tokenExpiry < new Date()) {
                throw new Error("Access token expired - please reconnect the account");
            }

            // Check rate limits before making API call
            if (!this.rateLimit.canMakeRequest(platform as Platform, tenantId)) {
                const waitTime = this.rateLimit.getWaitTime(platform as Platform, tenantId);
                const waitMinutes = Math.ceil(waitTime / 60000);
                throw new Error(
                    `Rate limit exceeded for ${platform}. Try again in ${waitMinutes} minute(s).`
                );
            }

            // Decrypt tokens for API calls
            const decryptedConnection = {
                ...connection,
                accessToken: this.crypto.decrypt(connection.accessToken),
                refreshToken: connection.refreshToken
                    ? this.crypto.decrypt(connection.refreshToken)
                    : null,
            };

            // Publish to platform
            const result = await this.publishToPlatform(
                platform as Platform,
                decryptedConnection,
                content
            );

            // Record API request for rate limiting
            this.rateLimit.recordRequest(platform as Platform, tenantId);

            // Create publish result
            await this.prisma.publishResult.create({
                data: {
                    postJobId: jobId,
                    platform: platform as Platform,
                    platformPostId: result.platformPostId,
                    platformUrl: result.platformUrl,
                    publishedAt: new Date(),
                    meta: {
                        contentId: content.id,
                        publishedVia: "marketor-worker",
                    },
                },
            });

            // Update job status to completed
            await this.prisma.postJob.update({
                where: { id: jobId },
                data: { status: PostJobStatus.COMPLETED },
            });

            // Update content state
            await this.prisma.contentItem.update({
                where: { id: contentId },
                data: { state: "PUBLISHED", publishedAt: new Date() },
            });

            return {
                success: true,
                platformPostId: result.platformPostId,
                platformUrl: result.platformUrl,
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Unknown error";

            // Get current job state for attempt count
            const dbJob = await this.prisma.postJob.findUnique({ where: { id: jobId } });
            const attempts = dbJob?.attempts || 1;
            const maxAttempts = dbJob?.maxAttempts || 3;

            // Update job status
            await this.prisma.postJob.update({
                where: { id: jobId },
                data: {
                    status: attempts >= maxAttempts ? PostJobStatus.FAILED : PostJobStatus.PENDING,
                    lastError: errorMessage,
                },
            });

            // If max attempts not reached, throw to trigger BullMQ retry
            if (attempts < maxAttempts) {
                throw new Error(errorMessage);
            }

            return {
                success: false,
                error: errorMessage,
            };
        }
    }

    private async publishToPlatform(
        platform: Platform,
        _connection: { accessToken: string; accountId: string },
        content: { id: string; caption?: string | null; mediaUrl?: string | null; title?: string | null }
    ): Promise<{ platformPostId: string; platformUrl: string }> {
        // In production, this would call actual platform APIs using _connection.accessToken
        // For now, return mock responses

        switch (platform) {
            case "TIKTOK":
                return this.mockTikTokPublish(content);
            case "INSTAGRAM":
                return this.mockInstagramPublish(content);
            case "YOUTUBE":
            case "YOUTUBE_SHORT":
                return this.mockYouTubePublish(platform, content);
            case "FACEBOOK":
                return this.mockFacebookPublish(content);
            default:
                throw new Error(`Unsupported platform: ${platform}`);
        }
    }

    private async mockTikTokPublish(content: { id: string }): Promise<{ platformPostId: string; platformUrl: string }> {
        // Simulate API call delay
        await this.delay(1000);
        const postId = `tiktok_${Date.now()}_${content.id.slice(-6)}`;
        return {
            platformPostId: postId,
            platformUrl: `https://www.tiktok.com/@account/video/${postId}`,
        };
    }

    private async mockInstagramPublish(content: { id: string }): Promise<{ platformPostId: string; platformUrl: string }> {
        await this.delay(1000);
        const postId = `ig_${Date.now()}_${content.id.slice(-6)}`;
        return {
            platformPostId: postId,
            platformUrl: `https://www.instagram.com/p/${postId}/`,
        };
    }

    private async mockYouTubePublish(
        platform: Platform,
        content: { id: string }
    ): Promise<{ platformPostId: string; platformUrl: string }> {
        await this.delay(1500);
        const videoId = `yt_${content.id.slice(-11)}`;
        const isShort = platform === "YOUTUBE_SHORT";
        return {
            platformPostId: videoId,
            platformUrl: isShort
                ? `https://www.youtube.com/shorts/${videoId}`
                : `https://www.youtube.com/watch?v=${videoId}`,
        };
    }

    private async mockFacebookPublish(content: { id: string }): Promise<{ platformPostId: string; platformUrl: string }> {
        await this.delay(800);
        const postId = `fb_${Date.now()}_${content.id.slice(-6)}`;
        return {
            platformPostId: postId,
            platformUrl: `https://www.facebook.com/watch/?v=${postId}`,
        };
    }

    private delay(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
}
