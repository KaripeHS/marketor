import { Injectable, Logger } from "@nestjs/common";
import { Platform } from "@prisma/client";
import {
    PlatformPublisher,
    PlatformConnection,
    PublishContent,
    PublishResult,
} from "./publisher.interface";

interface PinterestPinResponse {
    id?: string;
    link?: string;
}

interface PinterestErrorResponse {
    code?: number;
    message?: string;
}

interface PinterestBoardResponse {
    items?: Array<{
        id: string;
        name: string;
    }>;
}

@Injectable()
export class PinterestPublisher implements PlatformPublisher {
    private readonly logger = new Logger(PinterestPublisher.name);
    readonly platform = Platform.PINTEREST;

    validateContent(content: PublishContent): { valid: boolean; errors: string[] } {
        const errors: string[] = [];

        // Pinterest requires an image or video
        if (!content.mediaUrl) {
            errors.push("Pinterest pins require an image or video");
        }

        // Title/caption constraints
        if (content.title && content.title.length > 100) {
            errors.push("Pinterest pin title must be 100 characters or less");
        }

        if (content.caption && content.caption.length > 500) {
            errors.push("Pinterest pin description must be 500 characters or less");
        }

        // Video format check
        if (content.format === "LONG_VIDEO") {
            errors.push("Pinterest does not support long-form videos (max 15 minutes)");
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
            // Get or use default board
            const boardId = await this.getDefaultBoardId(connection);
            if (!boardId) {
                return {
                    success: false,
                    error: "No Pinterest board available. Please create a board first.",
                };
            }

            const isVideo = content.format === "SHORT_VIDEO";

            // Create the pin
            const pinData: Record<string, unknown> = {
                board_id: boardId,
                media_source: isVideo
                    ? {
                        source_type: "video_id",
                        cover_image_url: content.thumbnailUrl || content.mediaUrl,
                        media_id: await this.uploadVideo(connection, content),
                    }
                    : {
                        source_type: "image_url",
                        url: content.mediaUrl,
                    },
            };

            // Add title if provided
            if (content.title) {
                pinData.title = content.title;
            }

            // Add description
            if (content.caption) {
                pinData.description = content.caption;
            }

            // Add alt text for accessibility
            if (content.caption) {
                pinData.alt_text = content.caption.substring(0, 500);
            }

            const response = await fetch("https://api.pinterest.com/v5/pins", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${connection.accessToken}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(pinData),
            });

            if (!response.ok) {
                const errorData = (await response.json()) as PinterestErrorResponse;
                throw new Error(errorData.message || `HTTP ${response.status}`);
            }

            const data = (await response.json()) as PinterestPinResponse;

            if (!data.id) {
                throw new Error("No pin ID returned from Pinterest");
            }

            // Construct pin URL
            const pinUrl = `https://www.pinterest.com/pin/${data.id}`;

            return {
                success: true,
                platformPostId: data.id,
                platformUrl: pinUrl,
                metadata: { boardId, format: content.format },
            };
        } catch (error) {
            const message = error instanceof Error ? error.message : "Unknown error";
            this.logger.error(`Pinterest publish error: ${message}`);
            return {
                success: false,
                error: `Pinterest publish failed: ${message}`,
            };
        }
    }

    private async getDefaultBoardId(connection: PlatformConnection): Promise<string | null> {
        try {
            // Get user's boards
            const response = await fetch(
                "https://api.pinterest.com/v5/boards?page_size=1",
                {
                    headers: {
                        "Authorization": `Bearer ${connection.accessToken}`,
                    },
                }
            );

            if (!response.ok) {
                return null;
            }

            const data = (await response.json()) as PinterestBoardResponse;

            if (data.items && data.items.length > 0) {
                return data.items[0].id;
            }

            return null;
        } catch (error) {
            this.logger.error("Failed to get Pinterest boards:", error);
            return null;
        }
    }

    private async uploadVideo(
        connection: PlatformConnection,
        content: PublishContent
    ): Promise<string> {
        // Step 1: Register media upload
        const registerResponse = await fetch(
            "https://api.pinterest.com/v5/media",
            {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${connection.accessToken}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    media_type: "video",
                }),
            }
        );

        if (!registerResponse.ok) {
            throw new Error(`Failed to register video upload: ${registerResponse.status}`);
        }

        const registerData = (await registerResponse.json()) as {
            media_id?: string;
            upload_url?: string;
        };

        if (!registerData.media_id || !registerData.upload_url) {
            throw new Error("Failed to get video upload URL");
        }

        // Step 2: Upload the video file
        const videoResponse = await fetch(content.mediaUrl!);
        const videoBuffer = await videoResponse.arrayBuffer();

        const uploadResponse = await fetch(registerData.upload_url, {
            method: "PUT",
            headers: {
                "Content-Type": "video/mp4",
            },
            body: videoBuffer,
        });

        if (!uploadResponse.ok) {
            throw new Error(`Failed to upload video: ${uploadResponse.status}`);
        }

        // Step 3: Wait for video processing (simplified - production would poll status)
        await this.waitForVideoProcessing(connection, registerData.media_id);

        return registerData.media_id;
    }

    private async waitForVideoProcessing(
        connection: PlatformConnection,
        mediaId: string,
        maxAttempts = 30
    ): Promise<void> {
        for (let i = 0; i < maxAttempts; i++) {
            const statusResponse = await fetch(
                `https://api.pinterest.com/v5/media/${mediaId}`,
                {
                    headers: {
                        "Authorization": `Bearer ${connection.accessToken}`,
                    },
                }
            );

            if (statusResponse.ok) {
                const statusData = (await statusResponse.json()) as { status?: string };
                if (statusData.status === "succeeded") {
                    return;
                }
                if (statusData.status === "failed") {
                    throw new Error("Video processing failed");
                }
            }

            // Wait 2 seconds before next check
            await new Promise(resolve => setTimeout(resolve, 2000));
        }

        throw new Error("Video processing timed out");
    }
}
