import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { Prisma, RevisionStatus } from "@prisma/client";

@Injectable()
export class RevisionsService {
  constructor(private readonly prisma: PrismaService) {}

  list(where: Prisma.RevisionRequestWhereInput = {}) {
    return this.prisma.revisionRequest.findMany({
      where,
      include: { content: true },
      orderBy: { createdAt: "desc" }
    });
  }

  async create(data: { contentId: string; requestedBy: string; notes?: string | null }) {
    const exists = await this.prisma.contentItem.findUnique({ where: { id: data.contentId } });
    if (!exists) throw new NotFoundException("Content not found");
    return this.prisma.revisionRequest.create({
      data: {
        contentId: data.contentId,
        requestedBy: data.requestedBy,
        notes: data.notes ?? null
      }
    });
  }

  async updateStatus(id: string, status: RevisionStatus) {
    const exists = await this.prisma.revisionRequest.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException("Revision not found");
    return this.prisma.revisionRequest.update({
      where: { id },
      data: { status }
    });
  }
}
