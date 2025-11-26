import { Platform } from "@prisma/client";

export interface PublishContent {
    id: string;
    caption?: string | null;
    title?: string | null;
    script?: string | null; // Description/script content
    mediaUrl?: string | null;
    format?: string | null; // ContentFormat from Prisma (VIDEO_SHORT, VIDEO_LONG, IMAGE, etc.)
    thumbnailUrl?: string | null;
    hashtags?: string[];
}

export interface PublishResult {
    success: boolean;
    platformPostId?: string;
    platformUrl?: string;
    error?: string;
    metadata?: Record<string, unknown>;
}

export interface PlatformConnection {
    accessToken: string;
    refreshToken?: string | null;
    accountId: string;
    accountName?: string | null;
    scopes?: string[];
}

export interface PlatformPublisher {
    platform: Platform;
    publish(connection: PlatformConnection, content: PublishContent): Promise<PublishResult>;
    validateContent(content: PublishContent): { valid: boolean; errors: string[] };
}
