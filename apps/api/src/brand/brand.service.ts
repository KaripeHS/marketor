import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { Prisma } from "@prisma/client";

@Injectable()
export class BrandService {
  constructor(private readonly prisma: PrismaService) {}

  list(where: Prisma.BrandProfileWhereInput = {}) {
    return this.prisma.brandProfile.findMany({
      where,
      orderBy: { createdAt: "desc" }
    });
  }

  upsert(tenantId: string, name: string, data: { voice: Prisma.InputJsonValue; audiences: Prisma.InputJsonValue; valueProps: Prisma.InputJsonValue; visualStyle: Prisma.InputJsonValue }) {
    return this.prisma.brandProfile.upsert({
      where: {
        tenantId_name: {
          tenantId,
          name
        }
      },
      update: {
        voice: data.voice,
        audiences: data.audiences,
        valueProps: data.valueProps,
        visualStyle: data.visualStyle
      },
      create: {
        tenantId,
        name,
        voice: data.voice,
        audiences: data.audiences,
        valueProps: data.valueProps,
        visualStyle: data.visualStyle
      }
    });
  }
}
