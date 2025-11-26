import { Injectable, Logger } from "@nestjs/common";
import { Platform } from "@prisma/client";
import {
    PlatformPublisher,
    PlatformConnection,
    PublishContent,
    PublishResult,
} from "./publisher.interface";

interface YouTubeVideoResponse {
    id?: string;
    snippet?: {
        title: string;
        description: string;
    };
    status?: {
        uploadStatus: string;
        privacyStatus: string;
    };
    error?: {
        message: string;
        code: number;
    };
}

interface YouTubeUploadUrlResponse {
    kind?: string;
    error?: {
        message: string;
        code: number;
    };
}

@Injectable()
export class YouTubePublisher implements PlatformPublisher {
    private readonly logger = new Logger(YouTubePublisher.name);
    readonly platform: Platform = Platform.YOUTUBE;

    validateContent(content: PublishContent): { valid: boolean; errors: string[] } {
        const errors: string[] = [];

        if (!content.mediaUrl) {
            errors.push("YouTube requires a video URL");
        }

        // YouTube only supports video content
        if (content.format && !["SHORT_VIDEO", "LONG_VIDEO"].includes(content.format)) {
            errors.push("YouTube only supports video content");
        }

        if (!content.title) {
            errors.push("YouTube videos require a title");
        }

        if (content.title && content.title.length > 100) {
            errors.push("YouTube title must be 100 characters or less");
        }

        // Use script as description
        if (content.script && content.script.length > 5000) {
            errors.push("YouTube description must be 5000 characters or less");
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
            // YouTube Data API v3 requires uploading the video file directly
            // For remote URLs, we need to download first then upload
            // This implementation uses resumable uploads for reliability

            // Step 1: Get resumable upload URL
            const uploadUrl = await this.initializeResumableUpload(connection, content);

            if (!uploadUrl) {
                return {
                    success: false,
                    error: "Failed to initialize YouTube upload",
                };
            }

            // Step 2: Download video from URL and upload to YouTube
            const videoId = await this.uploadVideoFromUrl(uploadUrl, content.mediaUrl!);

            if (!videoId) {
                return {
                    success: false,
                    error: "Failed to upload video to YouTube",
                };
            }

            // Determine URL format based on whether this is a Short
            const isShort = this.isYouTubeShort(content);
            const videoUrl = isShort
                ? `https://www.youtube.com/shorts/${videoId}`
                : `https://www.youtube.com/watch?v=${videoId}`;

            return {
                success: true,
                platformPostId: videoId,
                platformUrl: videoUrl,
                metadata: { isShort },
            };
        } catch (error) {
            const message = error instanceof Error ? error.message : "Unknown error";
            this.logger.error(`YouTube publish error: ${message}`);
            return {
                success: false,
                error: `YouTube publish failed: ${message}`,
            };
        }
    }

    private async initializeResumableUpload(
        connection: PlatformConnection,
        content: PublishContent
    ): Promise<string | null> {
        const metadata = {
            snippet: {
                title: content.title || "Untitled Video",
                description: content.script || content.caption || "",
                tags: content.hashtags || [],
                categoryId: "22", // People & Blogs
            },
            status: {
                privacyStatus: "public",
                selfDeclaredMadeForKids: false,
            },
        };

        // If this is a Short, we'd set different parameters
        if (this.isYouTubeShort(content)) {
            // YouTube Shorts are automatically detected based on aspect ratio and duration
            // No special API flag needed
        }

        const response = await fetch(
            "https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status",
            {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${connection.accessToken}`,
                    "Content-Type": "application/json",
                    "X-Upload-Content-Type": "video/*",
                },
                body: JSON.stringify(metadata),
            }
        );

        if (!response.ok) {
            const error = (await response.json()) as YouTubeUploadUrlResponse;
            this.logger.error(`YouTube upload init error: ${error.error?.message}`);
            return null;
        }

        // The upload URL is returned in the Location header
        return response.headers.get("Location");
    }

    private async uploadVideoFromUrl(uploadUrl: string, videoUrl: string): Promise<string | null> {
        try {
            // Download video from source URL
            const videoResponse = await fetch(videoUrl);
            if (!videoResponse.ok) {
                throw new Error(`Failed to download video: ${videoResponse.status}`);
            }

            const videoBuffer = await videoResponse.arrayBuffer();
            const contentType = videoResponse.headers.get("Content-Type") || "video/mp4";

            // Upload to YouTube
            const uploadResponse = await fetch(uploadUrl, {
                method: "PUT",
                headers: {
                    "Content-Type": contentType,
                    "Content-Length": videoBuffer.byteLength.toString(),
                },
                body: videoBuffer,
            });

            if (!uploadResponse.ok) {
                const error = (await uploadResponse.json()) as YouTubeVideoResponse;
                throw new Error(`Upload failed: ${error.error?.message}`);
            }

            const videoData = (await uploadResponse.json()) as YouTubeVideoResponse;
            return videoData.id || null;
        } catch (error) {
            const message = error instanceof Error ? error.message : "Unknown error";
            this.logger.error(`YouTube video upload error: ${message}`);
            return null;
        }
    }

    protected isYouTubeShort(content: PublishContent): boolean {
        // YouTube Shorts are short-form vertical videos (60 seconds or less)
        // Use SHORT_VIDEO format as indicator
        return content.format === "SHORT_VIDEO";
    }
}

@Injectable()
export class YouTubeShortPublisher extends YouTubePublisher {
    override readonly platform = Platform.YOUTUBE_SHORT;

    override validateContent(content: PublishContent): { valid: boolean; errors: string[] } {
        const baseValidation = super.validateContent(content);

        // Additional validation for Shorts
        // Shorts should be <= 60 seconds and vertical
        // In production, we'd validate video dimensions/duration

        return baseValidation;
    }

    protected override isYouTubeShort(_content: PublishContent): boolean {
        return true;
    }
}
