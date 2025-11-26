import { Injectable, Logger } from "@nestjs/common";
import { Platform } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import {
    ComplianceRulesService,
    ContentToCheck,
    RuleViolation,
    RuleSeverity,
} from "./compliance-rules.service";

export interface ComplianceCheckResult {
    isCompliant: boolean;
    score: number; // 0-100, 100 = fully compliant
    violations: RuleViolation[];
    warnings: RuleViolation[];
    info: RuleViolation[];
    summary: string;
    checkedAt: Date;
    rulesChecked: number;
    contentId?: string;
}

export interface ComplianceCheckOptions {
    industry?: string;
    rulesets?: string[];
    skipRules?: string[];
    strictMode?: boolean; // Treat warnings as errors
}

@Injectable()
export class ComplianceGuardianService {
    private readonly logger = new Logger(ComplianceGuardianService.name);

    // Severity weights for scoring
    private readonly severityWeights: Record<RuleSeverity, number> = {
        critical: 50,
        high: 25,
        medium: 10,
        low: 5,
        info: 0,
    };

    constructor(
        private readonly prisma: PrismaService,
        private readonly rulesService: ComplianceRulesService
    ) {}

    async checkContent(
        content: ContentToCheck,
        options: ComplianceCheckOptions = {}
    ): Promise<ComplianceCheckResult> {
        const { industry, rulesets, skipRules = [], strictMode = false } = options;

        this.logger.debug(`Checking content for platform: ${content.platform}`);

        // Get applicable rules
        let rules = rulesets
            ? rulesets.flatMap((rs) => this.rulesService.getRuleset(rs))
            : this.rulesService.getAllRules();

        // Filter by platform
        rules = rules.filter(
            (rule) => !rule.platforms || rule.platforms.includes(content.platform)
        );

        // Filter by industry if specified
        if (industry) {
            rules = rules.filter(
                (rule) => !rule.industries || rule.industries.includes(industry)
            );
        }

        // Skip specified rules
        rules = rules.filter((rule) => !skipRules.includes(rule.id));

        // Run all checks
        const allViolations: RuleViolation[] = [];

        for (const rule of rules) {
            if (rule.check) {
                try {
                    const violation = rule.check(content);
                    if (violation) {
                        allViolations.push(violation);
                    }
                } catch (error) {
                    this.logger.warn(`Rule ${rule.id} check failed:`, error);
                }
            }
        }

        // Categorize violations
        const violations = allViolations.filter(
            (v) => v.severity === "critical" || v.severity === "high"
        );
        const warnings = allViolations.filter((v) => v.severity === "medium");
        const info = allViolations.filter(
            (v) => v.severity === "low" || v.severity === "info"
        );

        // Calculate score
        const score = this.calculateScore(allViolations);

        // Determine compliance status
        const isCompliant = strictMode
            ? violations.length === 0 && warnings.length === 0
            : violations.length === 0;

        // Generate summary
        const summary = this.generateSummary(violations, warnings, info, isCompliant);

        return {
            isCompliant,
            score,
            violations,
            warnings,
            info,
            summary,
            checkedAt: new Date(),
            rulesChecked: rules.length,
        };
    }

    async checkContentById(
        contentId: string,
        options: ComplianceCheckOptions = {}
    ): Promise<ComplianceCheckResult> {
        const content = await this.prisma.contentItem.findUnique({
            where: { id: contentId },
        });

        if (!content) {
            throw new Error(`Content not found: ${contentId}`);
        }

        const contentToCheck: ContentToCheck = {
            title: content.title || undefined,
            script: content.script || undefined,
            caption: content.caption || undefined,
            hashtags: content.hashtags,
            platform: content.platform,
            mediaUrl: content.mediaUrl || undefined,
        };

        const result = await this.checkContent(contentToCheck, options);
        result.contentId = contentId;

        // Log the compliance check
        await this.logComplianceCheck(contentId, result);

        return result;
    }

    private calculateScore(violations: RuleViolation[]): number {
        if (violations.length === 0) return 100;

        let deductions = 0;
        for (const violation of violations) {
            deductions += this.severityWeights[violation.severity];
        }

        // Cap deductions at 100
        return Math.max(0, 100 - deductions);
    }

    private generateSummary(
        violations: RuleViolation[],
        warnings: RuleViolation[],
        info: RuleViolation[],
        isCompliant: boolean
    ): string {
        if (isCompliant && warnings.length === 0 && info.length === 0) {
            return "Content passed all compliance checks.";
        }

        const parts: string[] = [];

        if (!isCompliant) {
            parts.push(`${violations.length} critical/high severity issue(s) found.`);
        }

        if (warnings.length > 0) {
            parts.push(`${warnings.length} warning(s) to review.`);
        }

        if (info.length > 0) {
            parts.push(`${info.length} informational note(s).`);
        }

        if (isCompliant) {
            parts.unshift("Content is compliant with minor items to review:");
        } else {
            parts.unshift("Content requires attention before publishing:");
        }

        return parts.join(" ");
    }

    private async logComplianceCheck(
        contentId: string,
        result: ComplianceCheckResult
    ): Promise<void> {
        try {
            await this.prisma.auditLog.create({
                data: {
                    action: "compliance_check",
                    targetType: "content",
                    targetId: contentId,
                    meta: {
                        isCompliant: result.isCompliant,
                        score: result.score,
                        violationCount: result.violations.length,
                        warningCount: result.warnings.length,
                        rulesChecked: result.rulesChecked,
                    },
                },
            });
        } catch (error) {
            this.logger.warn("Failed to log compliance check:", error);
        }
    }

    // Quick check methods for specific categories
    async checkForPII(text: string): Promise<RuleViolation[]> {
        const content: ContentToCheck = {
            script: text,
            platform: "TIKTOK" as Platform, // Platform doesn't matter for PII
        };

        const result = await this.checkContent(content, {
            rulesets: ["privacy_pii"],
        });

        return [...result.violations, ...result.warnings, ...result.info];
    }

    async checkForMedicalClaims(text: string, platform: Platform): Promise<RuleViolation[]> {
        const content: ContentToCheck = {
            script: text,
            platform,
        };

        const result = await this.checkContent(content, {
            rulesets: ["medical_general"],
            industry: "healthcare",
        });

        return [...result.violations, ...result.warnings];
    }

    async checkForFinancialClaims(text: string, platform: Platform): Promise<RuleViolation[]> {
        const content: ContentToCheck = {
            script: text,
            platform,
        };

        const result = await this.checkContent(content, {
            rulesets: ["financial_general"],
            industry: "finance",
        });

        return [...result.violations, ...result.warnings];
    }

    // Batch check for multiple content items
    async batchCheck(
        contentIds: string[],
        options: ComplianceCheckOptions = {}
    ): Promise<Map<string, ComplianceCheckResult>> {
        const results = new Map<string, ComplianceCheckResult>();

        for (const contentId of contentIds) {
            try {
                const result = await this.checkContentById(contentId, options);
                results.set(contentId, result);
            } catch (error) {
                this.logger.warn(`Batch check failed for ${contentId}:`, error);
                results.set(contentId, {
                    isCompliant: false,
                    score: 0,
                    violations: [],
                    warnings: [],
                    info: [],
                    summary: `Check failed: ${error instanceof Error ? error.message : "Unknown error"}`,
                    checkedAt: new Date(),
                    rulesChecked: 0,
                    contentId,
                });
            }
        }

        return results;
    }
}
