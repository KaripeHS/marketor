import { Injectable, Logger } from "@nestjs/common";
import { Platform } from "@prisma/client";
import {
    PlatformPublisher,
    PlatformConnection,
    PublishContent,
    PublishResult,
} from "./publisher.interface";

interface TwitterResponse {
    data?: {
        id: string;
        text: string;
    };
    errors?: Array<{
        message: string;
        type: string;
    }>;
}

interface TwitterMediaResponse {
    media_id_string?: string;
    error?: string;
}

@Injectable()
export class TwitterPublisher implements PlatformPublisher {
    private readonly logger = new Logger(TwitterPublisher.name);
    readonly platform = Platform.TWITTER;

    validateContent(content: PublishContent): { valid: boolean; errors: string[] } {
        const errors: string[] = [];

        // Twitter/X character limits
        if (content.caption && content.caption.length > 280) {
            errors.push("Tweet must be 280 characters or less");
        }

        // At least some content required
        if (!content.caption && !content.mediaUrl) {
            errors.push("Tweet requires either text or media");
        }

        // Video constraints
        if (content.format === "LONG_VIDEO") {
            errors.push("Twitter does not support long-form videos in standard posts");
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
            // If there's media, upload it first
            let mediaId: string | undefined;
            if (content.mediaUrl) {
                mediaId = await this.uploadMedia(connection, content);
            }

            // Create the tweet
            const tweetData: Record<string, unknown> = {};
            if (content.caption) {
                tweetData.text = content.caption;
            }
            if (mediaId) {
                tweetData.media = { media_ids: [mediaId] };
            }

            const response = await fetch("https://api.twitter.com/2/tweets", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${connection.accessToken}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(tweetData),
            });

            const data = (await response.json()) as TwitterResponse;

            if (data.errors) {
                throw new Error(data.errors.map(e => e.message).join(", "));
            }

            if (!data.data?.id) {
                throw new Error("No tweet ID returned from Twitter");
            }

            const tweetUrl = `https://twitter.com/${connection.accountId || "i"}/status/${data.data.id}`;

            return {
                success: true,
                platformPostId: data.data.id,
                platformUrl: tweetUrl,
                metadata: { format: content.format },
            };
        } catch (error) {
            const message = error instanceof Error ? error.message : "Unknown error";
            this.logger.error(`Twitter publish error: ${message}`);
            return {
                success: false,
                error: `Twitter publish failed: ${message}`,
            };
        }
    }

    private async uploadMedia(
        connection: PlatformConnection,
        content: PublishContent
    ): Promise<string> {
        const isVideo = content.format === "SHORT_VIDEO";

        // Twitter v1.1 media upload API (still used for media)
        const uploadUrl = "https://upload.twitter.com/1.1/media/upload.json";

        if (isVideo) {
            // Video upload requires chunked upload
            return this.uploadChunkedMedia(connection, content);
        }

        // Simple image upload via URL
        const params = new URLSearchParams({
            media_data: content.mediaUrl!, // For URL uploads, may need to fetch and encode
        });

        const response = await fetch(uploadUrl, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${connection.accessToken}`,
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: params,
        });

        const data = (await response.json()) as TwitterMediaResponse;

        if (data.error) {
            throw new Error(`Twitter media upload error: ${data.error}`);
        }

        if (!data.media_id_string) {
            throw new Error("No media ID returned from Twitter");
        }

        return data.media_id_string;
    }

    private async uploadChunkedMedia(
        connection: PlatformConnection,
        content: PublishContent
    ): Promise<string> {
        // Chunked upload for videos
        // This is a simplified version - production would need proper chunked upload

        const uploadUrl = "https://upload.twitter.com/1.1/media/upload.json";

        // INIT
        const initResponse = await fetch(uploadUrl, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${connection.accessToken}`,
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: new URLSearchParams({
                command: "INIT",
                media_type: "video/mp4",
                media_category: "tweet_video",
            }),
        });

        const initData = (await initResponse.json()) as { media_id_string?: string };

        if (!initData.media_id_string) {
            throw new Error("Failed to initialize video upload");
        }

        const mediaId = initData.media_id_string;

        // APPEND - in production, this would fetch the video and upload in chunks
        // For now, use the media_url approach
        await fetch(uploadUrl, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${connection.accessToken}`,
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: new URLSearchParams({
                command: "APPEND",
                media_id: mediaId,
                segment_index: "0",
                media_data: content.mediaUrl!, // Would need base64 encoding in production
            }),
        });

        // FINALIZE
        const finalizeResponse = await fetch(uploadUrl, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${connection.accessToken}`,
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: new URLSearchParams({
                command: "FINALIZE",
                media_id: mediaId,
            }),
        });

        const finalizeData = (await finalizeResponse.json()) as { media_id_string?: string; error?: string };

        if (finalizeData.error) {
            throw new Error(`Twitter video finalize error: ${finalizeData.error}`);
        }

        return mediaId;
    }
}
