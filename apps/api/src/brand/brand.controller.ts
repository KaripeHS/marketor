import { Body, Controller, Get, Post } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { IsNotEmpty, IsObject, IsString } from "class-validator";
import { BrandService } from "./brand.service";
import { Auth } from "../auth/auth.decorator";
import { AuthContext } from "../auth/auth.types";

class UpsertBrandDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsObject()
  voice!: Record<string, unknown>;

  @IsObject()
  audiences!: Record<string, unknown>;

  @IsObject()
  valueProps!: Record<string, unknown>;

  @IsObject()
  visualStyle!: Record<string, unknown>;
}

@Controller("brand")
export class BrandController {
  constructor(private readonly brandService: BrandService) {}

  @Get()
  list(@Auth() auth: AuthContext) {
    return this.brandService.list({ tenantId: auth.tenantId });
  }

  @Post()
  upsert(@Body() dto: UpsertBrandDto, @Auth() auth: AuthContext) {
    return this.brandService.upsert(auth.tenantId, dto.name, {
      voice: dto.voice as unknown as Prisma.InputJsonValue,
      audiences: dto.audiences as unknown as Prisma.InputJsonValue,
      valueProps: dto.valueProps as unknown as Prisma.InputJsonValue,
      visualStyle: dto.visualStyle as unknown as Prisma.InputJsonValue
    });
  }
}
