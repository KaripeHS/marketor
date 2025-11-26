import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from "@nestjs/common";
import { Queue, Worker, Job, QueueEvents } from "bullmq";
import Redis from "ioredis";

export interface PostJobData {
    jobId: string;
    contentId: string;
    tenantId: string;
    platform: string;
    scheduledFor: Date | null;
    connectionId: string;
}

export interface JobResult {
    success: boolean;
    platformPostId?: string;
    platformUrl?: string;
    error?: string;
}

@Injectable()
export class QueueService implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(QueueService.name);
    private connection: Redis | null = null;
    private postQueue: Queue<PostJobData> | null = null;
    private postWorker: Worker<PostJobData, JobResult> | null = null;
    private queueEvents: QueueEvents | null = null;
    private isEnabled = false;

    async onModuleInit() {
        const redisUrl = process.env.REDIS_URL;
        if (!redisUrl) {
            this.logger.warn("REDIS_URL not configured - queue processing disabled");
            return;
        }

        try {
            this.connection = new Redis(redisUrl, {
                maxRetriesPerRequest: null,
                enableReadyCheck: false,
            });

            this.connection.on("error", (err) => {
                this.logger.error("Redis connection error:", err.message);
            });

            this.connection.on("connect", () => {
                this.logger.log("Connected to Redis");
            });

            this.postQueue = new Queue<PostJobData>("post-jobs", {
                connection: this.connection,
                defaultJobOptions: {
                    attempts: 3,
                    backoff: {
                        type: "exponential",
                        delay: 60000, // 1 minute initial delay
                    },
                    removeOnComplete: {
                        age: 86400, // Keep completed jobs for 24 hours
                        count: 1000, // Keep last 1000 completed jobs
                    },
                    removeOnFail: {
                        age: 604800, // Keep failed jobs for 7 days
                    },
                },
            });

            this.queueEvents = new QueueEvents("post-jobs", {
                connection: this.connection,
            });

            this.isEnabled = true;
            this.logger.log("Queue service initialized successfully");
        } catch (error) {
            this.logger.error("Failed to initialize queue service:", error);
        }
    }

    async onModuleDestroy() {
        await this.shutdown();
    }

    async shutdown() {
        if (this.postWorker) {
            await this.postWorker.close();
            this.postWorker = null;
        }
        if (this.queueEvents) {
            await this.queueEvents.close();
            this.queueEvents = null;
        }
        if (this.postQueue) {
            await this.postQueue.close();
            this.postQueue = null;
        }
        if (this.connection) {
            await this.connection.quit();
            this.connection = null;
        }
        this.isEnabled = false;
    }

    isQueueEnabled(): boolean {
        return this.isEnabled;
    }

    getQueue(): Queue<PostJobData> | null {
        return this.postQueue;
    }

    async addPostJob(data: PostJobData): Promise<Job<PostJobData> | null> {
        if (!this.postQueue) {
            this.logger.warn("Queue not available - job not added");
            return null;
        }

        const jobOptions: { delay?: number; jobId: string } = {
            jobId: data.jobId,
        };

        // Calculate delay if scheduled for future
        if (data.scheduledFor) {
            const scheduledTime = new Date(data.scheduledFor).getTime();
            const now = Date.now();
            if (scheduledTime > now) {
                jobOptions.delay = scheduledTime - now;
            }
        }

        const job = await this.postQueue.add("publish", data, jobOptions);
        this.logger.log(`Added post job ${data.jobId} for platform ${data.platform}`);
        return job;
    }

    async removePostJob(jobId: string): Promise<boolean> {
        if (!this.postQueue) {
            return false;
        }

        const job = await this.postQueue.getJob(jobId);
        if (job) {
            await job.remove();
            this.logger.log(`Removed post job ${jobId}`);
            return true;
        }
        return false;
    }

    async getJobStatus(jobId: string): Promise<{
        state: string;
        progress: number;
        attemptsMade: number;
        failedReason?: string;
    } | null> {
        if (!this.postQueue) {
            return null;
        }

        const job = await this.postQueue.getJob(jobId);
        if (!job) {
            return null;
        }

        const state = await job.getState();
        return {
            state,
            progress: job.progress as number,
            attemptsMade: job.attemptsMade,
            failedReason: job.failedReason,
        };
    }

    async getQueueStats(): Promise<{
        waiting: number;
        active: number;
        completed: number;
        failed: number;
        delayed: number;
    } | null> {
        if (!this.postQueue) {
            return null;
        }

        const [waiting, active, completed, failed, delayed] = await Promise.all([
            this.postQueue.getWaitingCount(),
            this.postQueue.getActiveCount(),
            this.postQueue.getCompletedCount(),
            this.postQueue.getFailedCount(),
            this.postQueue.getDelayedCount(),
        ]);

        return { waiting, active, completed, failed, delayed };
    }

    async retryJob(jobId: string): Promise<boolean> {
        if (!this.postQueue) {
            return false;
        }

        const job = await this.postQueue.getJob(jobId);
        if (job) {
            await job.retry();
            this.logger.log(`Retried post job ${jobId}`);
            return true;
        }
        return false;
    }

    async pauseQueue(): Promise<void> {
        if (this.postQueue) {
            await this.postQueue.pause();
            this.logger.log("Queue paused");
        }
    }

    async resumeQueue(): Promise<void> {
        if (this.postQueue) {
            await this.postQueue.resume();
            this.logger.log("Queue resumed");
        }
    }

    async drainQueue(): Promise<void> {
        if (this.postQueue) {
            await this.postQueue.drain();
            this.logger.log("Queue drained");
        }
    }
}
