import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { Prisma } from "@prisma/client";

@Injectable()
export class CommentsService {
  constructor(private readonly prisma: PrismaService) {}

  list(where: Prisma.CommentWhereInput = {}) {
    return this.prisma.comment.findMany({
      where,
      orderBy: { createdAt: "asc" }
    });
  }

  async create(data: { contentId: string; authorId: string; body: string; isInternal?: boolean }) {
    const exists = await this.prisma.contentItem.findUnique({ where: { id: data.contentId } });
    if (!exists) throw new NotFoundException("Content not found");
    return this.prisma.comment.create({
      data: {
        contentId: data.contentId,
        authorId: data.authorId,
        body: data.body,
        isInternal: data.isInternal ?? false
      }
    });
  }
}
