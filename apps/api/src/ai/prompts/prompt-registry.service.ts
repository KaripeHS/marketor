import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { AgentType } from "@growthpilot/shared";

export interface PromptTemplate {
    id: string;
    agentType: AgentType;
    version: string;
    name: string;
    systemPrompt: string;
    userPromptTemplate: string;
    variables: string[];
    temperature?: number;
    maxTokens?: number;
    model?: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface PromptVariables {
    [key: string]: string | number | boolean | object;
}

export interface CompiledPrompt {
    systemPrompt: string;
    userPrompt: string;
    temperature: number;
    maxTokens: number;
    model: string;
}

@Injectable()
export class PromptRegistryService implements OnModuleInit {
    private readonly logger = new Logger(PromptRegistryService.name);
    private prompts: Map<string, PromptTemplate[]> = new Map();

    // Default model settings
    private readonly defaultModel = "gpt-4-turbo-preview";
    private readonly defaultTemperature = 0.7;
    private readonly defaultMaxTokens = 4096;

    onModuleInit() {
        this.registerDefaultPrompts();
        this.logger.log(`Prompt registry initialized with ${this.getPromptCount()} prompts`);
    }

    private getPromptCount(): number {
        let count = 0;
        this.prompts.forEach((versions) => {
            count += versions.length;
        });
        return count;
    }

    private registerDefaultPrompts(): void {
        // Trend Research Agent
        this.registerPrompt({
            agentType: AgentType.TREND_RESEARCH,
            version: "1.0.0",
            name: "Trend Research v1",
            systemPrompt: `You are an expert social media trend analyst. Your role is to identify viral content patterns, trending topics, and emerging hashtags across social platforms.

Key responsibilities:
- Analyze content patterns that drive engagement
- Identify trending hashtags and topics in specific industries
- Understand platform-specific content preferences
- Predict content performance based on historical patterns

Always provide actionable insights with confidence scores.`,
            userPromptTemplate: `Analyze trends for the following parameters:

Platforms: {{platforms}}
Industry: {{industry}}
Keywords: {{keywords}}
Lookback Period: {{lookbackDays}} days

Provide:
1. Top trending topics with engagement scores (0-100)
2. Relevant hashtags for each trend
3. Best posting times
4. Content format recommendations
5. Key insights and actionable recommendations`,
            variables: ["platforms", "industry", "keywords", "lookbackDays"],
            temperature: 0.7,
            maxTokens: 2048,
        });

        // Strategy Agent
        this.registerPrompt({
            agentType: AgentType.STRATEGY,
            version: "1.0.0",
            name: "Strategy Generator v1",
            systemPrompt: `You are a strategic content marketing expert specializing in social media growth. You create data-driven content strategies that align brand values with audience preferences.

Key responsibilities:
- Develop content pillars that resonate with target audiences
- Create goal-oriented strategies with measurable KPIs
- Balance brand consistency with platform-specific optimization
- Incorporate trend insights into strategic planning`,
            userPromptTemplate: `Create a content strategy based on:

Brand Voice: {{brandVoice}}
Target Audiences: {{audiences}}
Value Propositions: {{valueProps}}
Timeframe: {{timeframeDays}} days

{{#if trends}}
Current Trends:
{{trends}}
{{/if}}

Deliver a comprehensive strategy including:
1. Strategic name and overview
2. SMART goals with specific metrics and targets
3. Content pillars with descriptions and recommended formats
4. Platform-specific recommendations (frequency, best times)
5. Actionable recommendations for implementation`,
            variables: ["brandVoice", "audiences", "valueProps", "timeframeDays", "trends"],
            temperature: 0.8,
            maxTokens: 3072,
        });

        // Planner Agent
        this.registerPrompt({
            agentType: AgentType.PLANNER,
            version: "1.0.0",
            name: "Content Planner v1",
            systemPrompt: `You are a content calendar planning specialist. You excel at creating balanced, strategic content schedules that maintain audience engagement while supporting business goals.

Key responsibilities:
- Plan content distribution across platforms
- Balance content types and pillars
- Optimize posting schedules for maximum reach
- Avoid content fatigue while maintaining consistency`,
            userPromptTemplate: `Create a content calendar based on:

Strategy: {{strategyName}}
Content Pillars: {{pillars}}
Platform Focus: {{platformFocus}}
Date Range: {{startDate}} to {{endDate}}
Target Content Count: {{contentCount}}

{{#if existingContent}}
Existing Scheduled Content:
{{existingContent}}
{{/if}}

Generate a detailed content plan with:
1. Specific dates for each content piece
2. Platform assignments
3. Content format recommendations
4. Pillar alignment
5. Topic suggestions
6. Any special notes or timing considerations`,
            variables: ["strategyName", "pillars", "platformFocus", "startDate", "endDate", "contentCount", "existingContent"],
            temperature: 0.6,
            maxTokens: 4096,
        });

        // Script Writer Agent
        this.registerPrompt({
            agentType: AgentType.SCRIPT_WRITER,
            version: "1.0.0",
            name: "Script Writer v1",
            systemPrompt: `You are a professional video script writer specializing in short-form social media content. You create engaging, platform-optimized scripts that capture attention and drive action.

Key responsibilities:
- Write hooks that stop the scroll
- Structure content for maximum retention
- Match brand voice and tone
- Include effective calls-to-action
- Optimize for platform-specific formats`,
            userPromptTemplate: `Write a video script for:

Topic: {{topic}}
Platform: {{platform}}
Format: {{format}}
Brand Voice: {{brandVoice}}
Target Audience: {{targetAudience}}
Target Duration: {{duration}} seconds

{{#if trendContext}}
Trend Context: {{trendContext}}
{{/if}}

Deliver:
1. Attention-grabbing title
2. Strong hook (first 3 seconds)
3. Full script with timing notes
4. Clear call-to-action
5. Estimated duration
6. Key talking points summary`,
            variables: ["topic", "platform", "format", "brandVoice", "targetAudience", "duration", "trendContext"],
            temperature: 0.8,
            maxTokens: 2048,
        });

        // Caption Writer Agent
        this.registerPrompt({
            agentType: AgentType.CAPTION_WRITER,
            version: "1.0.0",
            name: "Caption Writer v1",
            systemPrompt: `You are a social media caption specialist who crafts engaging, platform-optimized captions. You understand how different platforms reward different caption styles and hashtag strategies.

Key responsibilities:
- Write captions that complement visual content
- Use platform-appropriate length and style
- Select effective hashtags
- Include appropriate emojis
- Drive engagement and action`,
            userPromptTemplate: `Write a caption for:

Topic: {{topic}}
Platform: {{platform}}
Brand Voice: {{brandVoice}}
Maximum Length: {{maxLength}} characters

{{#if script}}
Related Script/Content:
{{script}}
{{/if}}

Provide:
1. Primary caption
2. Relevant hashtags (platform-appropriate count)
3. Suggested emojis
4. 2-3 alternative caption options`,
            variables: ["topic", "platform", "brandVoice", "maxLength", "script"],
            temperature: 0.8,
            maxTokens: 1024,
        });

        // Compliance Agent
        this.registerPrompt({
            agentType: AgentType.COMPLIANCE,
            version: "1.0.0",
            name: "Compliance Reviewer v1",
            systemPrompt: `You are a content compliance expert specializing in social media and advertising regulations. You review content for potential issues before publication.

Key responsibilities:
- Identify regulatory compliance issues
- Flag platform policy violations
- Detect potentially problematic claims
- Suggest safer alternatives
- Assess brand safety risks`,
            userPromptTemplate: `Review the following content for compliance:

Content Type: {{contentType}}
Platform: {{platform}}
Industry: {{industry}}

Content:
{{content}}

{{#if rules}}
Additional Rules to Check:
{{rules}}
{{/if}}

Provide:
1. Overall compliance status (compliant/non-compliant)
2. Compliance score (0-100)
3. List of issues found with severity (error/warning/info)
4. Specific suggestions for each issue
5. General recommendations for improvement`,
            variables: ["contentType", "platform", "industry", "content", "rules"],
            temperature: 0.3,
            maxTokens: 2048,
        });

        // Analytics Agent
        this.registerPrompt({
            agentType: AgentType.ANALYTICS,
            version: "1.0.0",
            name: "Analytics Analyst v1",
            systemPrompt: `You are a social media analytics expert who transforms raw performance data into actionable insights. You identify patterns, anomalies, and opportunities in content performance.

Key responsibilities:
- Analyze engagement metrics across platforms
- Identify high-performing content patterns
- Detect underperforming content issues
- Provide data-driven recommendations
- Track progress toward goals`,
            userPromptTemplate: `Analyze the following performance data:

Platforms: {{platforms}}
Date Range: {{dateRange}}
Metrics Focus: {{metrics}}

Performance Data:
{{performanceData}}

Provide:
1. Executive summary with key metrics
2. Platform-by-platform breakdown
3. Top performing content identification
4. Pattern analysis and insights
5. Data-driven recommendations for improvement`,
            variables: ["platforms", "dateRange", "metrics", "performanceData"],
            temperature: 0.5,
            maxTokens: 3072,
        });

        // Learning Agent
        this.registerPrompt({
            agentType: AgentType.LEARNING,
            version: "1.0.0",
            name: "Learning Agent v1",
            systemPrompt: `You are a machine learning insights specialist who extracts patterns from content performance data to improve future content strategy. You identify what works and why.

Key responsibilities:
- Identify successful content patterns
- Correlate content attributes with performance
- Generate actionable learning insights
- Recommend strategy adjustments
- Track improvement over time`,
            userPromptTemplate: `Analyze content performance patterns:

Analytics Summary:
{{analyticsData}}

Content Details:
{{contentData}}

{{#if strategyId}}
Current Strategy ID: {{strategyId}}
{{/if}}

Extract:
1. Key performance patterns (timing, format, topic, length, hashtags)
2. Confidence level for each pattern
3. Specific recommendations based on learnings
4. Best practices derived from data
5. Suggested strategy adjustments`,
            variables: ["analyticsData", "contentData", "strategyId"],
            temperature: 0.5,
            maxTokens: 2048,
        });

        // Reporting Agent
        this.registerPrompt({
            agentType: AgentType.REPORTING,
            version: "1.0.0",
            name: "Report Generator v1",
            systemPrompt: `You are a professional report writer who creates clear, actionable reports for marketing teams and stakeholders. You present data in compelling narratives.

Key responsibilities:
- Structure reports for different audiences
- Highlight key achievements and concerns
- Present data with context and meaning
- Provide clear action items
- Maintain consistent reporting standards`,
            userPromptTemplate: `Generate a {{reportType}} report:

Period: {{dateRange}}
Include Analytics: {{includeAnalytics}}
Include Learnings: {{includeLearnings}}
Include Recommendations: {{includeRecommendations}}

Data:
{{reportData}}

Create a report with:
1. Executive summary
2. Performance highlights
3. Detailed metrics by section
4. Key insights and learnings
5. Action items for next period
6. Appendix with supporting data`,
            variables: ["reportType", "dateRange", "includeAnalytics", "includeLearnings", "includeRecommendations", "reportData"],
            temperature: 0.6,
            maxTokens: 4096,
        });
    }

    registerPrompt(config: Omit<PromptTemplate, "id" | "isActive" | "createdAt" | "updatedAt">): PromptTemplate {
        const now = new Date();
        const id = `${config.agentType}_${config.version}_${Date.now()}`;

        const prompt: PromptTemplate = {
            ...config,
            id,
            isActive: true,
            createdAt: now,
            updatedAt: now,
        };

        const key = config.agentType;
        const existing = this.prompts.get(key) || [];
        existing.push(prompt);
        this.prompts.set(key, existing);

        this.logger.debug(`Registered prompt: ${config.name} (${config.version})`);
        return prompt;
    }

    getPrompt(agentType: AgentType, version?: string): PromptTemplate | null {
        const prompts = this.prompts.get(agentType);
        if (!prompts || prompts.length === 0) {
            return null;
        }

        if (version) {
            return prompts.find((p) => p.version === version && p.isActive) || null;
        }

        // Return latest active version
        const activePrompts = prompts.filter((p) => p.isActive);
        if (activePrompts.length === 0) {
            return null;
        }

        return activePrompts.sort((a, b) =>
            this.compareVersions(b.version, a.version)
        )[0];
    }

    getAllPrompts(agentType?: AgentType): PromptTemplate[] {
        if (agentType) {
            return this.prompts.get(agentType) || [];
        }

        const all: PromptTemplate[] = [];
        this.prompts.forEach((prompts) => {
            all.push(...prompts);
        });
        return all;
    }

    compilePrompt(agentType: AgentType, variables: PromptVariables, version?: string): CompiledPrompt {
        const template = this.getPrompt(agentType, version);
        if (!template) {
            throw new Error(`No prompt template found for agent type: ${agentType}`);
        }

        const userPrompt = this.interpolateTemplate(template.userPromptTemplate, variables);

        return {
            systemPrompt: template.systemPrompt,
            userPrompt,
            temperature: template.temperature ?? this.defaultTemperature,
            maxTokens: template.maxTokens ?? this.defaultMaxTokens,
            model: template.model ?? this.defaultModel,
        };
    }

    private interpolateTemplate(template: string, variables: PromptVariables): string {
        let result = template;

        // Handle conditional blocks {{#if variable}}...{{/if}}
        const conditionalRegex = /\{\{#if\s+(\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g;
        result = result.replace(conditionalRegex, (_, varName, content) => {
            const value = variables[varName];
            if (value !== undefined && value !== null && value !== "") {
                return content;
            }
            return "";
        });

        // Handle simple variable substitution {{variable}}
        const variableRegex = /\{\{(\w+)\}\}/g;
        result = result.replace(variableRegex, (_, varName) => {
            const value = variables[varName];
            if (value === undefined || value === null) {
                return "";
            }
            if (typeof value === "object") {
                return JSON.stringify(value, null, 2);
            }
            return String(value);
        });

        return result.trim();
    }

    private compareVersions(a: string, b: string): number {
        const partsA = a.split(".").map(Number);
        const partsB = b.split(".").map(Number);

        for (let i = 0; i < Math.max(partsA.length, partsB.length); i++) {
            const partA = partsA[i] || 0;
            const partB = partsB[i] || 0;
            if (partA !== partB) {
                return partA - partB;
            }
        }
        return 0;
    }

    deactivatePrompt(agentType: AgentType, version: string): boolean {
        const prompts = this.prompts.get(agentType);
        if (!prompts) {
            return false;
        }

        const prompt = prompts.find((p) => p.version === version);
        if (prompt) {
            prompt.isActive = false;
            prompt.updatedAt = new Date();
            return true;
        }
        return false;
    }

    getPromptVersions(agentType: AgentType): string[] {
        const prompts = this.prompts.get(agentType);
        if (!prompts) {
            return [];
        }
        return prompts.map((p) => p.version).sort((a, b) => this.compareVersions(b, a));
    }
}
