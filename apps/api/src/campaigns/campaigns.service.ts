import { Injectable } from "@nestjs/common";
import { CampaignStatus, Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class CampaignsService {
  constructor(private readonly prisma: PrismaService) { }

  list(where: Prisma.CampaignWhereInput = {}) {
    return this.prisma.campaign.findMany({
      where,
      orderBy: { createdAt: "desc" }
    });
  }

  findById(id: string) {
    return this.prisma.campaign.findUnique({
      where: { id },
      include: {
        content: {
          orderBy: { createdAt: "desc" }
        }
      }
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

  async update(id: string, data: Prisma.CampaignUpdateInput) {
    return this.prisma.campaign.update({
      where: { id },
      data,
    });
  }

  async delete(id: string) {
    return this.prisma.campaign.delete({
      where: { id },
    });
  }
}
