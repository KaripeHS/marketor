import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { Platform } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

export type RuleSeverity = "critical" | "high" | "medium" | "low" | "info";

export interface ComplianceRuleDefinition {
    id: string;
    ruleset: string;
    severity: RuleSeverity;
    name: string;
    description: string;
    category: RuleCategory;
    platforms?: Platform[];
    industries?: string[];
    pattern?: RegExp;
    keywords?: string[];
    check?: (content: ContentToCheck) => RuleViolation | null;
}

export type RuleCategory =
    | "claims"
    | "pii"
    | "disclaimers"
    | "banned_content"
    | "platform_policy"
    | "medical"
    | "financial"
    | "legal"
    | "brand_safety";

export interface ContentToCheck {
    title?: string;
    script?: string;
    caption?: string;
    hashtags?: string[];
    platform: Platform;
    industry?: string;
    mediaUrl?: string;
}

export interface RuleViolation {
    ruleId: string;
    ruleset: string;
    severity: RuleSeverity;
    category: RuleCategory;
    message: string;
    suggestion?: string;
    location?: {
        field: "title" | "script" | "caption" | "hashtags" | "media";
        start?: number;
        end?: number;
        match?: string;
    };
}

@Injectable()
export class ComplianceRulesService implements OnModuleInit {
    private readonly logger = new Logger(ComplianceRulesService.name);
    private rules: Map<string, ComplianceRuleDefinition[]> = new Map();

    constructor(private readonly prisma: PrismaService) {}

    async onModuleInit() {
        this.registerDefaultRules();
        await this.loadRulesFromDatabase();
        this.logger.log(`Compliance rules loaded: ${this.getTotalRuleCount()} rules across ${this.rules.size} rulesets`);
    }

    private getTotalRuleCount(): number {
        let count = 0;
        this.rules.forEach((rules) => (count += rules.length));
        return count;
    }

    private registerDefaultRules(): void {
        // General platform policies
        this.registerRuleset("platform_general", [
            {
                id: "profanity_check",
                ruleset: "platform_general",
                severity: "high",
                name: "Profanity Detection",
                description: "Checks for explicit language that may violate platform policies",
                category: "platform_policy",
                keywords: ["fuck", "shit", "damn", "bitch", "ass", "crap"],
                check: (content) => this.checkKeywords(content, "profanity_check", "platform_general", "high", "platform_policy"),
            },
            {
                id: "spam_patterns",
                ruleset: "platform_general",
                severity: "medium",
                name: "Spam Pattern Detection",
                description: "Detects spam-like patterns (excessive caps, repetition)",
                category: "platform_policy",
                pattern: /(.)\1{4,}|[A-Z]{10,}/,
                check: (content) => this.checkPattern(content, "spam_patterns", "platform_general", "medium", "platform_policy", /(.)\1{4,}|[A-Z]{10,}/g, "Excessive repetition or caps lock detected"),
            },
            {
                id: "excessive_hashtags",
                ruleset: "platform_general",
                severity: "low",
                name: "Excessive Hashtags",
                description: "Too many hashtags can trigger spam filters",
                category: "platform_policy",
                check: (content) => {
                    if (content.hashtags && content.hashtags.length > 30) {
                        return {
                            ruleId: "excessive_hashtags",
                            ruleset: "platform_general",
                            severity: "low",
                            category: "platform_policy",
                            message: `Too many hashtags (${content.hashtags.length}). Most platforms recommend 5-15 hashtags.`,
                            suggestion: "Reduce hashtags to 5-15 most relevant ones",
                            location: { field: "hashtags" },
                        };
                    }
                    return null;
                },
            },
            {
                id: "link_in_caption",
                ruleset: "platform_general",
                severity: "info",
                name: "Link Detection",
                description: "Links in captions may not be clickable on some platforms",
                category: "platform_policy",
                pattern: /https?:\/\/[^\s]+/i,
                platforms: ["TIKTOK", "INSTAGRAM"],
                check: (content) => {
                    if (!["TIKTOK", "INSTAGRAM"].includes(content.platform)) return null;
                    const pattern = /https?:\/\/[^\s]+/i;
                    const text = `${content.caption || ""} ${content.script || ""}`;
                    if (pattern.test(text)) {
                        return {
                            ruleId: "link_in_caption",
                            ruleset: "platform_general",
                            severity: "info",
                            category: "platform_policy",
                            message: "Links in captions are not clickable on TikTok/Instagram",
                            suggestion: "Use 'link in bio' instead or move link to comments",
                        };
                    }
                    return null;
                },
            },
        ]);

        // Medical/Healthcare rules
        this.registerRuleset("medical_general", [
            {
                id: "cure_claims",
                ruleset: "medical_general",
                severity: "critical",
                name: "Cure/Treatment Claims",
                description: "Claims of guaranteed medical outcomes or cures",
                category: "medical",
                industries: ["healthcare", "medical", "wellness", "supplements"],
                pattern: /\b(cure[sd]?|treat[s]?|heal[s]?|eliminat(e|es|ing)|guaranteed|100%|proven to)\b.*\b(disease|illness|condition|cancer|diabetes|anxiety|depression)\b/i,
                check: (content) => this.checkPattern(
                    content,
                    "cure_claims",
                    "medical_general",
                    "critical",
                    "medical",
                    /\b(cure[sd]?|treat[s]?|heal[s]?|eliminat(e|es|ing)|guaranteed|100%|proven to)\b.*\b(disease|illness|condition|cancer|diabetes|anxiety|depression)\b/gi,
                    "Medical cure/treatment claims detected. This may violate FTC and FDA regulations.",
                    "Use language like 'may help support' or 'designed to assist with' instead of claiming cures"
                ),
            },
            {
                id: "before_after",
                ruleset: "medical_general",
                severity: "high",
                name: "Before/After Claims",
                description: "Before/after imagery or claims without disclaimers",
                category: "medical",
                industries: ["healthcare", "medical", "beauty", "fitness", "weight_loss"],
                pattern: /\b(before\s*(and|&|\/)\s*after|transformation|results?\s*(may\s*)?vary)\b/i,
                check: (content) => this.checkPattern(
                    content,
                    "before_after",
                    "medical_general",
                    "high",
                    "medical",
                    /\b(before\s*(and|&|\/)\s*after|transformation)\b/gi,
                    "Before/after claims detected. Medical board regulations may apply.",
                    "Add disclaimer: 'Individual results may vary. Consult a healthcare professional.'"
                ),
            },
            {
                id: "missing_medical_disclaimer",
                ruleset: "medical_general",
                severity: "medium",
                name: "Missing Medical Disclaimer",
                description: "Medical content should include appropriate disclaimers",
                category: "disclaimers",
                industries: ["healthcare", "medical", "wellness", "supplements", "fitness"],
                check: (content) => {
                    const text = `${content.caption || ""} ${content.script || ""}`.toLowerCase();
                    const medicalTerms = /\b(health|medical|treatment|therapy|doctor|physician|supplement|vitamin|diet|weight\s*loss|fitness)\b/i;
                    const hasDisclaimer = /\b(consult|disclaimer|not\s*medical\s*advice|results\s*may\s*vary|individual\s*results)\b/i;

                    if (medicalTerms.test(text) && !hasDisclaimer.test(text)) {
                        return {
                            ruleId: "missing_medical_disclaimer",
                            ruleset: "medical_general",
                            severity: "medium",
                            category: "disclaimers",
                            message: "Medical/health content detected without disclaimer",
                            suggestion: "Add: 'This is not medical advice. Consult a healthcare professional.'",
                        };
                    }
                    return null;
                },
            },
        ]);

        // Financial/Investment rules
        this.registerRuleset("financial_general", [
            {
                id: "investment_guarantees",
                ruleset: "financial_general",
                severity: "critical",
                name: "Investment Guarantee Claims",
                description: "Guaranteed returns or risk-free investment claims",
                category: "financial",
                industries: ["finance", "crypto", "investing", "trading"],
                pattern: /\b(guaranteed\s*(returns?|profits?|income)|risk[- ]?free|can'?t\s*lose|100%\s*(safe|secure|guaranteed))\b/i,
                check: (content) => this.checkPattern(
                    content,
                    "investment_guarantees",
                    "financial_general",
                    "critical",
                    "financial",
                    /\b(guaranteed\s*(returns?|profits?|income)|risk[- ]?free|can'?t\s*lose|100%\s*(safe|secure|guaranteed))\b/gi,
                    "Investment guarantee claims detected. This violates SEC and FTC regulations.",
                    "Remove guarantee language. Use: 'Past performance does not guarantee future results.'"
                ),
            },
            {
                id: "missing_financial_disclaimer",
                ruleset: "financial_general",
                severity: "high",
                name: "Missing Financial Disclaimer",
                description: "Financial content requires risk disclaimers",
                category: "disclaimers",
                industries: ["finance", "crypto", "investing", "trading"],
                check: (content) => {
                    const text = `${content.caption || ""} ${content.script || ""}`.toLowerCase();
                    const financeTerms = /\b(invest|stock|crypto|bitcoin|trading|returns?|portfolio|dividend)\b/i;
                    const hasDisclaimer = /\b(not\s*financial\s*advice|past\s*performance|risk|disclaimer|nfa|dyor)\b/i;

                    if (financeTerms.test(text) && !hasDisclaimer.test(text)) {
                        return {
                            ruleId: "missing_financial_disclaimer",
                            ruleset: "financial_general",
                            severity: "high",
                            category: "disclaimers",
                            message: "Financial content detected without disclaimer",
                            suggestion: "Add: 'Not financial advice. Investing involves risk. Past performance does not guarantee future results.'",
                        };
                    }
                    return null;
                },
            },
        ]);

        // PII/Privacy rules
        this.registerRuleset("privacy_pii", [
            {
                id: "phone_number",
                ruleset: "privacy_pii",
                severity: "high",
                name: "Phone Number Detection",
                description: "Detects phone numbers that may be PII",
                category: "pii",
                pattern: /\b(\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/,
                check: (content) => this.checkPattern(
                    content,
                    "phone_number",
                    "privacy_pii",
                    "high",
                    "pii",
                    /\b(\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g,
                    "Phone number detected. Consider privacy implications.",
                    "Remove or mask phone number if not intentional"
                ),
            },
            {
                id: "email_address",
                ruleset: "privacy_pii",
                severity: "medium",
                name: "Email Address Detection",
                description: "Detects email addresses that may be PII",
                category: "pii",
                pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/,
                check: (content) => this.checkPattern(
                    content,
                    "email_address",
                    "privacy_pii",
                    "medium",
                    "pii",
                    /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
                    "Email address detected. Consider privacy implications.",
                    "Use 'contact us' or 'link in bio' instead of exposing email"
                ),
            },
            {
                id: "ssn_pattern",
                ruleset: "privacy_pii",
                severity: "critical",
                name: "SSN Pattern Detection",
                description: "Detects patterns that look like Social Security Numbers",
                category: "pii",
                pattern: /\b\d{3}[-.\s]?\d{2}[-.\s]?\d{4}\b/,
                check: (content) => this.checkPattern(
                    content,
                    "ssn_pattern",
                    "privacy_pii",
                    "critical",
                    "pii",
                    /\b\d{3}[-.\s]?\d{2}[-.\s]?\d{4}\b/g,
                    "Potential SSN pattern detected. NEVER share SSNs in content.",
                    "Remove this number immediately"
                ),
            },
        ]);

        // Brand safety rules
        this.registerRuleset("brand_safety", [
            {
                id: "competitor_mention",
                ruleset: "brand_safety",
                severity: "medium",
                name: "Competitor Mention",
                description: "Mentions of competitors may need review",
                category: "brand_safety",
                // This would be customized per tenant
                check: () => null, // Placeholder - would check against tenant's competitor list
            },
            {
                id: "negative_sentiment",
                ruleset: "brand_safety",
                severity: "low",
                name: "Negative Sentiment",
                description: "Content with potentially negative tone",
                category: "brand_safety",
                keywords: ["hate", "terrible", "worst", "awful", "disgusting", "horrible"],
                check: (content) => this.checkKeywords(content, "negative_sentiment", "brand_safety", "low", "brand_safety"),
            },
            {
                id: "controversial_topics",
                ruleset: "brand_safety",
                severity: "high",
                name: "Controversial Topics",
                description: "Topics that may be polarizing",
                category: "brand_safety",
                keywords: ["politics", "religion", "abortion", "gun control", "immigration"],
                check: (content) => {
                    const keywords = ["politics", "political", "religion", "religious", "abortion", "gun control", "immigration", "democrat", "republican"];
                    const text = `${content.title || ""} ${content.script || ""} ${content.caption || ""}`.toLowerCase();
                    for (const keyword of keywords) {
                        if (text.includes(keyword)) {
                            return {
                                ruleId: "controversial_topics",
                                ruleset: "brand_safety",
                                severity: "high",
                                category: "brand_safety",
                                message: `Potentially controversial topic detected: "${keyword}"`,
                                suggestion: "Review for brand alignment. Consider if this topic supports brand values.",
                            };
                        }
                    }
                    return null;
                },
            },
        ]);
    }

    private registerRuleset(name: string, rules: ComplianceRuleDefinition[]): void {
        this.rules.set(name, rules);
    }

    private async loadRulesFromDatabase(): Promise<void> {
        try {
            const dbRules = await this.prisma.complianceRule.findMany();
            for (const rule of dbRules) {
                const existing = this.rules.get(rule.ruleset) || [];
                // Check if rule already exists (from defaults)
                if (!existing.find((r) => r.id === rule.ruleId)) {
                    existing.push({
                        id: rule.ruleId,
                        ruleset: rule.ruleset,
                        severity: rule.severity as RuleSeverity,
                        name: rule.ruleId,
                        description: rule.text,
                        category: "platform_policy",
                    });
                    this.rules.set(rule.ruleset, existing);
                }
            }
        } catch (error) {
            this.logger.warn("Could not load rules from database:", error);
        }
    }

    private checkKeywords(
        content: ContentToCheck,
        ruleId: string,
        ruleset: string,
        severity: RuleSeverity,
        category: RuleCategory
    ): RuleViolation | null {
        const rule = this.getRuleById(ruleId);
        if (!rule?.keywords) return null;

        const text = `${content.title || ""} ${content.script || ""} ${content.caption || ""}`.toLowerCase();

        for (const keyword of rule.keywords) {
            if (text.includes(keyword.toLowerCase())) {
                return {
                    ruleId,
                    ruleset,
                    severity,
                    category,
                    message: `Keyword detected: "${keyword}"`,
                    suggestion: `Consider removing or replacing "${keyword}"`,
                };
            }
        }
        return null;
    }

    private checkPattern(
        content: ContentToCheck,
        ruleId: string,
        ruleset: string,
        severity: RuleSeverity,
        category: RuleCategory,
        pattern: RegExp,
        message: string,
        suggestion?: string
    ): RuleViolation | null {
        const fields: Array<{ name: "title" | "script" | "caption"; value: string | undefined }> = [
            { name: "title", value: content.title },
            { name: "script", value: content.script },
            { name: "caption", value: content.caption },
        ];

        for (const field of fields) {
            if (!field.value) continue;
            const match = field.value.match(pattern);
            if (match) {
                return {
                    ruleId,
                    ruleset,
                    severity,
                    category,
                    message,
                    suggestion,
                    location: {
                        field: field.name,
                        match: match[0],
                    },
                };
            }
        }
        return null;
    }

    getRuleById(ruleId: string): ComplianceRuleDefinition | null {
        for (const [, rules] of this.rules) {
            const rule = rules.find((r) => r.id === ruleId);
            if (rule) return rule;
        }
        return null;
    }

    getRuleset(name: string): ComplianceRuleDefinition[] {
        return this.rules.get(name) || [];
    }

    getAllRulesets(): string[] {
        return Array.from(this.rules.keys());
    }

    getAllRules(): ComplianceRuleDefinition[] {
        const all: ComplianceRuleDefinition[] = [];
        this.rules.forEach((rules) => all.push(...rules));
        return all;
    }

    getRulesForIndustry(industry: string): ComplianceRuleDefinition[] {
        const result: ComplianceRuleDefinition[] = [];
        this.rules.forEach((rules) => {
            rules.forEach((rule) => {
                if (!rule.industries || rule.industries.includes(industry)) {
                    result.push(rule);
                }
            });
        });
        return result;
    }

    getRulesForPlatform(platform: Platform): ComplianceRuleDefinition[] {
        const result: ComplianceRuleDefinition[] = [];
        this.rules.forEach((rules) => {
            rules.forEach((rule) => {
                if (!rule.platforms || rule.platforms.includes(platform)) {
                    result.push(rule);
                }
            });
        });
        return result;
    }
}
