import { Body, Controller, Get, Param, Patch, Post, Delete, Query } from "@nestjs/common";
import { IsBoolean, IsDate, IsEnum, IsOptional, IsString } from "class-validator";
import { Type } from "class-transformer";
import { ContentFormat, ContentState, Platform } from "@prisma/client";
import { ContentService } from "./content.service";
import { Auth } from "../auth/auth.decorator";
import { AuthContext } from "../auth/auth.types";
import { Roles } from "../auth/roles.decorator";
import { ComplianceGuardianService } from "../compliance/compliance-guardian.service";

class CreateContentDto {
  @IsOptional()
  @IsString()
  campaignId?: string;

  @IsEnum(Platform)
  platform!: Platform;

  @IsEnum(ContentFormat)
  format!: ContentFormat;

  @IsOptional()
  @IsEnum(ContentState)
  state?: ContentState;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  scheduledFor?: Date | null;
}

class UpdateContentStateDto {
  @IsEnum(ContentState)
  state!: ContentState;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  scheduledFor?: Date | null;

  @IsOptional()
  @IsBoolean()
  runComplianceCheck?: boolean;

  @IsOptional()
  @IsString()
  industry?: string;
}

class UpdateContentDto {
  @IsOptional()
  @IsString()
  campaignId?: string;

  @IsOptional()
  @IsEnum(Platform)
  platform?: Platform;

  @IsOptional()
  @IsEnum(ContentFormat)
  format?: ContentFormat;

  @IsOptional()
  @IsEnum(ContentState)
  state?: ContentState;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  scheduledFor?: Date | null;
}

@Controller("content")
export class ContentController {
  constructor(
    private readonly contentService: ContentService,
    private readonly complianceGuardian: ComplianceGuardianService
  ) { }

  @Get()
  list(@Query("tenantId") tenantId?: string, @Query("campaignId") campaignId?: string, @Auth() auth?: AuthContext) {
    const where: Record<string, unknown> = {};
    if (tenantId || auth?.tenantId) where.tenantId = tenantId || auth?.tenantId;
    if (campaignId) where.campaignId = campaignId;
    return this.contentService.list(where);
  }

  @Get(":id")
  getById(@Param("id") id: string) {
    return this.contentService.findById(id);
  }

  @Post()
  create(@Body() dto: CreateContentDto, @Auth() auth: AuthContext) {
    return this.contentService.create({ ...dto, tenantId: auth.tenantId });
  }

  @Patch(":id/state")
  async updateState(@Param("id") id: string, @Body() dto: UpdateContentStateDto) {
    // Run compliance check when transitioning to COMPLIANCE_REVIEW
    if (dto.state === ContentState.COMPLIANCE_REVIEW || dto.runComplianceCheck) {
      const complianceResult = await this.complianceGuardian.checkContentById(id, {
        industry: dto.industry,
      });

      // If transitioning to COMPLIANCE_REVIEW and content is not compliant, include the result
      const updatedContent = await this.contentService.updateState(id, dto.state, dto.scheduledFor);

      return {
        ...updatedContent,
        complianceCheck: complianceResult,
      };
    }

    return this.contentService.updateState(id, dto.state, dto.scheduledFor);
  }

  @Get(":id/compliance")
  @Roles("ADMIN", "AGENCY", "CLIENT", "REVIEWER")
  async getComplianceStatus(
    @Param("id") id: string,
    @Query("industry") industry?: string
  ) {
    return this.complianceGuardian.checkContentById(id, { industry });
  }

  @Patch(":id")
  @Roles("ADMIN", "AGENCY", "CLIENT")
  update(@Param("id") id: string, @Body() dto: UpdateContentDto) {
    return this.contentService.update(id, dto);
  }

  @Delete(":id")
  @Roles("ADMIN", "AGENCY")
  delete(@Param("id") id: string) {
    return this.contentService.delete(id);
  }
}
