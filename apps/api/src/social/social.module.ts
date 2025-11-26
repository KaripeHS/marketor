import { Module } from "@nestjs/common";
import { SocialController } from "./social.controller";
import { SocialService } from "./social.service";
import { OAuthController } from "./oauth.controller";
import { OAuthService } from "./oauth.service";
import { PrismaModule } from "../prisma/prisma.module";
import { TikTokPublisher } from "./publishers/tiktok.publisher";
import { InstagramPublisher } from "./publishers/instagram.publisher";
import { YouTubePublisher, YouTubeShortPublisher } from "./publishers/youtube.publisher";
import { FacebookPublisher } from "./publishers/facebook.publisher";
import { TwitterPublisher } from "./publishers/twitter.publisher";
import { LinkedInPublisher } from "./publishers/linkedin.publisher";
import { PinterestPublisher } from "./publishers/pinterest.publisher";
import { PublisherService } from "./publishers/publisher.service";

@Module({
    imports: [PrismaModule],
    controllers: [SocialController, OAuthController],
    providers: [
        SocialService,
        OAuthService,
        TikTokPublisher,
        InstagramPublisher,
        YouTubePublisher,
        YouTubeShortPublisher,
        FacebookPublisher,
        TwitterPublisher,
        LinkedInPublisher,
        PinterestPublisher,
        PublisherService,
    ],
    exports: [SocialService, OAuthService, PublisherService],
})
export class SocialModule {}
