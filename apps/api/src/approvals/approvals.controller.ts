import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { ApprovalStatus } from "@prisma/client";
import { IsEnum, IsOptional, IsString } from "class-validator";
import { ApprovalsService } from "./approvals.service";

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

@Controller("approvals")
export class ApprovalsController {
  constructor(private readonly approvalsService: ApprovalsService) {}

  @Get()
  list() {
    return this.approvalsService.list();
  }

  @Post(":contentId")
  async upsert(@Param("contentId") contentId: string, @Body() dto: UpsertApprovalDto) {
    await this.approvalsService.ensureContent(contentId);
    return this.approvalsService.upsert(contentId, dto.status, dto.notes, dto.reviewerId);
  }
}
