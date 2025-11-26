import { Body, Controller, Get, Param, Post, Query } from "@nestjs/common";
import { IsArray, IsBoolean, IsEnum, IsOptional, IsString } from "class-validator";
import { Platform } from "@prisma/client";
import { Auth } from "../auth/auth.decorator";
import { AuthContext } from "../auth/auth.types";
import { Roles } from "../auth/roles.decorator";
import { ComplianceGuardianService } from "./compliance-guardian.service";
import { ComplianceRulesService, ContentToCheck } from "./compliance-rules.service";

class CheckContentDto {
    @IsOptional()
    @IsString()
    title?: string;

    @IsOptional()
    @IsString()
    script?: string;

    @IsOptional()
    @IsString()
    caption?: string;

    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    hashtags?: string[];

    @IsEnum(Platform)
    platform!: Platform;

    @IsOptional()
    @IsString()
    industry?: string;

    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    rulesets?: string[];

    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    skipRules?: string[];

    @IsOptional()
    @IsBoolean()
    strictMode?: boolean;
}

class BatchCheckDto {
    @IsArray()
    @IsString({ each: true })
    contentIds!: string[];

    @IsOptional()
    @IsString()
    industry?: string;

    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    rulesets?: string[];

    @IsOptional()
    @IsBoolean()
    strictMode?: boolean;
}

class QuickCheckDto {
    @IsString()
    text!: string;

    @IsOptional()
    @IsEnum(Platform)
    platform?: Platform;
}

@Controller("compliance")
export class ComplianceController {
    constructor(
        private readonly guardian: ComplianceGuardianService,
        private readonly rules: ComplianceRulesService
    ) {}

    // Rules endpoints

    @Get("rules")
    listRules(
        @Query("ruleset") ruleset?: string,
        @Query("industry") industry?: string,
        @Query("platform") platform?: Platform
    ) {
        if (ruleset) {
            return this.rules.getRuleset(ruleset);
        }
        if (industry) {
            return this.rules.getRulesForIndustry(industry);
        }
        if (platform) {
            return this.rules.getRulesForPlatform(platform);
        }
        return this.rules.getAllRules().map((rule) => ({
            id: rule.id,
            ruleset: rule.ruleset,
            name: rule.name,
            description: rule.description,
            severity: rule.severity,
            category: rule.category,
            platforms: rule.platforms,
            industries: rule.industries,
        }));
    }

    @Get("rules/rulesets")
    listRulesets() {
        const rulesets = this.rules.getAllRulesets();
        return rulesets.map((name) => ({
            name,
            ruleCount: this.rules.getRuleset(name).length,
        }));
    }

    @Get("rules/:ruleId")
    getRule(@Param("ruleId") ruleId: string) {
        const rule = this.rules.getRuleById(ruleId);
        if (!rule) {
            return { error: "Rule not found", ruleId };
        }
        return {
            id: rule.id,
            ruleset: rule.ruleset,
            name: rule.name,
            description: rule.description,
            severity: rule.severity,
            category: rule.category,
            platforms: rule.platforms,
            industries: rule.industries,
        };
    }

    // Check endpoints

    @Post("check")
    @Roles("ADMIN", "AGENCY", "CLIENT")
    async checkContent(@Body() dto: CheckContentDto, @Auth() _auth: AuthContext) {
        const content: ContentToCheck = {
            title: dto.title,
            script: dto.script,
            caption: dto.caption,
            hashtags: dto.hashtags,
            platform: dto.platform,
            industry: dto.industry,
        };

        return this.guardian.checkContent(content, {
            industry: dto.industry,
            rulesets: dto.rulesets,
            skipRules: dto.skipRules,
            strictMode: dto.strictMode,
        });
    }

    @Post("check/:contentId")
    @Roles("ADMIN", "AGENCY", "CLIENT")
    async checkContentById(
        @Param("contentId") contentId: string,
        @Query("industry") industry?: string,
        @Query("strictMode") strictMode?: string,
        @Auth() _auth?: AuthContext
    ) {
        return this.guardian.checkContentById(contentId, {
            industry,
            strictMode: strictMode === "true",
        });
    }

    @Post("check/batch")
    @Roles("ADMIN", "AGENCY")
    async batchCheck(@Body() dto: BatchCheckDto, @Auth() _auth: AuthContext) {
        const results = await this.guardian.batchCheck(dto.contentIds, {
            industry: dto.industry,
            rulesets: dto.rulesets,
            strictMode: dto.strictMode,
        });

        // Convert Map to object for JSON response
        const response: Record<string, unknown> = {};
        results.forEach((result, contentId) => {
            response[contentId] = result;
        });

        return {
            checked: dto.contentIds.length,
            results: response,
            summary: {
                compliant: Array.from(results.values()).filter((r) => r.isCompliant).length,
                nonCompliant: Array.from(results.values()).filter((r) => !r.isCompliant).length,
            },
        };
    }

    // Quick check endpoints for specific categories

    @Post("check/pii")
    @Roles("ADMIN", "AGENCY", "CLIENT")
    async checkPII(@Body() dto: QuickCheckDto, @Auth() _auth: AuthContext) {
        const violations = await this.guardian.checkForPII(dto.text);
        return {
            hasPII: violations.length > 0,
            violations,
        };
    }

    @Post("check/medical")
    @Roles("ADMIN", "AGENCY", "CLIENT")
    async checkMedical(@Body() dto: QuickCheckDto, @Auth() _auth: AuthContext) {
        const violations = await this.guardian.checkForMedicalClaims(
            dto.text,
            dto.platform || "TIKTOK"
        );
        return {
            hasIssues: violations.length > 0,
            violations,
        };
    }

    @Post("check/financial")
    @Roles("ADMIN", "AGENCY", "CLIENT")
    async checkFinancial(@Body() dto: QuickCheckDto, @Auth() _auth: AuthContext) {
        const violations = await this.guardian.checkForFinancialClaims(
            dto.text,
            dto.platform || "TIKTOK"
        );
        return {
            hasIssues: violations.length > 0,
            violations,
        };
    }
}
