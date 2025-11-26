import { Body, Controller, Get, Param, Patch, Post } from "@nestjs/common";
import { ApiTags, ApiBearerAuth } from "@nestjs/swagger";
import { IsNotEmpty, IsOptional, IsString, Matches } from "class-validator";
import { TenantsService } from "./tenants.service";
import { Roles } from "../auth/roles.decorator";

class CreateTenantDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @Matches(/^[a-z0-9-]+$/, { message: "slug must be lowercase alphanumerics and dashes" })
  slug!: string;
}

class UpdateTenantDto {
  @IsOptional()
  @IsString()
  name?: string;
}

@ApiTags("tenants")
@ApiBearerAuth()
@Controller("tenants")
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) { }

  @Get()
  list() {
    return this.tenantsService.list();
  }

  @Get(":id")
  getById(@Param("id") id: string) {
    return this.tenantsService.findById(id);
  }

  @Post()
  @Roles("ADMIN")
  create(@Body() dto: CreateTenantDto) {
    return this.tenantsService.create(dto.name, dto.slug);
  }

  @Patch(":id")
  @Roles("ADMIN")
  update(@Param("id") id: string, @Body() dto: UpdateTenantDto) {
    return this.tenantsService.update(id, dto);
  }
}
