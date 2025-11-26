import { Injectable } from "@nestjs/common";
import { CampaignStatus, Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { CacheService } from "../cache/cache.service";

@Injectable()
export class CampaignsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService
  ) { }

  async list(where: Prisma.CampaignWhereInput = {}) {
    const tenantId = where.tenantId as string | undefined;
    if (tenantId) {
      return this.cache.getOrSet(
        this.cache.keys.campaignsByTenant(tenantId),
        () => this.prisma.campaign.findMany({
          where,
          orderBy: { createdAt: "desc" }
        }),
        { ttl: this.cache.ttl.short }
      );
    }
    return this.prisma.campaign.findMany({
      where,
      orderBy: { createdAt: "desc" }
    });
  }

  async findById(id: string) {
    return this.cache.getOrSet(
      this.cache.keys.campaign(id),
      () => this.prisma.campaign.findUnique({
        where: { id },
        include: {
          content: {
            orderBy: { createdAt: "desc" }
          }
        }
      }),
      { ttl: this.cache.ttl.short }
    );
  }

  async create(data: { tenantId: string; name: string; status?: CampaignStatus }) {
    const campaign = await this.prisma.campaign.create({
      data: {
        tenantId: data.tenantId,
        name: data.name,
        status: data.status ?? CampaignStatus.ACTIVE
      }
    });
    await this.cache.del(this.cache.keys.campaignsByTenant(data.tenantId));
    return campaign;
  }

  async update(id: string, data: Prisma.CampaignUpdateInput) {
    const campaign = await this.prisma.campaign.update({
      where: { id },
      data,
    });
    await Promise.all([
      this.cache.del(this.cache.keys.campaign(id)),
      this.cache.del(this.cache.keys.campaignsByTenant(campaign.tenantId))
    ]);
    return campaign;
  }

  async delete(id: string) {
    const campaign = await this.prisma.campaign.delete({
      where: { id },
    });
    await Promise.all([
      this.cache.del(this.cache.keys.campaign(id)),
      this.cache.del(this.cache.keys.campaignsByTenant(campaign.tenantId))
    ]);
    return campaign;
  }
}
