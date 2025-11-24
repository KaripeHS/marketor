import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { Prisma } from "@prisma/client";

@Injectable()
export class StrategyService {
  constructor(private readonly prisma: PrismaService) {}

  list(where: Prisma.StrategyWhereInput = {}) {
    return this.prisma.strategy.findMany({
      where,
      orderBy: { createdAt: "desc" }
    });
  }

  create(tenantId: string, data: { name: string; startsOn: Date; endsOn: Date; goals: Prisma.InputJsonValue; pillars: Prisma.InputJsonValue; platformFocus: Prisma.InputJsonValue }) {
    return this.prisma.strategy.create({
      data: {
        tenantId,
        name: data.name,
        startsOn: data.startsOn,
        endsOn: data.endsOn,
        goals: data.goals,
        pillars: data.pillars,
        platformFocus: data.platformFocus
      }
    });
  }
}
