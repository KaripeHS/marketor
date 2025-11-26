import { Injectable, Logger } from "@nestjs/common";
import { Platform } from "@prisma/client";
import {
    PlatformPublisher,
    PlatformConnection,
    PublishContent,
    PublishResult,
} from "./publisher.interface";

interface FacebookPostResponse {
    id?: string;
    error?: {
        message: string;
        type: string;
        code: number;
    };
}

interface FacebookVideoResponse {
    id?: string;
    error?: {
        message: string;
        type: string;
        code: number;
    };
}

// Note: FacebookUploadSessionResponse would be used for resumable uploads
// Currently using simpler URL-based uploads

@Injectable()
export class FacebookPublisher implements PlatformPublisher {
    private readonly logger = new Logger(FacebookPublisher.name);
    readonly platform = Platform.FACEBOOK;

    validateContent(content: PublishContent): { valid: boolean; errors: string[] } {
        const errors: string[] = [];

        // Facebook allows text-only posts, images, or videos
        if (!content.caption && !content.mediaUrl) {
            errors.push("Facebook posts require either text or media");
        }

        if (content.caption && content.caption.length > 63206) {
            errors.push("Facebook post text must be 63,206 characters or less");
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
            // accountId is the Page ID for Facebook publishing
            const pageId = connection.accountId;

            // Get page access token (user token gives us page tokens)
            const pageToken = await this.getPageAccessToken(connection, pageId);
            if (!pageToken) {
                return {
                    success: false,
                    error: "Failed to get page access token",
                };
            }

            let postId: string;

            const isVideo = content.format === "SHORT_VIDEO" || content.format === "LONG_VIDEO";
            const isImage = content.format === "IMAGE";

            if (isVideo) {
                postId = await this.publishVideo(pageId, pageToken, content);
            } else if (content.mediaUrl && isImage) {
                postId = await this.publishPhoto(pageId, pageToken, content);
            } else {
                postId = await this.publishTextPost(pageId, pageToken, content);
            }

            // Facebook post URLs are pageId_postId format
            const [, actualPostId] = postId.split("_");
            const postUrl = `https://www.facebook.com/${pageId}/posts/${actualPostId || postId}`;

            return {
                success: true,
                platformPostId: postId,
                platformUrl: postUrl,
                metadata: { pageId, format: content.format },
            };
        } catch (error) {
            const message = error instanceof Error ? error.message : "Unknown error";
            this.logger.error(`Facebook publish error: ${message}`);
            return {
                success: false,
                error: `Facebook publish failed: ${message}`,
            };
        }
    }

    private async getPageAccessToken(
        connection: PlatformConnection,
        pageId: string
    ): Promise<string | null> {
        try {
            // If the connection token is already a page token, use it directly
            // Otherwise, get page tokens from user token
            const response = await fetch(
                `https://graph.facebook.com/v18.0/${pageId}?fields=access_token&access_token=${connection.accessToken}`
            );

            const data = (await response.json()) as { access_token?: string; error?: { message: string } };

            if (data.error) {
                // Token might already be a page token
                return connection.accessToken;
            }

            return data.access_token || connection.accessToken;
        } catch {
            return connection.accessToken;
        }
    }

    private async publishTextPost(
        pageId: string,
        accessToken: string,
        content: PublishContent
    ): Promise<string> {
        const response = await fetch(`https://graph.facebook.com/v18.0/${pageId}/feed`, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
                message: content.caption || "",
                access_token: accessToken,
            }),
        });

        const data = (await response.json()) as FacebookPostResponse;

        if (data.error) {
            throw new Error(`Facebook post error: ${data.error.message}`);
        }

        if (!data.id) {
            throw new Error("No post ID returned from Facebook");
        }

        return data.id;
    }

    private async publishPhoto(
        pageId: string,
        accessToken: string,
        content: PublishContent
    ): Promise<string> {
        const params = new URLSearchParams({
            url: content.mediaUrl!,
            access_token: accessToken,
        });

        if (content.caption) {
            params.set("caption", content.caption);
        }

        const response = await fetch(`https://graph.facebook.com/v18.0/${pageId}/photos`, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: params,
        });

        const data = (await response.json()) as FacebookPostResponse;

        if (data.error) {
            throw new Error(`Facebook photo error: ${data.error.message}`);
        }

        if (!data.id) {
            throw new Error("No photo ID returned from Facebook");
        }

        return data.id;
    }

    private async publishVideo(
        pageId: string,
        accessToken: string,
        content: PublishContent
    ): Promise<string> {
        // For videos, use the resumable upload API or URL upload
        // URL upload is simpler for remote URLs

        const params = new URLSearchParams({
            file_url: content.mediaUrl!,
            access_token: accessToken,
        });

        if (content.caption) {
            params.set("description", content.caption);
        }

        if (content.title) {
            params.set("title", content.title);
        }

        const response = await fetch(`https://graph.facebook.com/v18.0/${pageId}/videos`, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: params,
        });

        const data = (await response.json()) as FacebookVideoResponse;

        if (data.error) {
            throw new Error(`Facebook video error: ${data.error.message}`);
        }

        if (!data.id) {
            throw new Error("No video ID returned from Facebook");
        }

        return data.id;
    }
}
