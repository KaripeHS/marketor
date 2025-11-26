import { Injectable } from "@nestjs/common";
import { ContentFormat, ContentState, Platform, Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class ContentService {
  constructor(private readonly prisma: PrismaService) { }

  list(where: Prisma.ContentItemWhereInput = {}) {
    return this.prisma.contentItem.findMany({
      where,
      include: { campaign: true },
      orderBy: { createdAt: "desc" }
    });
  }

  findById(id: string) {
    return this.prisma.contentItem.findUnique({
      where: { id },
      include: {
        campaign: true,
        approval: true,
        comments: {
          orderBy: { createdAt: "desc" }
        },
        revisions: {
          orderBy: { createdAt: "desc" }
        }
      }
    });
  }

  create(data: {
    tenantId: string;
    campaignId?: string | null;
    platform: Platform;
    format: ContentFormat;
    state?: ContentState;
    scheduledFor?: Date | null;
  }) {
    return this.prisma.contentItem.create({
      data: {
        tenantId: data.tenantId,
        campaignId: data.campaignId ?? null,
        platform: data.platform,
        format: data.format,
        state: data.state ?? ContentState.DRAFT,
        scheduledFor: data.scheduledFor ?? null
      }
    });
  }

  updateState(id: string, state: ContentState, scheduledFor?: Date | null) {
    return this.prisma.contentItem.update({
      where: { id },
      data: { state, scheduledFor: scheduledFor ?? null }
    });
  }

  async update(id: string, data: Prisma.ContentItemUpdateInput) {
    return this.prisma.contentItem.update({
      where: { id },
      data,
    });
  }

  async delete(id: string) {
    return this.prisma.contentItem.delete({
      where: { id },
    });
  }
}
