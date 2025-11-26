import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CryptoService } from "../crypto/crypto.service";
import { Platform, PostJobStatus } from "@prisma/client";

interface CreateConnectionDto {
    platform: Platform;
    accountId: string;
    accountName?: string;
    accessToken: string;
    refreshToken?: string;
    tokenExpiry?: Date;
    scopes?: string[];
}

interface CreatePostJobDto {
    contentId: string;
    platform: Platform;
    scheduledFor: Date;
}

@Injectable()
export class SocialService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly crypto: CryptoService
    ) { }

    // Social Connections

    async listConnections(tenantId: string) {
        return this.prisma.socialConnection.findMany({
            where: { tenantId },
            orderBy: { createdAt: "desc" },
        });
    }

    async getConnection(id: string) {
        const connection = await this.prisma.socialConnection.findUnique({
            where: { id },
        });
        if (!connection) throw new NotFoundException("Connection not found");
        return connection;
    }

    async getConnectionWithDecryptedTokens(id: string) {
        const connection = await this.getConnection(id);
        return {
            ...connection,
            accessToken: this.crypto.decrypt(connection.accessToken),
            refreshToken: connection.refreshToken
                ? this.crypto.decrypt(connection.refreshToken)
                : null,
        };
    }

    async getActiveConnectionForPlatform(tenantId: string, platform: Platform) {
        const connection = await this.prisma.socialConnection.findFirst({
            where: { tenantId, platform, isActive: true },
        });
        if (!connection) return null;
        return {
            ...connection,
            accessToken: this.crypto.decrypt(connection.accessToken),
            refreshToken: connection.refreshToken
                ? this.crypto.decrypt(connection.refreshToken)
                : null,
        };
    }

    async createConnection(tenantId: string, dto: CreateConnectionDto) {
        // Encrypt tokens before storing
        const encryptedAccessToken = this.crypto.encrypt(dto.accessToken);
        const encryptedRefreshToken = dto.refreshToken
            ? this.crypto.encrypt(dto.refreshToken)
            : undefined;

        return this.prisma.socialConnection.upsert({
            where: {
                tenantId_platform_accountId: {
                    tenantId,
                    platform: dto.platform,
                    accountId: dto.accountId,
                },
            },
            update: {
                accountName: dto.accountName,
                accessToken: encryptedAccessToken,
                refreshToken: encryptedRefreshToken,
                tokenExpiry: dto.tokenExpiry,
                scopes: dto.scopes || [],
                isActive: true,
            },
            create: {
                tenantId,
                platform: dto.platform,
                accountId: dto.accountId,
                accountName: dto.accountName,
                accessToken: encryptedAccessToken,
                refreshToken: encryptedRefreshToken,
                tokenExpiry: dto.tokenExpiry,
                scopes: dto.scopes || [],
            },
        });
    }

    async disconnectPlatform(id: string) {
        const connection = await this.getConnection(id);
        return this.prisma.socialConnection.update({
            where: { id: connection.id },
            data: { isActive: false },
        });
    }

    async deleteConnection(id: string) {
        await this.getConnection(id);
        return this.prisma.socialConnection.delete({ where: { id } });
    }

    async refreshToken(id: string) {
        const connection = await this.getConnection(id);

        // Mock token refresh - in production, call platform APIs
        const newExpiry = new Date();
        newExpiry.setDate(newExpiry.getDate() + 60);

        return this.prisma.socialConnection.update({
            where: { id: connection.id },
            data: {
                tokenExpiry: newExpiry,
                lastSyncAt: new Date(),
            },
        });
    }

    // Post Jobs

    async listPostJobs(tenantId: string, status?: PostJobStatus) {
        return this.prisma.postJob.findMany({
            where: {
                tenantId,
                ...(status && { status }),
            },
            include: { publishResult: true },
            orderBy: { scheduledFor: "asc" },
        });
    }

    async getPostJob(id: string) {
        const job = await this.prisma.postJob.findUnique({
            where: { id },
            include: { publishResult: true },
        });
        if (!job) throw new NotFoundException("Post job not found");
        return job;
    }

    async createPostJob(tenantId: string, dto: CreatePostJobDto) {
        // Verify content exists
        const content = await this.prisma.contentItem.findUnique({
            where: { id: dto.contentId },
        });
        if (!content) throw new NotFoundException("Content not found");
        if (content.tenantId !== tenantId) {
            throw new BadRequestException("Content does not belong to this tenant");
        }

        // Verify platform connection exists
        const connection = await this.prisma.socialConnection.findFirst({
            where: {
                tenantId,
                platform: dto.platform,
                isActive: true,
            },
        });
        if (!connection) {
            throw new BadRequestException(`No active ${dto.platform} connection found`);
        }

        return this.prisma.postJob.create({
            data: {
                tenantId,
                contentId: dto.contentId,
                platform: dto.platform,
                scheduledFor: dto.scheduledFor,
            },
        });
    }

    async cancelPostJob(id: string) {
        const job = await this.getPostJob(id);
        if (job.status !== PostJobStatus.PENDING) {
            throw new BadRequestException("Only pending jobs can be cancelled");
        }
        return this.prisma.postJob.update({
            where: { id },
            data: { status: PostJobStatus.CANCELLED },
        });
    }

    async retryPostJob(id: string) {
        const job = await this.getPostJob(id);
        if (job.status !== PostJobStatus.FAILED) {
            throw new BadRequestException("Only failed jobs can be retried");
        }
        return this.prisma.postJob.update({
            where: { id },
            data: {
                status: PostJobStatus.PENDING,
                attempts: 0,
                lastError: null,
            },
        });
    }

    // Worker methods (called by scheduler)

    async getPendingJobs(limit: number = 10) {
        const now = new Date();
        return this.prisma.postJob.findMany({
            where: {
                status: PostJobStatus.PENDING,
                scheduledFor: { lte: now },
            },
            take: limit,
            orderBy: { scheduledFor: "asc" },
        });
    }

    async processJob(jobId: string) {
        const job = await this.prisma.postJob.update({
            where: { id: jobId },
            data: {
                status: PostJobStatus.PROCESSING,
                attempts: { increment: 1 },
            },
        });

        try {
            // Get content and connection
            const [content, connection] = await Promise.all([
                this.prisma.contentItem.findUnique({ where: { id: job.contentId } }),
                this.prisma.socialConnection.findFirst({
                    where: { tenantId: job.tenantId, platform: job.platform, isActive: true },
                }),
            ]);

            if (!content || !connection) {
                throw new Error("Content or connection not found");
            }

            // Mock publish - in production, call platform APIs
            const result = await this.mockPublish(job.platform, content);

            // Create publish result
            await this.prisma.publishResult.create({
                data: {
                    postJobId: job.id,
                    platform: job.platform,
                    platformPostId: result.postId,
                    platformUrl: result.url,
                    publishedAt: new Date(),
                    meta: result.meta,
                },
            });

            // Update job status
            await this.prisma.postJob.update({
                where: { id: job.id },
                data: { status: PostJobStatus.COMPLETED },
            });

            // Update content state
            await this.prisma.contentItem.update({
                where: { id: content.id },
                data: { state: "PUBLISHED", publishedAt: new Date() },
            });

            return { success: true, jobId: job.id };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Unknown error";

            // Check if max attempts reached
            const updatedJob = await this.prisma.postJob.update({
                where: { id: job.id },
                data: {
                    status: job.attempts >= job.maxAttempts ? PostJobStatus.FAILED : PostJobStatus.PENDING,
                    lastError: errorMessage,
                },
            });

            return { success: false, jobId: job.id, error: errorMessage, willRetry: updatedJob.status === PostJobStatus.PENDING };
        }
    }

    private async mockPublish(platform: Platform, content: { id: string; caption?: string | null }) {
        // Simulate network delay
        await new Promise((resolve) => setTimeout(resolve, 500));

        // Mock responses by platform
        const mockIds: Record<Platform, string> = {
            TIKTOK: `tiktok_${Date.now()}`,
            INSTAGRAM: `ig_${Date.now()}`,
            YOUTUBE: `yt_${Date.now()}`,
            YOUTUBE_SHORT: `yts_${Date.now()}`,
            FACEBOOK: `fb_${Date.now()}`,
            TWITTER: `tw_${Date.now()}`,
            LINKEDIN: `li_${Date.now()}`,
            PINTEREST: `pin_${Date.now()}`,
        };

        const mockUrls: Record<Platform, string> = {
            TIKTOK: `https://tiktok.com/@mock/video/${mockIds.TIKTOK}`,
            INSTAGRAM: `https://instagram.com/p/${mockIds.INSTAGRAM}`,
            YOUTUBE: `https://youtube.com/watch?v=${mockIds.YOUTUBE}`,
            YOUTUBE_SHORT: `https://youtube.com/shorts/${mockIds.YOUTUBE_SHORT}`,
            FACEBOOK: `https://facebook.com/posts/${mockIds.FACEBOOK}`,
            TWITTER: `https://twitter.com/i/status/${mockIds.TWITTER}`,
            LINKEDIN: `https://linkedin.com/feed/update/${mockIds.LINKEDIN}`,
            PINTEREST: `https://pinterest.com/pin/${mockIds.PINTEREST}`,
        };

        return {
            postId: mockIds[platform],
            url: mockUrls[platform],
            meta: {
                contentId: content.id,
                caption: content.caption?.substring(0, 100),
                publishedVia: "marketor",
            },
        };
    }

    // Stats

    async getJobStats(tenantId: string) {
        const [pending, processing, completed, failed] = await Promise.all([
            this.prisma.postJob.count({ where: { tenantId, status: PostJobStatus.PENDING } }),
            this.prisma.postJob.count({ where: { tenantId, status: PostJobStatus.PROCESSING } }),
            this.prisma.postJob.count({ where: { tenantId, status: PostJobStatus.COMPLETED } }),
            this.prisma.postJob.count({ where: { tenantId, status: PostJobStatus.FAILED } }),
        ]);

        return { pending, processing, completed, failed, total: pending + processing + completed + failed };
    }
}
