import { Body, Controller, Get, Post } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { IsDateString, IsNotEmpty, IsObject, IsString } from "class-validator";
import { StrategyService } from "./strategy.service";
import { Auth } from "../auth/auth.decorator";
import { AuthContext } from "../auth/auth.types";

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

@Controller("strategy")
export class StrategyController {
  constructor(private readonly strategyService: StrategyService) {}

  @Get()
  list(@Auth() auth: AuthContext) {
    return this.strategyService.list({ tenantId: auth.tenantId });
  }

  @Post()
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
}
