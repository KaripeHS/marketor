import { Body, Controller, Get, Post, Query } from "@nestjs/common";
import { IsEnum, IsNotEmpty, IsOptional, IsString } from "class-validator";
import { CampaignStatus } from "@prisma/client";
import { CampaignsService } from "./campaigns.service";
import { Auth } from "../auth/auth.decorator";
import { AuthContext } from "../auth/auth.types";

class CreateCampaignDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsOptional()
  @IsEnum(CampaignStatus)
  status?: CampaignStatus;
}

@Controller("campaigns")
export class CampaignsController {
  constructor(private readonly campaignsService: CampaignsService) {}

  @Get()
  list(@Query("tenantId") tenantId?: string, @Auth() auth?: AuthContext) {
    const effectiveTenantId = tenantId || auth?.tenantId;
    return this.campaignsService.list(effectiveTenantId ? { tenantId: effectiveTenantId } : {});
  }

  @Post()
  create(@Body() dto: CreateCampaignDto, @Auth() auth: AuthContext) {
    return this.campaignsService.create({ ...dto, tenantId: auth.tenantId });
  }
}
