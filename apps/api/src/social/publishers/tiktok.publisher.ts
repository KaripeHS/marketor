import { Injectable, Logger } from "@nestjs/common";
import { Platform } from "@prisma/client";
import {
    PlatformPublisher,
    PlatformConnection,
    PublishContent,
    PublishResult,
} from "./publisher.interface";

interface TikTokUploadResponse {
    data?: {
        publish_id?: string;
        upload_url?: string;
    };
    error?: {
        code: string;
        message: string;
    };
}

interface TikTokPublishStatusResponse {
    data?: {
        status?: string;
        publicaly_available_post_id?: string[];
        fail_reason?: string;
    };
    error?: {
        code: string;
        message: string;
    };
}

@Injectable()
export class TikTokPublisher implements PlatformPublisher {
    private readonly logger = new Logger(TikTokPublisher.name);
    readonly platform = Platform.TIKTOK;

    validateContent(content: PublishContent): { valid: boolean; errors: string[] } {
        const errors: string[] = [];

        if (!content.mediaUrl) {
            errors.push("TikTok requires a video URL");
        }

        // TikTok only supports video content (SHORT_VIDEO or LONG_VIDEO formats)
        if (content.format && !["SHORT_VIDEO", "LONG_VIDEO"].includes(content.format)) {
            errors.push("TikTok only supports video content");
        }

        if (content.caption && content.caption.length > 2200) {
            errors.push("TikTok caption must be 2200 characters or less");
        }

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
            // TikTok uses a 3-step process:
            // 1. Initialize upload (get upload URL)
            // 2. Upload video to the URL
            // 3. Check publish status

            // Step 1: Initialize video upload with "PULL_FROM_URL" or direct upload
            const initResponse = await fetch(
                "https://open.tiktokapis.com/v2/post/publish/video/init/",
                {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${connection.accessToken}`,
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        post_info: {
                            title: content.caption?.slice(0, 150) || "",
                            description: content.caption || "",
                            disable_duet: false,
                            disable_comment: false,
                            disable_stitch: false,
                            privacy_level: "PUBLIC_TO_EVERYONE",
                        },
                        source_info: {
                            source: "PULL_FROM_URL",
                            video_url: content.mediaUrl,
                        },
                    }),
                }
            );

            const initData = (await initResponse.json()) as TikTokUploadResponse;

            if (initData.error) {
                this.logger.error(`TikTok init error: ${initData.error.message}`);
                return {
                    success: false,
                    error: `TikTok error: ${initData.error.message}`,
                };
            }

            const publishId = initData.data?.publish_id;
            if (!publishId) {
                return {
                    success: false,
                    error: "Failed to get publish ID from TikTok",
                };
            }

            // Step 2: Poll for publish status (TikTok processes async)
            const postId = await this.waitForPublish(connection.accessToken, publishId);

            if (!postId) {
                return {
                    success: false,
                    error: "TikTok video processing timed out or failed",
                };
            }

            return {
                success: true,
                platformPostId: postId,
                platformUrl: `https://www.tiktok.com/@${connection.accountId}/video/${postId}`,
                metadata: { publishId },
            };
        } catch (error) {
            const message = error instanceof Error ? error.message : "Unknown error";
            this.logger.error(`TikTok publish error: ${message}`);
            return {
                success: false,
                error: `TikTok publish failed: ${message}`,
            };
        }
    }

    private async waitForPublish(
        accessToken: string,
        publishId: string,
        maxAttempts = 30,
        intervalMs = 5000
    ): Promise<string | null> {
        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            const statusResponse = await fetch(
                "https://open.tiktokapis.com/v2/post/publish/status/fetch/",
                {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ publish_id: publishId }),
                }
            );

            const statusData = (await statusResponse.json()) as TikTokPublishStatusResponse;

            if (statusData.error) {
                this.logger.warn(`TikTok status check error: ${statusData.error.message}`);
                return null;
            }

            const status = statusData.data?.status;

            if (status === "PUBLISH_COMPLETE") {
                const postIds = statusData.data?.publicaly_available_post_id;
                return postIds && postIds.length > 0 ? postIds[0] : publishId;
            }

            if (status === "FAILED") {
                this.logger.error(`TikTok publish failed: ${statusData.data?.fail_reason}`);
                return null;
            }

            // Status is still PROCESSING_UPLOAD or PROCESSING_DOWNLOAD
            this.logger.debug(`TikTok status: ${status}, waiting...`);
            await this.delay(intervalMs);
        }

        this.logger.warn("TikTok publish status polling timed out");
        return null;
    }

    private delay(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
}
