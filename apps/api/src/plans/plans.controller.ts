import { Body, Controller, Get, Post } from "@nestjs/common";
import { ContentFormat, Platform, Prisma } from "@prisma/client";
import { IsArray, IsEnum, IsNotEmpty, IsObject, IsOptional, IsString } from "class-validator";
import { Type } from "class-transformer";
import { PlansService } from "./plans.service";
import { Auth } from "../auth/auth.decorator";
import { AuthContext } from "../auth/auth.types";

class PlanItemDto {
  @IsEnum(Platform)
  platform!: Platform;

  @IsEnum(ContentFormat)
  format!: ContentFormat;

  @IsString()
  @IsNotEmpty()
  scheduledAt!: string;

  @IsOptional()
  @IsString()
  topicSlug?: string;

  @IsOptional()
  @IsString()
  contentId?: string;
}

class CreatePlanDto {
  @IsOptional()
  @IsString()
  strategyId?: string;

  @IsObject()
  timeWindow!: Record<string, unknown>;

  @IsArray()
  @Type(() => PlanItemDto)
  items!: PlanItemDto[];
}

@Controller("plans")
export class PlansController {
  constructor(private readonly plansService: PlansService) {}

  @Get()
  list(@Auth() auth: AuthContext) {
    return this.plansService.list({ tenantId: auth.tenantId });
  }

  @Post()
  create(@Body() dto: CreatePlanDto, @Auth() auth: AuthContext) {
    return this.plansService.create(auth.tenantId, {
      strategyId: dto.strategyId,
      timeWindow: dto.timeWindow as unknown as Prisma.InputJsonValue,
      items: dto.items.map((i) => ({
        platform: i.platform,
        format: i.format,
        scheduledAt: new Date(i.scheduledAt),
        topicSlug: i.topicSlug,
        contentId: i.contentId
      }))
    });
  }
}
