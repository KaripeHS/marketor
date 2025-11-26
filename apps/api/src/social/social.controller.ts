import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { ApiTags, ApiBearerAuth } from "@nestjs/swagger";
import { IsArray, IsDate, IsEnum, IsNotEmpty, IsOptional, IsString } from "class-validator";
import { Type } from "class-transformer";
import { Platform, PostJobStatus } from "@prisma/client";
import { SocialService } from "./social.service";
import { Auth } from "../auth/auth.decorator";
import { AuthContext } from "../auth/auth.types";
import { Roles } from "../auth/roles.decorator";
import { QueueService } from "../queue/queue.service";
import { SchedulerService } from "../queue/scheduler.service";
import { RateLimitService } from "../ratelimit/ratelimit.service";

class CreateConnectionDto {
    @IsEnum(Platform)
    platform!: Platform;

    @IsString()
    @IsNotEmpty()
    accountId!: string;

    @IsOptional()
    @IsString()
    accountName?: string;

    @IsString()
    @IsNotEmpty()
    accessToken!: string;

    @IsOptional()
    @IsString()
    refreshToken?: string;

    @IsOptional()
    @Type(() => Date)
    @IsDate()
    tokenExpiry?: Date;

    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    scopes?: string[];
}

class CreatePostJobDto {
    @IsString()
    @IsNotEmpty()
    contentId!: string;

    @IsEnum(Platform)
    platform!: Platform;

    @Type(() => Date)
    @IsDate()
    scheduledFor!: Date;
}

@ApiTags("social")
@ApiBearerAuth()
@Controller("social")
export class SocialController {
    constructor(
        private readonly socialService: SocialService,
        private readonly queueService: QueueService,
        private readonly schedulerService: SchedulerService,
        private readonly rateLimitService: RateLimitService
    ) { }

    // Connections

    @Get("connections")
    listConnections(@Auth() auth: AuthContext) {
        return this.socialService.listConnections(auth.tenantId);
    }

    @Get("connections/:id")
    getConnection(@Param("id") id: string) {
        return this.socialService.getConnection(id);
    }

    @Post("connections")
    @Roles("ADMIN", "AGENCY")
    createConnection(@Body() dto: CreateConnectionDto, @Auth() auth: AuthContext) {
        return this.socialService.createConnection(auth.tenantId, dto);
    }

    @Patch("connections/:id/disconnect")
    @Roles("ADMIN", "AGENCY")
    disconnectPlatform(@Param("id") id: string) {
        return this.socialService.disconnectPlatform(id);
    }

    @Delete("connections/:id")
    @Roles("ADMIN", "AGENCY")
    deleteConnection(@Param("id") id: string) {
        return this.socialService.deleteConnection(id);
    }

    @Post("connections/:id/refresh")
    @Roles("ADMIN", "AGENCY")
    refreshToken(@Param("id") id: string) {
        return this.socialService.refreshToken(id);
    }

    // Post Jobs

    @Get("jobs")
    listPostJobs(@Query("status") status: PostJobStatus, @Auth() auth: AuthContext) {
        return this.socialService.listPostJobs(auth.tenantId, status);
    }

    @Get("jobs/stats")
    getJobStats(@Auth() auth: AuthContext) {
        return this.socialService.getJobStats(auth.tenantId);
    }

    @Get("jobs/:id")
    getPostJob(@Param("id") id: string) {
        return this.socialService.getPostJob(id);
    }

    @Post("jobs")
    @Roles("ADMIN", "AGENCY", "CLIENT")
    createPostJob(@Body() dto: CreatePostJobDto, @Auth() auth: AuthContext) {
        return this.socialService.createPostJob(auth.tenantId, dto);
    }

    @Patch("jobs/:id/cancel")
    @Roles("ADMIN", "AGENCY")
    cancelPostJob(@Param("id") id: string) {
        return this.socialService.cancelPostJob(id);
    }

    @Patch("jobs/:id/retry")
    @Roles("ADMIN", "AGENCY")
    retryPostJob(@Param("id") id: string) {
        return this.socialService.retryPostJob(id);
    }

    // Worker endpoint (internal/cron use) - fallback if BullMQ not enabled
    @Post("jobs/process")
    @Roles("ADMIN")
    async processJobs() {
        // If BullMQ queue is enabled, jobs are processed by the worker
        if (this.queueService.isQueueEnabled()) {
            return { message: "Jobs are processed automatically by BullMQ worker", queueEnabled: true };
        }

        // Fallback: process via database polling
        const pendingJobs = await this.socialService.getPendingJobs(5);
        const results = await Promise.all(
            pendingJobs.map((job) => this.socialService.processJob(job.id))
        );
        return { processed: results.length, results, queueEnabled: false };
    }

    // Queue and scheduler stats
    @Get("queue/stats")
    @Roles("ADMIN")
    async getQueueStats() {
        return this.schedulerService.getSchedulerStats();
    }

    @Post("queue/pause")
    @Roles("ADMIN")
    async pauseQueue() {
        await this.queueService.pauseQueue();
        return { message: "Queue paused" };
    }

    @Post("queue/resume")
    @Roles("ADMIN")
    async resumeQueue() {
        await this.queueService.resumeQueue();
        return { message: "Queue resumed" };
    }

    // Rate limit endpoints
    @Get("ratelimits")
    getRateLimits(@Auth() auth: AuthContext) {
        return this.rateLimitService.getAllStatus(auth.tenantId);
    }

    @Get("ratelimits/configs")
    getRateLimitConfigs() {
        return this.rateLimitService.getAllConfigs();
    }

    @Get("ratelimits/:platform")
    getRateLimitForPlatform(
        @Param("platform") platform: Platform,
        @Auth() auth: AuthContext
    ) {
        return this.rateLimitService.getStatus(platform, auth.tenantId);
    }

    @Post("ratelimits/:platform/reset")
    @Roles("ADMIN")
    resetRateLimit(
        @Param("platform") platform: Platform,
        @Auth() auth: AuthContext
    ) {
        this.rateLimitService.resetBucket(platform, auth.tenantId);
        return { message: `Rate limit reset for ${platform}` };
    }
}
