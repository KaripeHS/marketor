import { Injectable, Logger } from "@nestjs/common";
import { Platform } from "@prisma/client";
import {
    PlatformPublisher,
    PlatformConnection,
    PublishContent,
    PublishResult,
} from "./publisher.interface";
import { TikTokPublisher } from "./tiktok.publisher";
import { InstagramPublisher } from "./instagram.publisher";
import { YouTubePublisher, YouTubeShortPublisher } from "./youtube.publisher";
import { FacebookPublisher } from "./facebook.publisher";
import { TwitterPublisher } from "./twitter.publisher";
import { LinkedInPublisher } from "./linkedin.publisher";
import { PinterestPublisher } from "./pinterest.publisher";

@Injectable()
export class PublisherService {
    private readonly logger = new Logger(PublisherService.name);
    private readonly publishers: Map<Platform, PlatformPublisher>;

    constructor(
        tiktokPublisher: TikTokPublisher,
        instagramPublisher: InstagramPublisher,
        youtubePublisher: YouTubePublisher,
        youtubeShortPublisher: YouTubeShortPublisher,
        facebookPublisher: FacebookPublisher,
        twitterPublisher: TwitterPublisher,
        linkedinPublisher: LinkedInPublisher,
        pinterestPublisher: PinterestPublisher
    ) {
        this.publishers = new Map<Platform, PlatformPublisher>();
        this.publishers.set(Platform.TIKTOK, tiktokPublisher);
        this.publishers.set(Platform.INSTAGRAM, instagramPublisher);
        this.publishers.set(Platform.YOUTUBE, youtubePublisher);
        this.publishers.set(Platform.YOUTUBE_SHORT, youtubeShortPublisher);
        this.publishers.set(Platform.FACEBOOK, facebookPublisher);
        this.publishers.set(Platform.TWITTER, twitterPublisher);
        this.publishers.set(Platform.LINKEDIN, linkedinPublisher);
        this.publishers.set(Platform.PINTEREST, pinterestPublisher);
    }

    getPublisher(platform: Platform): PlatformPublisher | undefined {
        return this.publishers.get(platform);
    }

    getSupportedPlatforms(): Platform[] {
        return Array.from(this.publishers.keys());
    }

    isSupported(platform: Platform): boolean {
        return this.publishers.has(platform);
    }

    validateContent(platform: Platform, content: PublishContent): { valid: boolean; errors: string[] } {
        const publisher = this.publishers.get(platform);
        if (!publisher) {
            return { valid: false, errors: [`Unsupported platform: ${platform}`] };
        }
        return publisher.validateContent(content);
    }

    async publish(
        platform: Platform,
        connection: PlatformConnection,
        content: PublishContent
    ): Promise<PublishResult> {
        const publisher = this.publishers.get(platform);
        if (!publisher) {
            return {
                success: false,
                error: `Unsupported platform: ${platform}`,
            };
        }

        this.logger.log(`Publishing to ${platform} for account ${connection.accountId}`);

        try {
            const result = await publisher.publish(connection, content);

            if (result.success) {
                this.logger.log(
                    `Successfully published to ${platform}: ${result.platformPostId}`
                );
            } else {
                this.logger.warn(`Failed to publish to ${platform}: ${result.error}`);
            }

            return result;
        } catch (error) {
            const message = error instanceof Error ? error.message : "Unknown error";
            this.logger.error(`Publisher error for ${platform}: ${message}`);
            return {
                success: false,
                error: message,
            };
        }
    }
}
