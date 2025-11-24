import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { ContentFormat, Platform, Prisma } from "@prisma/client";

type PlanItemInput = {
  platform: Platform;
  format: ContentFormat;
  scheduledAt: Date;
  topicSlug?: string | null;
  contentId?: string | null;
};

@Injectable()
export class PlansService {
  constructor(private readonly prisma: PrismaService) {}

  list(where: Prisma.ContentPlanWhereInput = {}) {
    return this.prisma.contentPlan.findMany({
      where,
      include: { items: true },
      orderBy: { createdAt: "desc" }
    });
  }

  create(tenantId: string, data: { strategyId?: string | null; timeWindow: Prisma.InputJsonValue; items: PlanItemInput[] }) {
    return this.prisma.contentPlan.create({
      data: {
        tenantId,
        strategyId: data.strategyId ?? null,
        timeWindow: data.timeWindow,
        items: {
          create: data.items.map((item) => ({
            platform: item.platform,
            format: item.format,
            scheduledAt: item.scheduledAt,
            topicSlug: item.topicSlug ?? null,
            contentId: item.contentId ?? null
          }))
        }
      },
      include: { items: true }
    });
  }
}
