import { Injectable } from "@nestjs/common";
import { ContentFormat, ContentState, Platform, Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { CacheService } from "../cache/cache.service";

@Injectable()
export class ContentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService
  ) { }

  async list(where: Prisma.ContentItemWhereInput = {}) {
    const tenantId = where.tenantId as string | undefined;
    const campaignId = where.campaignId as string | undefined;

    // Use campaign-specific cache key if filtering by campaign
    if (campaignId) {
      return this.cache.getOrSet(
        this.cache.keys.contentByCampaign(campaignId),
        () => this.prisma.contentItem.findMany({
          where,
          include: { campaign: true },
          orderBy: { createdAt: "desc" }
        }),
        { ttl: this.cache.ttl.short }
      );
    }

    // Use tenant-specific cache key if filtering by tenant
    if (tenantId) {
      return this.cache.getOrSet(
        this.cache.keys.contentByTenant(tenantId),
        () => this.prisma.contentItem.findMany({
          where,
          include: { campaign: true },
          orderBy: { createdAt: "desc" }
        }),
        { ttl: this.cache.ttl.short }
      );
    }

    return this.prisma.contentItem.findMany({
      where,
      include: { campaign: true },
      orderBy: { createdAt: "desc" }
    });
  }

  async findById(id: string) {
    return this.cache.getOrSet(
      this.cache.keys.content(id),
      () => this.prisma.contentItem.findUnique({
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
      }),
      { ttl: this.cache.ttl.short }
    );
  }

  async create(data: {
    tenantId: string;
    campaignId?: string | null;
    platform: Platform;
    format: ContentFormat;
    state?: ContentState;
    scheduledFor?: Date | null;
  }) {
    const content = await this.prisma.contentItem.create({
      data: {
        tenantId: data.tenantId,
        campaignId: data.campaignId ?? null,
        platform: data.platform,
        format: data.format,
        state: data.state ?? ContentState.DRAFT,
        scheduledFor: data.scheduledFor ?? null
      }
    });
    await this.invalidateContentCaches(data.tenantId, data.campaignId);
    return content;
  }

  async updateState(id: string, state: ContentState, scheduledFor?: Date | null) {
    const content = await this.prisma.contentItem.update({
      where: { id },
      data: { state, scheduledFor: scheduledFor ?? null }
    });
    await this.invalidateContentCaches(content.tenantId, content.campaignId, id);
    return content;
  }

  async update(id: string, data: Prisma.ContentItemUpdateInput) {
    const content = await this.prisma.contentItem.update({
      where: { id },
      data,
    });
    await this.invalidateContentCaches(content.tenantId, content.campaignId, id);
    return content;
  }

  async delete(id: string) {
    const content = await this.prisma.contentItem.delete({
      where: { id },
    });
    await this.invalidateContentCaches(content.tenantId, content.campaignId, id);
    return content;
  }

  private async invalidateContentCaches(tenantId: string, campaignId?: string | null, contentId?: string) {
    const promises: Promise<void>[] = [
      this.cache.del(this.cache.keys.contentByTenant(tenantId))
    ];
    if (campaignId) {
      promises.push(this.cache.del(this.cache.keys.contentByCampaign(campaignId)));
    }
    if (contentId) {
      promises.push(this.cache.del(this.cache.keys.content(contentId)));
    }
    await Promise.all(promises);
  }
}
