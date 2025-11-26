export const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:4000";

export const Colors = {
    light: {
        primary: "#6366f1",
        primaryDark: "#4f46e5",
        background: "#ffffff",
        surface: "#f8fafc",
        text: "#1e293b",
        textSecondary: "#64748b",
        border: "#e2e8f0",
        error: "#ef4444",
        success: "#22c55e",
        warning: "#f59e0b",
    },
    dark: {
        primary: "#818cf8",
        primaryDark: "#6366f1",
        background: "#0f172a",
        surface: "#1e293b",
        text: "#f1f5f9",
        textSecondary: "#94a3b8",
        border: "#334155",
        error: "#f87171",
        success: "#4ade80",
        warning: "#fbbf24",
    },
};

export const Platforms = {
    TIKTOK: { name: "TikTok", icon: "logo-tiktok", color: "#000000" },
    INSTAGRAM: { name: "Instagram", icon: "logo-instagram", color: "#E4405F" },
    YOUTUBE: { name: "YouTube", icon: "logo-youtube", color: "#FF0000" },
    TWITTER: { name: "Twitter/X", icon: "logo-twitter", color: "#1DA1F2" },
    FACEBOOK: { name: "Facebook", icon: "logo-facebook", color: "#1877F2" },
    LINKEDIN: { name: "LinkedIn", icon: "logo-linkedin", color: "#0A66C2" },
};

export const ContentStates = {
    DRAFT: { label: "Draft", color: "#64748b" },
    IN_REVIEW: { label: "In Review", color: "#f59e0b" },
    COMPLIANCE_REVIEW: { label: "Compliance", color: "#8b5cf6" },
    APPROVED: { label: "Approved", color: "#22c55e" },
    SCHEDULED: { label: "Scheduled", color: "#3b82f6" },
    PUBLISHED: { label: "Published", color: "#10b981" },
    REJECTED: { label: "Rejected", color: "#ef4444" },
};
