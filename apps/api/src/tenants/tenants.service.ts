import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CacheService } from "../cache/cache.service";

@Injectable()
export class TenantsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService
  ) { }

  async list() {
    return this.cache.getOrSet(
      this.cache.keys.tenantList(),
      () => this.prisma.tenant.findMany({ orderBy: { createdAt: "desc" } }),
      { ttl: this.cache.ttl.medium }
    );
  }

  async findById(id: string) {
    return this.cache.getOrSet(
      this.cache.keys.tenant(id),
      () => this.prisma.tenant.findUnique({ where: { id } }),
      { ttl: this.cache.ttl.medium }
    );
  }

  async create(name: string, slug: string) {
    const tenant = await this.prisma.tenant.create({ data: { name, slug } });
    await this.cache.del(this.cache.keys.tenantList());
    return tenant;
  }

  async update(id: string, data: { name?: string }) {
    const tenant = await this.prisma.tenant.update({
      where: { id },
      data
    });
    await Promise.all([
      this.cache.del(this.cache.keys.tenant(id)),
      this.cache.del(this.cache.keys.tenantList())
    ]);
    return tenant;
  }
}
