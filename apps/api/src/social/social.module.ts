import { Module } from "@nestjs/common";
import { SocialController } from "./social.controller";
import { SocialService } from "./social.service";
import { OAuthController } from "./oauth.controller";
import { OAuthService } from "./oauth.service";
import { PrismaModule } from "../prisma/prisma.module";

@Module({
    imports: [PrismaModule],
    controllers: [SocialController, OAuthController],
    providers: [SocialService, OAuthService],
    exports: [SocialService, OAuthService],
})
export class SocialModule { }
