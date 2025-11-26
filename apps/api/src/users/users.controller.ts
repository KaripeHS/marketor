import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString } from "class-validator";
import { Role } from "@prisma/client";
import { UsersService } from "./users.service";
import { Roles } from "../auth/roles.decorator";

class CreateUserDto {
  @IsEmail()
  email!: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  authProvider?: string;
}

class CreateMembershipDto {
  @IsString()
  @IsNotEmpty()
  userId!: string;

  @IsString()
  @IsNotEmpty()
  tenantId!: string;

  @IsEnum(Role)
  role!: Role;
}

@Controller("users")
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Roles("ADMIN", "AGENCY")
  list() {
    return this.usersService.list();
  }

  @Get(":id")
  getById(@Param("id") id: string) {
    return this.usersService.findById(id);
  }

  @Post()
  @Roles("ADMIN")
  create(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto);
  }

  @Post("membership")
  @Roles("ADMIN")
  addMembership(@Body() dto: CreateMembershipDto) {
    return this.usersService.addMembership(dto);
  }
}
