import { Body, Controller, Get, Post, Query } from "@nestjs/common";
import { IsBoolean, IsNotEmpty, IsOptional, IsString } from "class-validator";
import { CommentsService } from "./comments.service";
import { Auth } from "../auth/auth.decorator";
import { AuthContext } from "../auth/auth.types";

class CreateCommentDto {
  @IsString()
  @IsNotEmpty()
  contentId!: string;

  @IsString()
  @IsNotEmpty()
  body!: string;

  @IsOptional()
  @IsBoolean()
  isInternal?: boolean;
}

@Controller("comments")
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Get()
  list(@Query("contentId") contentId?: string, @Auth() auth?: AuthContext) {
    const where = contentId ? { contentId } : auth?.tenantId ? { content: { tenantId: auth.tenantId } } : {};
    return this.commentsService.list(where);
  }

  @Post()
  create(@Body() dto: CreateCommentDto, @Auth() auth: AuthContext) {
    return this.commentsService.create({
      ...dto,
      authorId: auth.userId
    });
  }
}
