import { Platform, ContentFormat } from "../index";

// Agent Types
export enum AgentType {
    INGESTION = "INGESTION",           // Processes incoming data/content
    TREND_RESEARCH = "TREND_RESEARCH", // Analyzes trends and viral content
    STRATEGY = "STRATEGY",             // Creates content strategies
    PLANNER = "PLANNER",               // Plans content calendar
    SCRIPT_WRITER = "SCRIPT_WRITER",   // Writes video scripts
    CAPTION_WRITER = "CAPTION_WRITER", // Creates captions and hashtags
    IMAGE_GENERATOR = "IMAGE_GENERATOR", // Generates images
    VIDEO_GENERATOR = "VIDEO_GENERATOR", // Generates videos
    COMPLIANCE = "COMPLIANCE",         // Reviews content for compliance
    SCHEDULER = "SCHEDULER",           // Schedules content for publishing
    ANALYTICS = "ANALYTICS",           // Analyzes performance metrics
    LEARNING = "LEARNING",             // Learns from performance data
    REPORTING = "REPORTING",           // Generates reports
}

export enum AgentStatus {
    IDLE = "IDLE",
    RUNNING = "RUNNING",
    COMPLETED = "COMPLETED",
    FAILED = "FAILED",
    CANCELLED = "CANCELLED",
}

// Base Agent I/O Types
export interface AgentContext {
    tenantId: string;
    userId: string;
    brandProfileId?: string;
    strategyId?: string;
    campaignId?: string;
    sessionId: string;
    metadata?: Record<string, unknown>;
}

export interface AgentInput<T = unknown> {
    context: AgentContext;
    data: T;
    previousOutputs?: Record<string, AgentOutput<unknown>>;
}

export interface AgentOutput<T = unknown> {
    agentType: AgentType;
    status: AgentStatus;
    data: T | null;
    error?: string;
    metadata?: {
        startedAt: Date;
        completedAt: Date;
        durationMs: number;
        promptVersion?: string;
        tokenUsage?: {
            input: number;
            output: number;
            total: number;
        };
    };
}

// Specific Agent I/O Schemas

// Trend Research Agent
export interface TrendResearchInput {
    platforms: Platform[];
    industry?: string;
    keywords?: string[];
    lookbackDays?: number;
}

export interface TrendResearchOutput {
    trends: Array<{
        platform: Platform;
        topic: string;
        score: number; // 0-100
        hashtags: string[];
        sampleUrls: string[];
        peakTiming?: string;
    }>;
    insights: string[];
    generatedAt: Date;
}

// Strategy Agent
export interface StrategyInput {
    brandProfile: {
        voice: Record<string, unknown>;
        audiences: Array<{ name: string; demographics: string }>;
        valueProps: string[];
    };
    trends?: TrendResearchOutput;
    existingStrategies?: Array<{ name: string; goals: string[] }>;
    timeframeDays?: number;
}

export interface StrategyOutput {
    name: string;
    goals: Array<{
        objective: string;
        metric: string;
        target: string;
    }>;
    pillars: Array<{
        name: string;
        description: string;
        contentTypes: ContentFormat[];
    }>;
    platformFocus: Array<{
        platform: Platform;
        frequency: string;
        bestTimes: string[];
    }>;
    recommendations: string[];
}

// Planner Agent
export interface PlannerInput {
    strategy: StrategyOutput;
    startDate: Date;
    endDate: Date;
    contentCount?: number;
    existingContent?: Array<{ id: string; scheduledFor: Date }>;
}

export interface PlannerOutput {
    items: Array<{
        date: Date;
        platform: Platform;
        format: ContentFormat;
        pillar: string;
        topicSuggestion: string;
        notes?: string;
    }>;
}

// Script Writer Agent
export interface ScriptWriterInput {
    topic: string;
    platform: Platform;
    format: ContentFormat;
    brandVoice: Record<string, unknown>;
    targetAudience?: string;
    duration?: number; // seconds
    trendContext?: string;
}

export interface ScriptWriterOutput {
    title: string;
    hook: string;
    script: string;
    callToAction: string;
    estimatedDuration: number;
    keyPoints: string[];
}

// Caption Writer Agent
export interface CaptionWriterInput {
    script?: string;
    topic: string;
    platform: Platform;
    brandVoice: Record<string, unknown>;
    maxLength?: number;
}

export interface CaptionWriterOutput {
    caption: string;
    hashtags: string[];
    emojis: string[];
    alternativeCaptions?: string[];
}

// Compliance Agent
export interface ComplianceInput {
    contentType: "script" | "caption" | "image" | "video";
    content: string;
    platform: Platform;
    industry?: string;
    rules?: string[];
}

export interface ComplianceOutput {
    isCompliant: boolean;
    score: number; // 0-100
    issues: Array<{
        severity: "error" | "warning" | "info";
        rule: string;
        description: string;
        suggestion?: string;
        location?: { start: number; end: number };
    }>;
    suggestions: string[];
}

// Analytics Agent
export interface AnalyticsInput {
    contentIds: string[];
    platforms: Platform[];
    dateRange: { start: Date; end: Date };
    metrics?: string[];
}

export interface AnalyticsOutput {
    summary: {
        totalViews: number;
        totalEngagement: number;
        avgEngagementRate: number;
        topPerformingContent: string[];
    };
    byPlatform: Record<Platform, {
        views: number;
        likes: number;
        comments: number;
        shares: number;
        engagementRate: number;
    }>;
    insights: string[];
    recommendations: string[];
}

// Learning Agent
export interface LearningInput {
    analyticsData: AnalyticsOutput;
    contentData: Array<{
        id: string;
        platform: Platform;
        format: ContentFormat;
        topic: string;
        publishedAt: Date;
    }>;
    strategyId?: string;
}

export interface LearningOutput {
    patterns: Array<{
        type: "timing" | "format" | "topic" | "length" | "hashtag";
        insight: string;
        confidence: number;
        recommendation: string;
    }>;
    bestPractices: string[];
    strategyAdjustments?: string[];
}

// Reporting Agent
export interface ReportingInput {
    reportType: "daily" | "weekly" | "monthly" | "quarterly";
    dateRange: { start: Date; end: Date };
    includeAnalytics?: boolean;
    includeLearnings?: boolean;
    includeRecommendations?: boolean;
}

export interface ReportingOutput {
    title: string;
    period: string;
    sections: Array<{
        title: string;
        content: string;
        metrics?: Record<string, number | string>;
        charts?: Array<{
            type: "line" | "bar" | "pie";
            data: unknown;
        }>;
    }>;
    highlights: string[];
    actionItems: string[];
}
