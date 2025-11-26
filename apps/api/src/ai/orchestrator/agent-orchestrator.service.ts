import { Injectable, Logger } from "@nestjs/common";
import OpenAI from "openai";
import {
    AgentType,
    AgentStatus,
    AgentContext,
    AgentInput,
    AgentOutput,
} from "@growthpilot/shared";
import { PromptRegistryService, CompiledPrompt, PromptVariables } from "../prompts/prompt-registry.service";

export interface AgentExecutionOptions {
    promptVersion?: string;
    retryCount?: number;
    timeoutMs?: number;
}

export interface AgentExecutionResult<T> {
    output: AgentOutput<T>;
    promptVersion: string;
    rawResponse?: string;
}

@Injectable()
export class AgentOrchestratorService {
    private readonly logger = new Logger(AgentOrchestratorService.name);
    private openai: OpenAI | null = null;
    private readonly maxRetries = 3;

    constructor(private readonly promptRegistry: PromptRegistryService) {
        if (process.env.OPENAI_API_KEY) {
            this.openai = new OpenAI({
                apiKey: process.env.OPENAI_API_KEY,
            });
        } else {
            this.logger.warn("OPENAI_API_KEY not configured - agents will use mock responses");
        }
    }

    async executeAgent<TInput, TOutput>(
        agentType: AgentType,
        input: AgentInput<TInput>,
        variables: PromptVariables,
        options: AgentExecutionOptions = {}
    ): Promise<AgentExecutionResult<TOutput>> {
        const startedAt = new Date();
        const { promptVersion, retryCount = this.maxRetries } = options;

        this.logger.log(`Executing agent: ${agentType} for session ${input.context.sessionId}`);

        try {
            // Get compiled prompt
            const compiled = this.promptRegistry.compilePrompt(agentType, variables, promptVersion);
            const usedVersion = this.promptRegistry.getPrompt(agentType, promptVersion)?.version || "unknown";

            // Execute with retries
            let lastError: Error | null = null;
            for (let attempt = 1; attempt <= retryCount; attempt++) {
                try {
                    const result = await this.callLLM<TOutput>(compiled, agentType);
                    const completedAt = new Date();

                    const output: AgentOutput<TOutput> = {
                        agentType,
                        status: AgentStatus.COMPLETED,
                        data: result.data,
                        metadata: {
                            startedAt,
                            completedAt,
                            durationMs: completedAt.getTime() - startedAt.getTime(),
                            promptVersion: usedVersion,
                            tokenUsage: result.tokenUsage,
                        },
                    };

                    return {
                        output,
                        promptVersion: usedVersion,
                        rawResponse: result.rawResponse,
                    };
                } catch (error) {
                    lastError = error instanceof Error ? error : new Error(String(error));
                    this.logger.warn(
                        `Agent ${agentType} attempt ${attempt}/${retryCount} failed: ${lastError.message}`
                    );

                    if (attempt < retryCount) {
                        await this.delay(Math.pow(2, attempt) * 1000); // Exponential backoff
                    }
                }
            }

            // All retries failed
            throw lastError || new Error("Unknown error");
        } catch (error) {
            const completedAt = new Date();
            const errorMessage = error instanceof Error ? error.message : "Unknown error";

            const output: AgentOutput<TOutput> = {
                agentType,
                status: AgentStatus.FAILED,
                data: null,
                error: errorMessage,
                metadata: {
                    startedAt,
                    completedAt,
                    durationMs: completedAt.getTime() - startedAt.getTime(),
                },
            };

            return {
                output,
                promptVersion: "error",
            };
        }
    }

    private async callLLM<T>(
        compiled: CompiledPrompt,
        agentType: AgentType
    ): Promise<{ data: T; rawResponse: string; tokenUsage?: { input: number; output: number; total: number } }> {
        if (!this.openai) {
            // Return mock data when OpenAI is not configured
            this.logger.debug(`Returning mock response for ${agentType}`);
            const mockData = this.getMockResponse<T>(agentType);
            return {
                data: mockData,
                rawResponse: JSON.stringify(mockData),
            };
        }

        const completion = await this.openai.chat.completions.create({
            model: compiled.model,
            messages: [
                { role: "system", content: compiled.systemPrompt },
                { role: "user", content: compiled.userPrompt },
            ],
            temperature: compiled.temperature,
            max_tokens: compiled.maxTokens,
            response_format: { type: "json_object" },
        });

        const rawResponse = completion.choices[0]?.message?.content || "{}";
        const data = JSON.parse(rawResponse) as T;

        return {
            data,
            rawResponse,
            tokenUsage: completion.usage
                ? {
                      input: completion.usage.prompt_tokens,
                      output: completion.usage.completion_tokens,
                      total: completion.usage.total_tokens,
                  }
                : undefined,
        };
    }

    private getMockResponse<T>(agentType: AgentType): T {
        const mocks: Record<string, unknown> = {
            [AgentType.TREND_RESEARCH]: {
                trends: [
                    {
                        platform: "TIKTOK",
                        topic: "AI-powered productivity hacks",
                        score: 85,
                        hashtags: ["#AIHacks", "#ProductivityTips", "#TechLife"],
                        sampleUrls: [],
                        peakTiming: "6PM-9PM",
                    },
                    {
                        platform: "INSTAGRAM",
                        topic: "Sustainable business practices",
                        score: 72,
                        hashtags: ["#SustainableBusiness", "#GreenTech", "#EcoFriendly"],
                        sampleUrls: [],
                        peakTiming: "12PM-2PM",
                    },
                ],
                insights: [
                    "AI content continues to outperform across all platforms",
                    "Sustainability messaging resonates strongly with Gen Z audiences",
                ],
                generatedAt: new Date().toISOString(),
            },
            [AgentType.STRATEGY]: {
                name: "Q1 Growth Strategy",
                goals: [
                    { objective: "Increase brand awareness", metric: "Follower count", target: "+25%" },
                    { objective: "Drive engagement", metric: "Engagement rate", target: "5%" },
                ],
                pillars: [
                    {
                        name: "Educational Content",
                        description: "Industry insights and how-to guides",
                        contentTypes: ["SHORT_VIDEO", "CAROUSEL"],
                    },
                    {
                        name: "Behind the Scenes",
                        description: "Team culture and process content",
                        contentTypes: ["SHORT_VIDEO", "IMAGE"],
                    },
                ],
                platformFocus: [
                    { platform: "TIKTOK", frequency: "5x/week", bestTimes: ["6PM", "9PM"] },
                    { platform: "INSTAGRAM", frequency: "7x/week", bestTimes: ["12PM", "6PM"] },
                ],
                recommendations: [
                    "Focus on short-form video content",
                    "Increase posting frequency on TikTok",
                ],
            },
            [AgentType.PLANNER]: {
                items: [
                    {
                        date: new Date().toISOString(),
                        platform: "TIKTOK",
                        format: "SHORT_VIDEO",
                        pillar: "Educational Content",
                        topicSuggestion: "5 AI tools for marketers",
                    },
                ],
            },
            [AgentType.SCRIPT_WRITER]: {
                title: "5 AI Tools Every Marketer Needs",
                hook: "Are you still doing marketing the old way?",
                script:
                    "Hook: Are you still doing marketing the old way? Here are 5 AI tools that changed everything...",
                callToAction: "Follow for more marketing tips!",
                estimatedDuration: 45,
                keyPoints: ["Tool recommendations", "Time savings", "ROI impact"],
            },
            [AgentType.CAPTION_WRITER]: {
                caption: "The future of marketing is here. Are you ready? 🚀",
                hashtags: ["#Marketing", "#AI", "#GrowthHacking"],
                emojis: ["🚀", "💡", "📈"],
                alternativeCaptions: [
                    "Marketing will never be the same. Here's why...",
                    "We tested these AI tools so you don't have to.",
                ],
            },
            [AgentType.COMPLIANCE]: {
                isCompliant: true,
                score: 95,
                issues: [],
                suggestions: ["Consider adding a disclaimer for any product claims"],
            },
            [AgentType.ANALYTICS]: {
                summary: {
                    totalViews: 125000,
                    totalEngagement: 8500,
                    avgEngagementRate: 6.8,
                    topPerformingContent: ["content-123", "content-456"],
                },
                byPlatform: {
                    TIKTOK: { views: 75000, likes: 4000, comments: 500, shares: 200, engagementRate: 6.3 },
                    INSTAGRAM: { views: 50000, likes: 3500, comments: 300, shares: 0, engagementRate: 7.6 },
                },
                insights: ["TikTok driving highest reach", "Instagram has better engagement rate"],
                recommendations: ["Double down on TikTok content volume"],
            },
            [AgentType.LEARNING]: {
                patterns: [
                    {
                        type: "timing",
                        insight: "Posts at 6PM consistently outperform",
                        confidence: 0.85,
                        recommendation: "Schedule key content for 6PM local time",
                    },
                ],
                bestPractices: ["Use hooks in first 3 seconds", "Include CTA in every video"],
                strategyAdjustments: ["Consider increasing TikTok posting frequency"],
            },
            [AgentType.REPORTING]: {
                title: "Weekly Performance Report",
                period: "Last 7 days",
                sections: [
                    {
                        title: "Performance Summary",
                        content: "Strong week with 15% growth in engagement",
                        metrics: { views: 125000, engagement: 8500 },
                    },
                ],
                highlights: ["Best performing week this quarter", "TikTok content going viral"],
                actionItems: ["Review and replicate top performing content", "Test new content formats"],
            },
        };

        return (mocks[agentType] || {}) as T;
    }

    createAgentContext(
        tenantId: string,
        userId: string,
        options: Partial<AgentContext> = {}
    ): AgentContext {
        return {
            tenantId,
            userId,
            sessionId: `session_${Date.now()}_${Math.random().toString(36).substring(7)}`,
            ...options,
        };
    }

    private delay(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
}
