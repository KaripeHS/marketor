export enum CampaignStatus {
    ACTIVE = "ACTIVE",
    PAUSED = "PAUSED",
    ARCHIVED = "ARCHIVED",
}

export enum Platform {
    TIKTOK = "TIKTOK",
    INSTAGRAM = "INSTAGRAM",
    YOUTUBE = "YOUTUBE",
    YOUTUBE_SHORT = "YOUTUBE_SHORT",
    FACEBOOK = "FACEBOOK",
    TWITTER = "TWITTER",
    LINKEDIN = "LINKEDIN",
    PINTEREST = "PINTEREST",
}

export enum ContentFormat {
    SHORT_VIDEO = "SHORT_VIDEO",
    LONG_VIDEO = "LONG_VIDEO",
    IMAGE = "IMAGE",
    CAROUSEL = "CAROUSEL",
    TEXT = "TEXT",
}

export enum ContentState {
    DRAFT = "DRAFT",
    SCRIPTED = "SCRIPTED",
    ASSETS_READY = "ASSETS_READY",
    COMPLIANCE_REVIEW = "COMPLIANCE_REVIEW",
    READY_TO_SCHEDULE = "READY_TO_SCHEDULE",
    SCHEDULED = "SCHEDULED",
    PUBLISHED = "PUBLISHED",
    REJECTED = "REJECTED",
}

export interface Campaign {
    id: string;
    tenantId: string;
    name: string;
    status: CampaignStatus;
    createdAt: string;
    updatedAt: string;
}

export interface ContentItem {
    id: string;
    tenantId: string;
    campaignId?: string;
    platform: Platform;
    format: ContentFormat;
    state: ContentState;
    title?: string;
    script?: string;
    caption?: string;
    hashtags?: string[];
    mediaUrl?: string;
    thumbnailUrl?: string;
    scheduledFor?: string;
    publishedAt?: string;
    createdAt: string;
    updatedAt: string;
    campaign?: Campaign;
}

export interface CreateCampaignDto {
    name: string;
    status?: CampaignStatus;
}

export interface CreateContentDto {
    campaignId?: string;
    platform: Platform;
    format: ContentFormat;
    state?: ContentState;
    scheduledFor?: string;
}

export interface UpdateContentStateDto {
    state: ContentState;
    scheduledFor?: string;
}

export enum ApprovalStatus {
    PENDING = "PENDING",
    APPROVED = "APPROVED",
    REJECTED = "REJECTED",
    CHANGES_REQUESTED = "CHANGES_REQUESTED",
}

export interface Approval {
    id: string;
    contentId: string;
    status: ApprovalStatus;
    notes?: string;
    reviewerId?: string;
    updatedAt: string;
}

export interface Comment {
    id: string;
    contentId: string;
    authorId: string;
    body: string;
    createdAt: string;
}

export interface CreateCommentDto {
    contentId: string;
    body: string;
}

export interface UpdateApprovalDto {
    status: ApprovalStatus;
    notes?: string;
}

export interface BrandProfile {
    id: string;
    tenantId: string;
    name: string;
    voice: Record<string, any>;
    audiences: Record<string, any>;
    valueProps: Record<string, any>;
    visualStyle: Record<string, any>;
    createdAt: string;
    updatedAt: string;
}

export interface UpsertBrandDto {
    name: string;
    voice: Record<string, any>;
    audiences: Record<string, any>;
    valueProps: Record<string, any>;
    visualStyle: Record<string, any>;
}

export interface Strategy {
    id: string;
    tenantId: string;
    name: string;
    startsOn: string;
    endsOn: string;
    goals: Record<string, any>;
    pillars: Record<string, any>;
    platformFocus: Record<string, any>;
    createdAt: string;
    updatedAt: string;
}

export interface CreateStrategyDto {
    name: string;
    startsOn: string;
    endsOn: string;
    goals: Record<string, any>;
    pillars: Record<string, any>;
    platformFocus: Record<string, any>;
}

export interface UpdateCampaignDto {
    name?: string;
    status?: CampaignStatus;
}

export interface UpdateContentDto {
    campaignId?: string;
    platform?: Platform;
    format?: ContentFormat;
    state?: ContentState;
    title?: string;
    script?: string;
    caption?: string;
    hashtags?: string[];
    mediaUrl?: string;
    thumbnailUrl?: string;
    scheduledFor?: string;
}

export interface UpdateStrategyDto {
    name?: string;
    startsOn?: string;
    endsOn?: string;
    goals?: Record<string, any>;
    pillars?: Record<string, any>;
    platformFocus?: Record<string, any>;
}

export interface Notification {
    id: string;
    userId: string;
    type: string;
    payload: Record<string, any>;
    readAt?: string;
    createdAt: string;
}

export interface AnalyticsMetric {
    totalViews: number;
    engagementRate: number;
    followersGained: number;
    postsPublished: number;
}

export interface AnalyticsData {
    metrics: AnalyticsMetric;
    viewsOverTime: { date: string; value: number }[];
    engagementByPlatform: { platform: string; value: number }[];
}

// Social Integration Types

export enum PostJobStatus {
    PENDING = "PENDING",
    PROCESSING = "PROCESSING",
    COMPLETED = "COMPLETED",
    FAILED = "FAILED",
    CANCELLED = "CANCELLED",
}

export interface SocialConnection {
    id: string;
    tenantId: string;
    platform: Platform;
    accountId: string;
    accountName?: string;
    tokenExpiry?: string;
    scopes: string[];
    isActive: boolean;
    lastSyncAt?: string;
    createdAt: string;
    updatedAt: string;
}

export interface CreateConnectionDto {
    platform: Platform;
    accountId: string;
    accountName?: string;
    accessToken: string;
    refreshToken?: string;
    tokenExpiry?: string;
    scopes?: string[];
}

export interface PostJob {
    id: string;
    tenantId: string;
    contentId: string;
    platform: Platform;
    status: PostJobStatus;
    scheduledFor: string;
    attempts: number;
    maxAttempts: number;
    lastError?: string;
    publishResult?: PublishResult;
    createdAt: string;
    updatedAt: string;
}

export interface CreatePostJobDto {
    contentId: string;
    platform: Platform;
    scheduledFor: string;
}

export interface PublishResult {
    id: string;
    postJobId: string;
    platform: Platform;
    platformPostId?: string;
    platformUrl?: string;
    publishedAt: string;
    createdAt: string;
}

export interface JobStats {
    pending: number;
    processing: number;
    completed: number;
    failed: number;
    total: number;
}

// Invitation Types

export enum Role {
    ADMIN = "ADMIN",
    AGENCY = "AGENCY",
    CLIENT = "CLIENT",
    REVIEWER = "REVIEWER",
}

export enum InvitationStatus {
    PENDING = "PENDING",
    ACCEPTED = "ACCEPTED",
    EXPIRED = "EXPIRED",
    CANCELLED = "CANCELLED",
}

export interface Invitation {
    id: string;
    tenantId: string;
    email: string;
    role: Role;
    token: string;
    status: InvitationStatus;
    invitedBy: string;
    expiresAt: string;
    acceptedAt?: string;
    createdAt: string;
    updatedAt: string;
    tenant?: {
        id?: string;
        name: string;
        slug: string;
    };
}

export interface CreateInvitationDto {
    email: string;
    role: Role;
}

// Media Asset Types

export type MediaType = "image" | "video" | "thumbnail";

export interface MediaAsset {
    id: string;
    tenantId: string;
    contentId: string | null;
    filename: string;
    originalFilename: string;
    mimeType: string;
    size: number;
    url: string;
    storageKey: string;
    type: MediaType;
    createdAt: string;
    updatedAt: string;
}
