import { Body, Controller, Get, Param, Patch, Post, Delete, Query } from "@nestjs/common";
import { IsEnum, IsNotEmpty, IsOptional, IsString } from "class-validator";
import { CampaignStatus } from "@prisma/client";
import { CampaignsService } from "./campaigns.service";
import { Auth } from "../auth/auth.decorator";
import { AuthContext } from "../auth/auth.types";
import { Roles } from "../auth/roles.decorator";

class CreateCampaignDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsOptional()
  @IsEnum(CampaignStatus)
  status?: CampaignStatus;
}

class UpdateCampaignDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @IsEnum(CampaignStatus)
  status?: CampaignStatus;
}

@Controller("campaigns")
export class CampaignsController {
  constructor(private readonly campaignsService: CampaignsService) { }

  @Get()
  list(@Query("tenantId") tenantId?: string, @Auth() auth?: AuthContext) {
    const effectiveTenantId = tenantId || auth?.tenantId;
    return this.campaignsService.list(effectiveTenantId ? { tenantId: effectiveTenantId } : {});
  }

  @Get(":id")
  getById(@Param("id") id: string) {
    return this.campaignsService.findById(id);
  }

  @Post()
  create(@Body() dto: CreateCampaignDto, @Auth() auth: AuthContext) {
    return this.campaignsService.create({ ...dto, tenantId: auth.tenantId });
  }

  @Patch(":id")
  @Roles("ADMIN", "AGENCY", "CLIENT")
  update(@Param("id") id: string, @Body() dto: UpdateCampaignDto) {
    return this.campaignsService.update(id, dto);
  }

  @Delete(":id")
  @Roles("ADMIN", "AGENCY")
  delete(@Param("id") id: string) {
    return this.campaignsService.delete(id);
  }
}
