export type BrandId = string;
export type TenantId = string;
export type UserId = string;
export type CampaignId = string;
export type ContentId = string;

export enum Platform {
  TIKTOK = "TIKTOK",
  INSTAGRAM = "INSTAGRAM",
  YOUTUBE = "YOUTUBE",
  YOUTUBE_SHORT = "YOUTUBE_SHORT",
  FACEBOOK = "FACEBOOK"
}

export enum ContentFormat {
  SHORT_VIDEO = "SHORT_VIDEO",
  LONG_VIDEO = "LONG_VIDEO",
  IMAGE = "IMAGE",
  CAROUSEL = "CAROUSEL",
  TEXT = "TEXT"
}

export enum ContentState {
  DRAFT = "DRAFT",
  SCRIPTED = "SCRIPTED",
  ASSETS_READY = "ASSETS_READY",
  COMPLIANCE_REVIEW = "COMPLIANCE_REVIEW",
  READY_TO_SCHEDULE = "READY_TO_SCHEDULE",
  SCHEDULED = "SCHEDULED",
  PUBLISHED = "PUBLISHED",
  REJECTED = "REJECTED"
}

export enum RevisionStatus {
  OPEN = "OPEN",
  RESOLVED = "RESOLVED",
  REJECTED = "REJECTED"
}

// Agent types and schemas
export * from "./agents";
