import { Body, Controller, Get, Param, Post, Query } from "@nestjs/common";
import { IsEnum, IsObject, IsOptional, IsString, IsNumber } from "class-validator";
import { Type } from "class-transformer";
import { AiService } from "./ai.service";
import { Auth } from "../auth/auth.decorator";
import { AuthContext } from "../auth/auth.types";
import { Roles } from "../auth/roles.decorator";
import { PromptRegistryService } from "./prompts/prompt-registry.service";
import { AgentOrchestratorService } from "./orchestrator/agent-orchestrator.service";
import { AgentType } from "@growthpilot/shared";

class GenerateAiDto {
    @IsEnum(["STRATEGY", "CONTENT"])
    type!: "STRATEGY" | "CONTENT";

    @IsObject()
    context!: Record<string, any>;

    @IsOptional()
    @IsString()
    prompt?: string;
}

class ExecuteAgentDto {
    @IsEnum(AgentType)
    agentType!: AgentType;

    @IsObject()
    variables!: Record<string, unknown>;

    @IsOptional()
    @IsString()
    promptVersion?: string;

    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    retryCount?: number;
}

class RegisterPromptDto {
    @IsEnum(AgentType)
    agentType!: AgentType;

    @IsString()
    version!: string;

    @IsString()
    name!: string;

    @IsString()
    systemPrompt!: string;

    @IsString()
    userPromptTemplate!: string;

    @IsString({ each: true })
    variables!: string[];

    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    temperature?: number;

    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    maxTokens?: number;

    @IsOptional()
    @IsString()
    model?: string;
}

@Controller("ai")
export class AiController {
    constructor(
        private readonly aiService: AiService,
        private readonly promptRegistry: PromptRegistryService,
        private readonly agentOrchestrator: AgentOrchestratorService
    ) { }

    @Post("generate")
    generate(@Body() dto: GenerateAiDto, @Auth() _auth: AuthContext) {
        return this.aiService.generate(dto.type, dto.context, dto.prompt);
    }

    // Prompt Registry Endpoints

    @Get("prompts")
    listPrompts(@Query("agentType") agentType?: AgentType) {
        return this.promptRegistry.getAllPrompts(agentType);
    }

    @Get("prompts/:agentType")
    getPrompt(
        @Param("agentType") agentType: AgentType,
        @Query("version") version?: string
    ) {
        const prompt = this.promptRegistry.getPrompt(agentType, version);
        if (!prompt) {
            return { error: "Prompt not found", agentType, version };
        }
        return prompt;
    }

    @Get("prompts/:agentType/versions")
    getPromptVersions(@Param("agentType") agentType: AgentType) {
        return {
            agentType,
            versions: this.promptRegistry.getPromptVersions(agentType),
        };
    }

    @Post("prompts")
    @Roles("ADMIN")
    registerPrompt(@Body() dto: RegisterPromptDto) {
        return this.promptRegistry.registerPrompt(dto);
    }

    @Post("prompts/:agentType/:version/deactivate")
    @Roles("ADMIN")
    deactivatePrompt(
        @Param("agentType") agentType: AgentType,
        @Param("version") version: string
    ) {
        const success = this.promptRegistry.deactivatePrompt(agentType, version);
        return { success, agentType, version };
    }

    // Agent Execution Endpoints

    @Post("agents/execute")
    @Roles("ADMIN", "AGENCY")
    async executeAgent(@Body() dto: ExecuteAgentDto, @Auth() auth: AuthContext) {
        const context = this.agentOrchestrator.createAgentContext(
            auth.tenantId,
            auth.userId,
            {
                brandProfileId: dto.variables.brandProfileId as string | undefined,
                strategyId: dto.variables.strategyId as string | undefined,
            }
        );

        const result = await this.agentOrchestrator.executeAgent(
            dto.agentType,
            { context, data: dto.variables },
            dto.variables as Record<string, string | number | boolean | object>,
            {
                promptVersion: dto.promptVersion,
                retryCount: dto.retryCount,
            }
        );

        return result;
    }

    @Get("agents/types")
    getAgentTypes() {
        return {
            types: Object.values(AgentType),
            descriptions: {
                [AgentType.INGESTION]: "Processes incoming data/content",
                [AgentType.TREND_RESEARCH]: "Analyzes trends and viral content",
                [AgentType.STRATEGY]: "Creates content strategies",
                [AgentType.PLANNER]: "Plans content calendar",
                [AgentType.SCRIPT_WRITER]: "Writes video scripts",
                [AgentType.CAPTION_WRITER]: "Creates captions and hashtags",
                [AgentType.IMAGE_GENERATOR]: "Generates images",
                [AgentType.VIDEO_GENERATOR]: "Generates videos",
                [AgentType.COMPLIANCE]: "Reviews content for compliance",
                [AgentType.SCHEDULER]: "Schedules content for publishing",
                [AgentType.ANALYTICS]: "Analyzes performance metrics",
                [AgentType.LEARNING]: "Learns from performance data",
                [AgentType.REPORTING]: "Generates reports",
            },
        };
    }
}
