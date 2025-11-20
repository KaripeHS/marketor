import { Body, Controller, Get, Post } from "@nestjs/common";
import { IsNotEmpty, IsString, Matches } from "class-validator";
import { TenantsService } from "./tenants.service";

class CreateTenantDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @Matches(/^[a-z0-9-]+$/, { message: "slug must be lowercase alphanumerics and dashes" })
  slug!: string;
}

@Controller("tenants")
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Get()
  list() {
    return this.tenantsService.list();
  }

  @Post()
  create(@Body() dto: CreateTenantDto) {
    return this.tenantsService.create(dto.name, dto.slug);
  }
}
