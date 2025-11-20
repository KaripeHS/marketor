import { Body, Controller, Get, Param, Patch, Post } from "@nestjs/common";
import { RevisionStatus } from "@prisma/client";
import { IsEnum, IsNotEmpty, IsOptional, IsString } from "class-validator";
import { RevisionsService } from "./revisions.service";

class CreateRevisionDto {
  @IsString()
  @IsNotEmpty()
  contentId!: string;

  @IsString()
  @IsNotEmpty()
  requestedBy!: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

class UpdateRevisionStatusDto {
  @IsEnum(RevisionStatus)
  status!: RevisionStatus;
}

@Controller("revisions")
export class RevisionsController {
  constructor(private readonly revisionsService: RevisionsService) {}

  @Get()
  list() {
    return this.revisionsService.list();
  }

  @Post()
  create(@Body() dto: CreateRevisionDto) {
    return this.revisionsService.create(dto);
  }

  @Patch(":id/status")
  updateStatus(@Param("id") id: string, @Body() dto: UpdateRevisionStatusDto) {
    return this.revisionsService.updateStatus(id, dto.status);
  }
}
