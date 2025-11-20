import { Body, Controller, Get, Post } from "@nestjs/common";
import { TenantsService } from "./tenants.service";

class CreateTenantDto {
  name!: string;
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
