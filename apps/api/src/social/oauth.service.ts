import { Injectable, BadRequestException } from "@nestjs/common";
import { Platform } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { CryptoService } from "../crypto/crypto.service";

interface OAuthConfig {
    clientId: string;
    clientSecret: string;
    redirectUri: string;
    scopes: string[];
}

interface TokenResponse {
    accessToken: string;
    refreshToken?: string;
    expiresIn: number;
    scope?: string;
    openId?: string;
}

interface UserInfo {
    accountId: string;
    accountName: string;
    avatarUrl?: string;
}

// API response types
interface TikTokTokenResponse {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    scope?: string;
    open_id?: string;
    error?: string;
    error_description?: string;
}

interface TikTokUserResponse {
    data?: { user?: { open_id?: string; display_name?: string; avatar_url?: string } };
    error?: { message?: string };
}

interface FacebookTokenResponse {
    access_token?: string;
    expires_in?: number;
    error?: { message?: string };
}

interface FacebookPagesResponse {
    data?: Array<{ id: string; name: string }>;
    error?: { message?: string };
}

interface InstagramAccountResponse {
    instagram_business_account?: { id: string };
    error?: { message?: string };
}

interface InstagramUserResponse {
    username?: string;
    name?: string;
    profile_picture_url?: string;
    error?: { message?: string };
}

interface GoogleTokenResponse {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    scope?: string;
    error?: string;
    error_description?: string;
}

interface YouTubeChannelResponse {
    items?: Array<{
        id: string;
        snippet: { title: string; thumbnails?: { default?: { url?: string } } };
    }>;
    error?: { message?: string };
}

interface FacebookPictureResponse {
    data?: { url?: string };
}

@Injectable()
export class OAuthService {
    private configs: Partial<Record<Platform, OAuthConfig>> = {};

    constructor(
        private readonly prisma: PrismaService,
        private readonly crypto: CryptoService
    ) {
        this.loadConfigs();
    }

    private loadConfigs() {
        // TikTok
        if (process.env.TIKTOK_CLIENT_KEY && process.env.TIKTOK_CLIENT_SECRET) {
            this.configs.TIKTOK = {
                clientId: process.env.TIKTOK_CLIENT_KEY,
                clientSecret: process.env.TIKTOK_CLIENT_SECRET,
                redirectUri: process.env.TIKTOK_REDIRECT_URI || `${process.env.API_URL}/social/oauth/tiktok/callback`,
                scopes: ["user.info.basic", "video.upload", "video.publish"],
            };
        }

        // Instagram (via Facebook Graph API)
        if (process.env.INSTAGRAM_CLIENT_ID && process.env.INSTAGRAM_CLIENT_SECRET) {
            this.configs.INSTAGRAM = {
                clientId: process.env.INSTAGRAM_CLIENT_ID,
                clientSecret: process.env.INSTAGRAM_CLIENT_SECRET,
                redirectUri: process.env.INSTAGRAM_REDIRECT_URI || `${process.env.API_URL}/social/oauth/instagram/callback`,
                scopes: ["instagram_basic", "instagram_content_publish", "pages_show_list", "pages_read_engagement"],
            };
        }

        // YouTube (via Google)
        if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
            this.configs.YOUTUBE = {
                clientId: process.env.GOOGLE_CLIENT_ID,
                clientSecret: process.env.GOOGLE_CLIENT_SECRET,
                redirectUri: process.env.YOUTUBE_REDIRECT_URI || `${process.env.API_URL}/social/oauth/youtube/callback`,
                scopes: ["https://www.googleapis.com/auth/youtube.upload", "https://www.googleapis.com/auth/youtube.readonly"],
            };
            this.configs.YOUTUBE_SHORT = this.configs.YOUTUBE;
        }

        // Facebook
        if (process.env.FACEBOOK_APP_ID && process.env.FACEBOOK_APP_SECRET) {
            this.configs.FACEBOOK = {
                clientId: process.env.FACEBOOK_APP_ID,
                clientSecret: process.env.FACEBOOK_APP_SECRET,
                redirectUri: process.env.FACEBOOK_REDIRECT_URI || `${process.env.API_URL}/social/oauth/facebook/callback`,
                scopes: ["pages_manage_posts", "pages_read_engagement", "pages_show_list"],
            };
        }
    }

    getAvailablePlatforms(): Platform[] {
        return Object.keys(this.configs) as Platform[];
    }

    isPlatformConfigured(platform: Platform): boolean {
        return !!this.configs[platform];
    }

    // Generate OAuth authorization URL
    getAuthorizationUrl(platform: Platform, state: string): string {
        const config = this.configs[platform];
        if (!config) {
            throw new BadRequestException(`${platform} OAuth is not configured`);
        }

        switch (platform) {
            case "TIKTOK":
                return this.getTikTokAuthUrl(config, state);
            case "INSTAGRAM":
                return this.getInstagramAuthUrl(config, state);
            case "YOUTUBE":
            case "YOUTUBE_SHORT":
                return this.getYouTubeAuthUrl(config, state);
            case "FACEBOOK":
                return this.getFacebookAuthUrl(config, state);
            default:
                throw new BadRequestException(`Unsupported platform: ${platform}`);
        }
    }

    // Exchange authorization code for tokens
    async exchangeCode(platform: Platform, code: string): Promise<TokenResponse> {
        const config = this.configs[platform];
        if (!config) {
            throw new BadRequestException(`${platform} OAuth is not configured`);
        }

        switch (platform) {
            case "TIKTOK":
                return this.exchangeTikTokCode(config, code);
            case "INSTAGRAM":
                return this.exchangeInstagramCode(config, code);
            case "YOUTUBE":
            case "YOUTUBE_SHORT":
                return this.exchangeYouTubeCode(config, code);
            case "FACEBOOK":
                return this.exchangeFacebookCode(config, code);
            default:
                throw new BadRequestException(`Unsupported platform: ${platform}`);
        }
    }

    // Get user info from platform
    async getUserInfo(platform: Platform, accessToken: string): Promise<UserInfo> {
        switch (platform) {
            case "TIKTOK":
                return this.getTikTokUserInfo(accessToken);
            case "INSTAGRAM":
                return this.getInstagramUserInfo(accessToken);
            case "YOUTUBE":
            case "YOUTUBE_SHORT":
                return this.getYouTubeUserInfo(accessToken);
            case "FACEBOOK":
                return this.getFacebookUserInfo(accessToken);
            default:
                throw new BadRequestException(`Unsupported platform: ${platform}`);
        }
    }

    // Refresh access token
    async refreshAccessToken(platform: Platform, refreshToken: string): Promise<TokenResponse> {
        const config = this.configs[platform];
        if (!config) {
            throw new BadRequestException(`${platform} OAuth is not configured`);
        }

        switch (platform) {
            case "TIKTOK":
                return this.refreshTikTokToken(config, refreshToken);
            case "YOUTUBE":
            case "YOUTUBE_SHORT":
                return this.refreshYouTubeToken(config, refreshToken);
            case "FACEBOOK":
                return this.refreshFacebookToken(refreshToken);
            default:
                // Instagram long-lived tokens don't use refresh tokens
                throw new BadRequestException(`Token refresh not supported for ${platform}`);
        }
    }

    // ========== TikTok ==========

    private getTikTokAuthUrl(config: OAuthConfig, state: string): string {
        const params = new URLSearchParams({
            client_key: config.clientId,
            response_type: "code",
            scope: config.scopes.join(","),
            redirect_uri: config.redirectUri,
            state,
        });
        return `https://www.tiktok.com/v2/auth/authorize/?${params.toString()}`;
    }

    private async exchangeTikTokCode(config: OAuthConfig, code: string): Promise<TokenResponse> {
        const response = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
                client_key: config.clientId,
                client_secret: config.clientSecret,
                code,
                grant_type: "authorization_code",
                redirect_uri: config.redirectUri,
            }),
        });

        const data = await response.json() as TikTokTokenResponse;
        if (data.error) {
            throw new BadRequestException(`TikTok OAuth error: ${data.error_description || data.error}`);
        }

        return {
            accessToken: data.access_token || "",
            refreshToken: data.refresh_token,
            expiresIn: data.expires_in || 86400,
            scope: data.scope,
            openId: data.open_id,
        };
    }

    private async getTikTokUserInfo(accessToken: string): Promise<UserInfo> {
        const response = await fetch(
            "https://open.tiktokapis.com/v2/user/info/?fields=open_id,display_name,avatar_url",
            {
                headers: { Authorization: `Bearer ${accessToken}` },
            }
        );

        const data = await response.json() as TikTokUserResponse;
        if (data.error) {
            throw new BadRequestException(`TikTok API error: ${data.error.message}`);
        }

        return {
            accountId: data.data?.user?.open_id || "",
            accountName: data.data?.user?.display_name || "TikTok User",
            avatarUrl: data.data?.user?.avatar_url,
        };
    }

    private async refreshTikTokToken(config: OAuthConfig, refreshToken: string): Promise<TokenResponse> {
        const response = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
                client_key: config.clientId,
                client_secret: config.clientSecret,
                grant_type: "refresh_token",
                refresh_token: refreshToken,
            }),
        });

        const data = await response.json() as TikTokTokenResponse;
        if (data.error) {
            throw new BadRequestException(`TikTok refresh error: ${data.error_description || data.error}`);
        }

        return {
            accessToken: data.access_token || "",
            refreshToken: data.refresh_token,
            expiresIn: data.expires_in || 86400,
            scope: data.scope,
        };
    }

    // ========== Instagram ==========

    private getInstagramAuthUrl(config: OAuthConfig, state: string): string {
        const params = new URLSearchParams({
            client_id: config.clientId,
            redirect_uri: config.redirectUri,
            scope: config.scopes.join(","),
            response_type: "code",
            state,
        });
        return `https://www.facebook.com/v18.0/dialog/oauth?${params.toString()}`;
    }

    private async exchangeInstagramCode(config: OAuthConfig, code: string): Promise<TokenResponse> {
        // First get short-lived token
        const tokenResponse = await fetch("https://graph.facebook.com/v18.0/oauth/access_token", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
                client_id: config.clientId,
                client_secret: config.clientSecret,
                redirect_uri: config.redirectUri,
                code,
            }),
        });

        const tokenData = await tokenResponse.json() as FacebookTokenResponse;
        if (tokenData.error) {
            throw new BadRequestException(`Instagram OAuth error: ${tokenData.error.message}`);
        }

        // Exchange for long-lived token
        const longLivedResponse = await fetch(
            `https://graph.facebook.com/v18.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${config.clientId}&client_secret=${config.clientSecret}&fb_exchange_token=${tokenData.access_token}`
        );

        const longLivedData = await longLivedResponse.json() as FacebookTokenResponse;
        if (longLivedData.error) {
            throw new BadRequestException(`Instagram long-lived token error: ${longLivedData.error.message}`);
        }

        return {
            accessToken: longLivedData.access_token || tokenData.access_token || "",
            expiresIn: longLivedData.expires_in || 5184000, // ~60 days
        };
    }

    private async getInstagramUserInfo(accessToken: string): Promise<UserInfo> {
        // Get Facebook pages first
        const pagesResponse = await fetch(
            `https://graph.facebook.com/v18.0/me/accounts?access_token=${accessToken}`
        );
        const pagesData = await pagesResponse.json() as FacebookPagesResponse;

        if (!pagesData.data || pagesData.data.length === 0) {
            throw new BadRequestException("No Facebook pages found. Instagram Business accounts require a connected Facebook page.");
        }

        // Get Instagram account connected to first page
        const pageId = pagesData.data[0].id;
        const igResponse = await fetch(
            `https://graph.facebook.com/v18.0/${pageId}?fields=instagram_business_account&access_token=${accessToken}`
        );
        const igData = await igResponse.json() as InstagramAccountResponse;

        if (!igData.instagram_business_account) {
            throw new BadRequestException("No Instagram Business account connected to Facebook page.");
        }

        // Get Instagram account info
        const igAccountResponse = await fetch(
            `https://graph.facebook.com/v18.0/${igData.instagram_business_account.id}?fields=username,name,profile_picture_url&access_token=${accessToken}`
        );
        const igAccountData = await igAccountResponse.json() as InstagramUserResponse;

        return {
            accountId: igData.instagram_business_account.id,
            accountName: igAccountData.username || igAccountData.name || "Instagram User",
            avatarUrl: igAccountData.profile_picture_url,
        };
    }

    // ========== YouTube ==========

    private getYouTubeAuthUrl(config: OAuthConfig, state: string): string {
        const params = new URLSearchParams({
            client_id: config.clientId,
            redirect_uri: config.redirectUri,
            response_type: "code",
            scope: config.scopes.join(" "),
            access_type: "offline",
            prompt: "consent",
            state,
        });
        return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
    }

    private async exchangeYouTubeCode(config: OAuthConfig, code: string): Promise<TokenResponse> {
        const response = await fetch("https://oauth2.googleapis.com/token", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
                client_id: config.clientId,
                client_secret: config.clientSecret,
                code,
                grant_type: "authorization_code",
                redirect_uri: config.redirectUri,
            }),
        });

        const data = await response.json() as GoogleTokenResponse;
        if (data.error) {
            throw new BadRequestException(`YouTube OAuth error: ${data.error_description || data.error}`);
        }

        return {
            accessToken: data.access_token || "",
            refreshToken: data.refresh_token,
            expiresIn: data.expires_in || 3600,
            scope: data.scope,
        };
    }

    private async getYouTubeUserInfo(accessToken: string): Promise<UserInfo> {
        const response = await fetch(
            "https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true",
            {
                headers: { Authorization: `Bearer ${accessToken}` },
            }
        );

        const data = await response.json() as YouTubeChannelResponse;
        if (data.error) {
            throw new BadRequestException(`YouTube API error: ${data.error.message}`);
        }

        if (!data.items || data.items.length === 0) {
            throw new BadRequestException("No YouTube channel found for this account.");
        }

        const channel = data.items[0];
        return {
            accountId: channel.id,
            accountName: channel.snippet.title,
            avatarUrl: channel.snippet.thumbnails?.default?.url,
        };
    }

    private async refreshYouTubeToken(config: OAuthConfig, refreshToken: string): Promise<TokenResponse> {
        const response = await fetch("https://oauth2.googleapis.com/token", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
                client_id: config.clientId,
                client_secret: config.clientSecret,
                refresh_token: refreshToken,
                grant_type: "refresh_token",
            }),
        });

        const data = await response.json() as GoogleTokenResponse;
        if (data.error) {
            throw new BadRequestException(`YouTube refresh error: ${data.error_description || data.error}`);
        }

        return {
            accessToken: data.access_token || "",
            refreshToken: refreshToken, // Google doesn't return new refresh token
            expiresIn: data.expires_in || 3600,
            scope: data.scope,
        };
    }

    // ========== Facebook ==========

    private getFacebookAuthUrl(config: OAuthConfig, state: string): string {
        const params = new URLSearchParams({
            client_id: config.clientId,
            redirect_uri: config.redirectUri,
            scope: config.scopes.join(","),
            response_type: "code",
            state,
        });
        return `https://www.facebook.com/v18.0/dialog/oauth?${params.toString()}`;
    }

    private async exchangeFacebookCode(config: OAuthConfig, code: string): Promise<TokenResponse> {
        // Get short-lived token
        const tokenResponse = await fetch("https://graph.facebook.com/v18.0/oauth/access_token", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
                client_id: config.clientId,
                client_secret: config.clientSecret,
                redirect_uri: config.redirectUri,
                code,
            }),
        });

        const tokenData = await tokenResponse.json() as FacebookTokenResponse;
        if (tokenData.error) {
            throw new BadRequestException(`Facebook OAuth error: ${tokenData.error.message}`);
        }

        // Exchange for long-lived token
        const longLivedResponse = await fetch(
            `https://graph.facebook.com/v18.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${config.clientId}&client_secret=${config.clientSecret}&fb_exchange_token=${tokenData.access_token}`
        );

        const longLivedData = await longLivedResponse.json() as FacebookTokenResponse;

        return {
            accessToken: longLivedData.access_token || tokenData.access_token || "",
            expiresIn: longLivedData.expires_in || tokenData.expires_in || 5184000,
        };
    }

    private async getFacebookUserInfo(accessToken: string): Promise<UserInfo> {
        // Get pages the user manages
        const pagesResponse = await fetch(
            `https://graph.facebook.com/v18.0/me/accounts?access_token=${accessToken}`
        );
        const pagesData = await pagesResponse.json() as FacebookPagesResponse;

        if (!pagesData.data || pagesData.data.length === 0) {
            throw new BadRequestException("No Facebook pages found. You need at least one page to publish content.");
        }

        // Use first page
        const page = pagesData.data[0];

        // Get page profile picture
        const pictureResponse = await fetch(
            `https://graph.facebook.com/v18.0/${page.id}/picture?redirect=false&access_token=${accessToken}`
        );
        const pictureData = await pictureResponse.json() as FacebookPictureResponse;

        return {
            accountId: page.id,
            accountName: page.name,
            avatarUrl: pictureData.data?.url,
        };
    }

    private async refreshFacebookToken(_refreshToken: string): Promise<TokenResponse> {
        // Facebook long-lived tokens can be refreshed by re-exchanging
        // This requires the user to re-authorize, so we just return an error
        throw new BadRequestException(
            "Facebook tokens cannot be refreshed automatically. Please reconnect your account."
        );
    }

    // ========== State Management ==========

    async createOAuthState(tenantId: string, platform: Platform): Promise<string> {
        const state = crypto.randomUUID();
        // Store state temporarily (could use Redis in production)
        // For now, encode tenant and platform in state
        const encoded = Buffer.from(JSON.stringify({ tenantId, platform, state })).toString("base64url");
        return encoded;
    }

    parseOAuthState(encodedState: string): { tenantId: string; platform: Platform; state: string } {
        try {
            const decoded = Buffer.from(encodedState, "base64url").toString();
            return JSON.parse(decoded);
        } catch {
            throw new BadRequestException("Invalid OAuth state");
        }
    }

    // ========== Complete OAuth Flow ==========

    async completeOAuthFlow(
        tenantId: string,
        platform: Platform,
        code: string
    ): Promise<{ connection: { id: string; platform: Platform; accountName: string } }> {
        // Exchange code for tokens
        const tokens = await this.exchangeCode(platform, code);

        // Get user info
        const userInfo = await this.getUserInfo(platform, tokens.accessToken);

        // Calculate token expiry
        const tokenExpiry = new Date();
        tokenExpiry.setSeconds(tokenExpiry.getSeconds() + tokens.expiresIn);

        // Encrypt tokens before storing
        const encryptedAccessToken = this.crypto.encrypt(tokens.accessToken);
        const encryptedRefreshToken = tokens.refreshToken
            ? this.crypto.encrypt(tokens.refreshToken)
            : null;

        // Save connection with encrypted tokens
        const connection = await this.prisma.socialConnection.upsert({
            where: {
                tenantId_platform_accountId: {
                    tenantId,
                    platform,
                    accountId: userInfo.accountId,
                },
            },
            update: {
                accountName: userInfo.accountName,
                accessToken: encryptedAccessToken,
                refreshToken: encryptedRefreshToken,
                tokenExpiry,
                scopes: tokens.scope?.split(/[,\s]+/) || [],
                isActive: true,
                lastSyncAt: new Date(),
            },
            create: {
                tenantId,
                platform,
                accountId: userInfo.accountId,
                accountName: userInfo.accountName,
                accessToken: encryptedAccessToken,
                refreshToken: encryptedRefreshToken,
                tokenExpiry,
                scopes: tokens.scope?.split(/[,\s]+/) || [],
            },
        });

        return {
            connection: {
                id: connection.id,
                platform: connection.platform,
                accountName: connection.accountName || userInfo.accountName,
            },
        };
    }
}
