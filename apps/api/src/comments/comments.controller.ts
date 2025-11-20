import { Body, Controller, Get, Post, Query } from "@nestjs/common";
import { IsBoolean, IsNotEmpty, IsOptional, IsString } from "class-validator";
import { CommentsService } from "./comments.service";

class CreateCommentDto {
  @IsString()
  @IsNotEmpty()
  contentId!: string;

  @IsString()
  @IsNotEmpty()
  authorId!: string;

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
  list(@Query("contentId") contentId?: string) {
    const where = contentId ? { contentId } : {};
    return this.commentsService.list(where);
  }

  @Post()
  create(@Body() dto: CreateCommentDto) {
    return this.commentsService.create(dto);
  }
}
