import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from "@nestjs/swagger";
import { ApprovalStatus } from "@prisma/client";
import { IsEnum, IsOptional, IsString } from "class-validator";
import { ApprovalsService } from "./approvals.service";
import { Roles } from "../auth/roles.decorator";

class UpsertApprovalDto {
  @IsEnum(ApprovalStatus)
  status!: ApprovalStatus;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  reviewerId?: string;
}

@ApiTags("approvals")
@ApiBearerAuth()
@Controller("approvals")
export class ApprovalsController {
  constructor(private readonly approvalsService: ApprovalsService) {}

  @Get()
  @ApiOperation({ summary: "List all approval requests" })
  @ApiResponse({ status: 200, description: "Returns list of approvals" })
  list() {
    return this.approvalsService.list();
  }

  @Post(":contentId")
  @Roles("ADMIN", "AGENCY", "REVIEWER")
  @ApiOperation({ summary: "Create or update content approval" })
  @ApiResponse({ status: 200, description: "Approval updated" })
  @ApiResponse({ status: 201, description: "Approval created" })
  @ApiResponse({ status: 404, description: "Content not found" })
  async upsert(@Param("contentId") contentId: string, @Body() dto: UpsertApprovalDto) {
    await this.approvalsService.ensureContent(contentId);
    return this.approvalsService.upsert(contentId, dto.status, dto.notes, dto.reviewerId);
  }
}
