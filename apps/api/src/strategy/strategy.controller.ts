import { Body, Controller, Get, Param, Patch, Post, Delete } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { IsDateString, IsNotEmpty, IsObject, IsOptional, IsString } from "class-validator";
import { StrategyService } from "./strategy.service";
import { Auth } from "../auth/auth.decorator";
import { AuthContext } from "../auth/auth.types";
import { Roles } from "../auth/roles.decorator";

class CreateStrategyDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsDateString()
  startsOn!: string;

  @IsDateString()
  endsOn!: string;

  @IsObject()
  goals!: Record<string, unknown>;

  @IsObject()
  pillars!: Record<string, unknown>;

  @IsObject()
  platformFocus!: Record<string, unknown>;
}

class UpdateStrategyDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @IsDateString()
  startsOn?: string;

  @IsOptional()
  @IsDateString()
  endsOn?: string;

  @IsOptional()
  @IsObject()
  goals?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  pillars?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  platformFocus?: Record<string, unknown>;
}

@Controller("strategy")
export class StrategyController {
  constructor(private readonly strategyService: StrategyService) { }

  @Get()
  list(@Auth() auth: AuthContext) {
    return this.strategyService.list({ tenantId: auth.tenantId });
  }

  @Post()
  @Roles("ADMIN", "AGENCY")
  create(@Body() dto: CreateStrategyDto, @Auth() auth: AuthContext) {
    return this.strategyService.create(auth.tenantId, {
      name: dto.name,
      startsOn: new Date(dto.startsOn),
      endsOn: new Date(dto.endsOn),
      goals: dto.goals as unknown as Prisma.InputJsonValue,
      pillars: dto.pillars as unknown as Prisma.InputJsonValue,
      platformFocus: dto.platformFocus as unknown as Prisma.InputJsonValue
    });
  }

  @Patch(":id")
  @Roles("ADMIN", "AGENCY")
  update(@Param("id") id: string, @Body() dto: UpdateStrategyDto) {
    return this.strategyService.update(id, {
      ...dto,
      startsOn: dto.startsOn ? new Date(dto.startsOn) : undefined,
      endsOn: dto.endsOn ? new Date(dto.endsOn) : undefined,
      goals: dto.goals as unknown as Prisma.InputJsonValue,
      pillars: dto.pillars as unknown as Prisma.InputJsonValue,
      platformFocus: dto.platformFocus as unknown as Prisma.InputJsonValue
    });
  }

  @Delete(":id")
  @Roles("ADMIN", "AGENCY")
  delete(@Param("id") id: string) {
    return this.strategyService.delete(id);
  }
}
