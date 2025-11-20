import { Injectable } from "@nestjs/common";
import { CampaignStatus, Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class CampaignsService {
  constructor(private readonly prisma: PrismaService) {}

  list(where: Prisma.CampaignWhereInput = {}) {
    return this.prisma.campaign.findMany({
      where,
      orderBy: { createdAt: "desc" }
    });
  }

  create(data: { tenantId: string; name: string; status?: CampaignStatus }) {
    return this.prisma.campaign.create({
      data: {
        tenantId: data.tenantId,
        name: data.name,
        status: data.status ?? CampaignStatus.ACTIVE
      }
    });
  }
}
