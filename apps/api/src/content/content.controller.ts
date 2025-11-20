import { Body, Controller, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { IsDate, IsEnum, IsOptional, IsString } from "class-validator";
import { Type } from "class-transformer";
import { ContentFormat, ContentState, Platform } from "@prisma/client";
import { ContentService } from "./content.service";
import { Auth } from "../auth/auth.decorator";
import { AuthContext } from "../auth/auth.types";

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
}

@Controller("content")
export class ContentController {
  constructor(private readonly contentService: ContentService) {}

  @Get()
  list(@Query("tenantId") tenantId?: string, @Query("campaignId") campaignId?: string, @Auth() auth?: AuthContext) {
    const where: Record<string, unknown> = {};
    if (tenantId || auth?.tenantId) where.tenantId = tenantId || auth?.tenantId;
    if (campaignId) where.campaignId = campaignId;
    return this.contentService.list(where);
  }

  @Post()
  create(@Body() dto: CreateContentDto, @Auth() auth: AuthContext) {
    return this.contentService.create({ ...dto, tenantId: auth.tenantId });
  }

  @Patch(":id/state")
  updateState(@Param("id") id: string, @Body() dto: UpdateContentStateDto) {
    return this.contentService.updateState(id, dto.state, dto.scheduledFor);
  }
}
