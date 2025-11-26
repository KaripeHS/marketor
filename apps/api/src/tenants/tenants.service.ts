import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class TenantsService {
  constructor(private readonly prisma: PrismaService) { }

  list() {
    return this.prisma.tenant.findMany({ orderBy: { createdAt: "desc" } });
  }

  findById(id: string) {
    return this.prisma.tenant.findUnique({ where: { id } });
  }

  create(name: string, slug: string) {
    return this.prisma.tenant.create({ data: { name, slug } });
  }

  update(id: string, data: { name?: string }) {
    return this.prisma.tenant.update({
      where: { id },
      data
    });
  }
}
