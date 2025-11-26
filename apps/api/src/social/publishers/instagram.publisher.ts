import { Injectable, Logger } from "@nestjs/common";
import { Platform } from "@prisma/client";
import {
    PlatformPublisher,
    PlatformConnection,
    PublishContent,
    PublishResult,
} from "./publisher.interface";

interface IGMediaContainerResponse {
    id?: string;
    error?: {
        message: string;
        type: string;
        code: number;
    };
}

interface IGPublishResponse {
    id?: string;
    error?: {
        message: string;
        type: string;
        code: number;
    };
}

interface IGContainerStatusResponse {
    status_code?: string;
    status?: string;
    error?: {
        message: string;
    };
}

@Injectable()
export class InstagramPublisher implements PlatformPublisher {
    private readonly logger = new Logger(InstagramPublisher.name);
    readonly platform = Platform.INSTAGRAM;

    validateContent(content: PublishContent): { valid: boolean; errors: string[] } {
        const errors: string[] = [];

        if (!content.mediaUrl) {
            errors.push("Instagram requires a media URL");
        }

        if (content.caption && content.caption.length > 2200) {
            errors.push("Instagram caption must be 2200 characters or less");
        }

        // Instagram has specific aspect ratio requirements
        // Video: 4:5 to 1.91:1 aspect ratio, 3-60 seconds for feed, up to 60 min for IGTV
        // Image: Must be JPEG format, 1:1 to 1.91:1 aspect ratio

        return { valid: errors.length === 0, errors };
    }

    async publish(connection: PlatformConnection, content: PublishContent): Promise<PublishResult> {
        const validation = this.validateContent(content);
        if (!validation.valid) {
            return {
                success: false,
                error: validation.errors.join("; "),
            };
        }

        try {
            // Instagram Content Publishing API uses a 2-step process:
            // 1. Create a media container
            // 2. Publish the container

            const isVideo = content.format === "SHORT_VIDEO" || content.format === "LONG_VIDEO";
            const isCarousel = content.format === "CAROUSEL";
            const isReel = content.format === "SHORT_VIDEO";

            let containerId: string;

            if (isCarousel) {
                // Carousel posts require creating child containers first
                containerId = await this.createCarouselContainer(connection, content);
            } else if (isReel) {
                containerId = await this.createReelContainer(connection, content);
            } else if (isVideo) {
                containerId = await this.createVideoContainer(connection, content);
            } else {
                containerId = await this.createImageContainer(connection, content);
            }

            // Wait for container to be ready
            const isReady = await this.waitForContainer(connection, containerId);
            if (!isReady) {
                return {
                    success: false,
                    error: "Instagram media processing timed out",
                };
            }

            // Publish the container
            const publishResponse = await fetch(
                `https://graph.facebook.com/v18.0/${connection.accountId}/media_publish`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/x-www-form-urlencoded" },
                    body: new URLSearchParams({
                        creation_id: containerId,
                        access_token: connection.accessToken,
                    }),
                }
            );

            const publishData = (await publishResponse.json()) as IGPublishResponse;

            if (publishData.error) {
                this.logger.error(`Instagram publish error: ${publishData.error.message}`);
                return {
                    success: false,
                    error: `Instagram error: ${publishData.error.message}`,
                };
            }

            const mediaId = publishData.id;
            if (!mediaId) {
                return {
                    success: false,
                    error: "Failed to get media ID from Instagram",
                };
            }

            // Get the permalink for the post
            const permalink = await this.getMediaPermalink(connection, mediaId);

            return {
                success: true,
                platformPostId: mediaId,
                platformUrl: permalink || `https://www.instagram.com/p/${mediaId}/`,
                metadata: { containerId, format: content.format },
            };
        } catch (error) {
            const message = error instanceof Error ? error.message : "Unknown error";
            this.logger.error(`Instagram publish error: ${message}`);
            return {
                success: false,
                error: `Instagram publish failed: ${message}`,
            };
        }
    }

    private async createImageContainer(
        connection: PlatformConnection,
        content: PublishContent
    ): Promise<string> {
        const params = new URLSearchParams({
            image_url: content.mediaUrl!,
            access_token: connection.accessToken,
        });

        if (content.caption) {
            params.set("caption", content.caption);
        }

        const response = await fetch(
            `https://graph.facebook.com/v18.0/${connection.accountId}/media`,
            {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                body: params,
            }
        );

        const data = (await response.json()) as IGMediaContainerResponse;
        if (data.error) {
            throw new Error(`Failed to create image container: ${data.error.message}`);
        }

        return data.id!;
    }

    private async createVideoContainer(
        connection: PlatformConnection,
        content: PublishContent
    ): Promise<string> {
        const params = new URLSearchParams({
            video_url: content.mediaUrl!,
            media_type: "VIDEO",
            access_token: connection.accessToken,
        });

        if (content.caption) {
            params.set("caption", content.caption);
        }

        if (content.thumbnailUrl) {
            params.set("thumb_offset", "0");
        }

        const response = await fetch(
            `https://graph.facebook.com/v18.0/${connection.accountId}/media`,
            {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                body: params,
            }
        );

        const data = (await response.json()) as IGMediaContainerResponse;
        if (data.error) {
            throw new Error(`Failed to create video container: ${data.error.message}`);
        }

        return data.id!;
    }

    private async createReelContainer(
        connection: PlatformConnection,
        content: PublishContent
    ): Promise<string> {
        const params = new URLSearchParams({
            video_url: content.mediaUrl!,
            media_type: "REELS",
            access_token: connection.accessToken,
        });

        if (content.caption) {
            params.set("caption", content.caption);
        }

        if (content.thumbnailUrl) {
            params.set("cover_url", content.thumbnailUrl);
        }

        // Share to feed by default
        params.set("share_to_feed", "true");

        const response = await fetch(
            `https://graph.facebook.com/v18.0/${connection.accountId}/media`,
            {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                body: params,
            }
        );

        const data = (await response.json()) as IGMediaContainerResponse;
        if (data.error) {
            throw new Error(`Failed to create reel container: ${data.error.message}`);
        }

        return data.id!;
    }

    private async createCarouselContainer(
        _connection: PlatformConnection,
        _content: PublishContent
    ): Promise<string> {
        // For carousel, mediaUrl should be a JSON array of URLs
        // This is a simplified implementation - real implementation would need carousel items
        throw new Error("Carousel publishing not yet implemented");
    }

    private async waitForContainer(
        connection: PlatformConnection,
        containerId: string,
        maxAttempts = 60,
        intervalMs = 5000
    ): Promise<boolean> {
        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            const response = await fetch(
                `https://graph.facebook.com/v18.0/${containerId}?fields=status_code,status&access_token=${connection.accessToken}`
            );

            const data = (await response.json()) as IGContainerStatusResponse;

            if (data.error) {
                this.logger.warn(`Instagram container status error: ${data.error.message}`);
                return false;
            }

            const status = data.status_code || data.status;

            if (status === "FINISHED") {
                return true;
            }

            if (status === "ERROR" || status === "EXPIRED") {
                this.logger.error(`Instagram container failed: ${status}`);
                return false;
            }

            // Status is IN_PROGRESS
            this.logger.debug(`Instagram container status: ${status}, waiting...`);
            await this.delay(intervalMs);
        }

        this.logger.warn("Instagram container polling timed out");
        return false;
    }

    private async getMediaPermalink(
        connection: PlatformConnection,
        mediaId: string
    ): Promise<string | null> {
        try {
            const response = await fetch(
                `https://graph.facebook.com/v18.0/${mediaId}?fields=permalink&access_token=${connection.accessToken}`
            );
            const data = (await response.json()) as { permalink?: string };
            return data.permalink || null;
        } catch {
            return null;
        }
    }

    private delay(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
}
