import { Body, Controller, Get, Param, Patch, Post } from "@nestjs/common";
import { RevisionStatus } from "@prisma/client";
import { IsEnum, IsNotEmpty, IsOptional, IsString } from "class-validator";
import { Auth } from "../auth/auth.decorator";
import { AuthContext } from "../auth/auth.types";
import { RevisionsService } from "./revisions.service";

class CreateRevisionDto {
  @IsString()
  @IsNotEmpty()
  contentId!: string;

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
  list(@Auth() auth?: AuthContext) {
    return this.revisionsService.list(auth?.tenantId ? { content: { tenantId: auth.tenantId } } : {});
  }

  @Post()
  create(@Body() dto: CreateRevisionDto, @Auth() auth: AuthContext) {
    return this.revisionsService.create({ ...dto, requestedBy: auth.userId });
  }

  @Patch(":id/status")
  updateStatus(@Param("id") id: string, @Body() dto: UpdateRevisionStatusDto) {
    return this.revisionsService.updateStatus(id, dto.status);
  }
}
