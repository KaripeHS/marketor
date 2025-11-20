import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { Prisma, Role } from "@prisma/client";

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  list(where: Prisma.UserWhereInput = {}) {
    return this.prisma.user.findMany({
      where,
      include: {
        memberships: {
          include: { tenant: true }
        }
      },
      orderBy: { createdAt: "desc" }
    });
  }

  create(data: { email: string; name?: string | null; authProvider?: string }) {
    return this.prisma.user.create({
      data: {
        email: data.email,
        name: data.name ?? null,
        authProvider: data.authProvider ?? "clerk"
      }
    });
  }

  addMembership(data: { userId: string; tenantId: string; role: Role }) {
    return this.prisma.userTenantRole.upsert({
      where: {
        userId_tenantId: {
          userId: data.userId,
          tenantId: data.tenantId
        }
      },
      update: { role: data.role },
      create: {
        userId: data.userId,
        tenantId: data.tenantId,
        role: data.role
      }
    });
  }
}
