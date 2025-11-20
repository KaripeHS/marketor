import { Injectable, NotFoundException } from "@nestjs/common";
import { ApprovalStatus, Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class ApprovalsService {
  constructor(private readonly prisma: PrismaService) {}

  list(where: Prisma.ApprovalWhereInput = {}) {
    return this.prisma.approval.findMany({
      where,
      include: { content: true },
      orderBy: { createdAt: "desc" }
    });
  }

  upsert(contentId: string, status: ApprovalStatus, notes?: string | null, reviewerId?: string | null) {
    return this.prisma.approval.upsert({
      where: { contentId },
      create: {
        contentId,
        status,
        notes: notes ?? null,
        reviewerId: reviewerId ?? null
      },
      update: {
        status,
        notes: notes ?? null,
        reviewerId: reviewerId ?? null
      }
    });
  }

  async ensureContent(contentId: string) {
    const exists = await this.prisma.contentItem.findUnique({ where: { id: contentId } });
    if (!exists) throw new NotFoundException("Content not found");
  }
}
