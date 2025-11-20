import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class TenantsService {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.tenant.findMany({ orderBy: { createdAt: "desc" } });
  }

  create(name: string, slug: string) {
    return this.prisma.tenant.create({ data: { name, slug } });
  }
}
