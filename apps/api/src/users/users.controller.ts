import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from "@nestjs/swagger";
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

@ApiTags("users")
@ApiBearerAuth()
@Controller("users")
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Roles("ADMIN", "AGENCY")
  @ApiOperation({ summary: "List all users" })
  @ApiResponse({ status: 200, description: "Returns list of users" })
  list() {
    return this.usersService.list();
  }

  @Get(":id")
  @ApiOperation({ summary: "Get user by ID" })
  @ApiResponse({ status: 200, description: "Returns user details" })
  @ApiResponse({ status: 404, description: "User not found" })
  getById(@Param("id") id: string) {
    return this.usersService.findById(id);
  }

  @Post()
  @Roles("ADMIN")
  @ApiOperation({ summary: "Create a new user" })
  @ApiResponse({ status: 201, description: "User created successfully" })
  @ApiResponse({ status: 400, description: "Invalid input" })
  create(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto);
  }

  @Post("membership")
  @Roles("ADMIN")
  @ApiOperation({ summary: "Add user to tenant with role" })
  @ApiResponse({ status: 201, description: "Membership created" })
  @ApiResponse({ status: 400, description: "Invalid input" })
  addMembership(@Body() dto: CreateMembershipDto) {
    return this.usersService.addMembership(dto);
  }
}
