import { Injectable, Logger } from "@nestjs/common";
import { Platform } from "@prisma/client";
import {
    PlatformPublisher,
    PlatformConnection,
    PublishContent,
    PublishResult,
} from "./publisher.interface";

interface LinkedInPostResponse {
    id?: string;
    activity?: string;
}

interface LinkedInErrorResponse {
    message?: string;
    status?: number;
    serviceErrorCode?: number;
}

interface LinkedInMediaResponse {
    value?: {
        uploadMechanism?: {
            "com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest"?: {
                uploadUrl: string;
            };
        };
        asset?: string;
    };
}

@Injectable()
export class LinkedInPublisher implements PlatformPublisher {
    private readonly logger = new Logger(LinkedInPublisher.name);
    readonly platform = Platform.LINKEDIN;

    validateContent(content: PublishContent): { valid: boolean; errors: string[] } {
        const errors: string[] = [];

        // LinkedIn character limit for posts
        if (content.caption && content.caption.length > 3000) {
            errors.push("LinkedIn post must be 3,000 characters or less");
        }

        // Text is required for LinkedIn posts
        if (!content.caption && !content.mediaUrl) {
            errors.push("LinkedIn posts require text or media");
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
            // LinkedIn uses URN format for author: urn:li:person:{id} or urn:li:organization:{id}
            const authorUrn = this.getAuthorUrn(connection);

            let mediaAsset: string | undefined;
            if (content.mediaUrl) {
                mediaAsset = await this.uploadMedia(connection, content);
            }

            // Create the post using UGC Post API
            const postData: Record<string, unknown> = {
                author: authorUrn,
                lifecycleState: "PUBLISHED",
                specificContent: {
                    "com.linkedin.ugc.ShareContent": {
                        shareCommentary: {
                            text: content.caption || "",
                        },
                        shareMediaCategory: mediaAsset ? (this.isVideo(content) ? "VIDEO" : "IMAGE") : "NONE",
                        ...(mediaAsset && {
                            media: [{
                                status: "READY",
                                media: mediaAsset,
                                title: {
                                    text: content.title || "",
                                },
                            }],
                        }),
                    },
                },
                visibility: {
                    "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC",
                },
            };

            const response = await fetch("https://api.linkedin.com/v2/ugcPosts", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${connection.accessToken}`,
                    "Content-Type": "application/json",
                    "X-Restli-Protocol-Version": "2.0.0",
                },
                body: JSON.stringify(postData),
            });

            if (!response.ok) {
                const errorData = (await response.json()) as LinkedInErrorResponse;
                throw new Error(errorData.message || `HTTP ${response.status}`);
            }

            const data = (await response.json()) as LinkedInPostResponse;

            // Extract post ID from URN
            const postId = data.id?.split(":").pop() || data.id;

            if (!postId) {
                throw new Error("No post ID returned from LinkedIn");
            }

            // LinkedIn post URLs - activity URN to URL
            const postUrl = `https://www.linkedin.com/feed/update/${data.id}`;

            return {
                success: true,
                platformPostId: postId,
                platformUrl: postUrl,
                metadata: { authorUrn, format: content.format },
            };
        } catch (error) {
            const message = error instanceof Error ? error.message : "Unknown error";
            this.logger.error(`LinkedIn publish error: ${message}`);
            return {
                success: false,
                error: `LinkedIn publish failed: ${message}`,
            };
        }
    }

    private getAuthorUrn(connection: PlatformConnection): string {
        // accountId should be the person or organization ID
        const isOrganization = connection.scopes?.includes("w_organization_social");
        if (isOrganization) {
            return `urn:li:organization:${connection.accountId}`;
        }
        return `urn:li:person:${connection.accountId}`;
    }

    private isVideo(content: PublishContent): boolean {
        return content.format === "SHORT_VIDEO" || content.format === "LONG_VIDEO";
    }

    private async uploadMedia(
        connection: PlatformConnection,
        content: PublishContent
    ): Promise<string> {
        const authorUrn = this.getAuthorUrn(connection);
        const isVideo = this.isVideo(content);

        // Step 1: Register the upload
        const registerData = {
            registerUploadRequest: {
                recipes: [isVideo ? "urn:li:digitalmediaRecipe:feedshare-video" : "urn:li:digitalmediaRecipe:feedshare-image"],
                owner: authorUrn,
                serviceRelationships: [{
                    relationshipType: "OWNER",
                    identifier: "urn:li:userGeneratedContent",
                }],
            },
        };

        const registerResponse = await fetch(
            "https://api.linkedin.com/v2/assets?action=registerUpload",
            {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${connection.accessToken}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(registerData),
            }
        );

        if (!registerResponse.ok) {
            throw new Error(`Failed to register upload: ${registerResponse.status}`);
        }

        const registerResult = (await registerResponse.json()) as LinkedInMediaResponse;
        const uploadUrl = registerResult.value?.uploadMechanism?.[
            "com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest"
        ]?.uploadUrl;
        const asset = registerResult.value?.asset;

        if (!uploadUrl || !asset) {
            throw new Error("Failed to get upload URL from LinkedIn");
        }

        // Step 2: Upload the media
        // Fetch the media from URL and upload to LinkedIn
        const mediaResponse = await fetch(content.mediaUrl!);
        const mediaBuffer = await mediaResponse.arrayBuffer();

        const uploadResponse = await fetch(uploadUrl, {
            method: "PUT",
            headers: {
                "Authorization": `Bearer ${connection.accessToken}`,
                "Content-Type": isVideo ? "video/mp4" : "image/jpeg",
            },
            body: mediaBuffer,
        });

        if (!uploadResponse.ok) {
            throw new Error(`Failed to upload media: ${uploadResponse.status}`);
        }

        return asset;
    }
}
