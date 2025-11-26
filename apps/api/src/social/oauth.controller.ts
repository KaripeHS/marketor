import { Controller, Get, Param, Query, Res, BadRequestException } from "@nestjs/common";
import { Response } from "express";
import { Platform } from "@prisma/client";
import { OAuthService } from "./oauth.service";
import { Auth } from "../auth/auth.decorator";
import { AuthContext } from "../auth/auth.types";
import { Public } from "../auth/auth.decorator";
import { Roles } from "../auth/roles.decorator";

@Controller("social/oauth")
export class OAuthController {
    constructor(private readonly oauthService: OAuthService) { }

    // Get available platforms for OAuth
    @Get("platforms")
    getAvailablePlatforms() {
        const available = this.oauthService.getAvailablePlatforms();
        const allPlatforms: Platform[] = ["TIKTOK", "INSTAGRAM", "YOUTUBE", "YOUTUBE_SHORT", "FACEBOOK"];

        return allPlatforms.map((platform) => ({
            platform,
            configured: available.includes(platform),
            displayName: this.getDisplayName(platform),
        }));
    }

    // Initiate OAuth flow - redirects to platform authorization page
    @Get(":platform/authorize")
    @Roles("ADMIN", "AGENCY")
    async authorize(
        @Param("platform") platform: string,
        @Auth() auth: AuthContext,
        @Res() res: Response
    ) {
        const normalizedPlatform = this.normalizePlatform(platform);

        if (!this.oauthService.isPlatformConfigured(normalizedPlatform)) {
            throw new BadRequestException(`${platform} OAuth is not configured. Please set up environment variables.`);
        }

        // Create state with tenant info
        const state = await this.oauthService.createOAuthState(auth.tenantId, normalizedPlatform);

        // Get authorization URL
        const authUrl = this.oauthService.getAuthorizationUrl(normalizedPlatform, state);

        // Redirect to platform
        res.redirect(authUrl);
    }

    // OAuth callback - receives authorization code from platform
    @Get(":platform/callback")
    @Public()
    async callback(
        @Param("platform") platform: string,
        @Query("code") code: string,
        @Query("state") state: string,
        @Query("error") error: string,
        @Query("error_description") errorDescription: string,
        @Res() res: Response
    ) {
        const webAppUrl = process.env.WEB_APP_URL || "http://localhost:3000";

        // Handle OAuth errors
        if (error) {
            const errorMsg = encodeURIComponent(errorDescription || error);
            return res.redirect(`${webAppUrl}/dashboard/integrations?error=${errorMsg}&platform=${platform}`);
        }

        if (!code || !state) {
            return res.redirect(`${webAppUrl}/dashboard/integrations?error=missing_params&platform=${platform}`);
        }

        try {
            // Parse state to get tenant and platform
            const { tenantId, platform: statePlatform } = this.oauthService.parseOAuthState(state);

            // Complete OAuth flow
            const result = await this.oauthService.completeOAuthFlow(tenantId, statePlatform, code);

            // Redirect back to web app with success
            const successMsg = encodeURIComponent(`Successfully connected ${result.connection.accountName}`);
            return res.redirect(
                `${webAppUrl}/dashboard/integrations?success=${successMsg}&platform=${platform}&connection=${result.connection.id}`
            );
        } catch (err) {
            const errorMsg = encodeURIComponent(err instanceof Error ? err.message : "OAuth failed");
            return res.redirect(`${webAppUrl}/dashboard/integrations?error=${errorMsg}&platform=${platform}`);
        }
    }

    // Refresh tokens for a connection
    @Get("refresh/:connectionId")
    @Roles("ADMIN", "AGENCY")
    async refreshConnection(@Param("connectionId") connectionId: string, @Auth() auth: AuthContext) {
        // Get connection
        const connection = await this.oauthService["prisma"].socialConnection.findFirst({
            where: { id: connectionId, tenantId: auth.tenantId },
        });

        if (!connection) {
            throw new BadRequestException("Connection not found");
        }

        if (!connection.refreshToken) {
            throw new BadRequestException("No refresh token available. Please reconnect your account.");
        }

        // Refresh token
        const tokens = await this.oauthService.refreshAccessToken(connection.platform, connection.refreshToken);

        // Calculate new expiry
        const tokenExpiry = new Date();
        tokenExpiry.setSeconds(tokenExpiry.getSeconds() + tokens.expiresIn);

        // Update connection
        const updated = await this.oauthService["prisma"].socialConnection.update({
            where: { id: connectionId },
            data: {
                accessToken: tokens.accessToken,
                refreshToken: tokens.refreshToken || connection.refreshToken,
                tokenExpiry,
                lastSyncAt: new Date(),
            },
        });

        return {
            success: true,
            connection: {
                id: updated.id,
                platform: updated.platform,
                accountName: updated.accountName,
                tokenExpiry: updated.tokenExpiry,
            },
        };
    }

    private normalizePlatform(platform: string): Platform {
        const normalized = platform.toUpperCase().replace("-", "_") as Platform;
        const validPlatforms: Platform[] = ["TIKTOK", "INSTAGRAM", "YOUTUBE", "YOUTUBE_SHORT", "FACEBOOK"];

        if (!validPlatforms.includes(normalized)) {
            throw new BadRequestException(`Invalid platform: ${platform}`);
        }

        return normalized;
    }

    private getDisplayName(platform: Platform): string {
        const names: Record<Platform, string> = {
            TIKTOK: "TikTok",
            INSTAGRAM: "Instagram",
            YOUTUBE: "YouTube",
            YOUTUBE_SHORT: "YouTube Shorts",
            FACEBOOK: "Facebook",
        };
        return names[platform];
    }
}
