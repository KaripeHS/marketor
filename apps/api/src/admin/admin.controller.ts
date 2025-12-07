import {
    Controller,
    Get,
    Post,
    Delete,
    Param,
    Query,
    Body,
    HttpCode,
    HttpStatus,
} from "@nestjs/common";
import {
    ApiTags,
    ApiBearerAuth,
    ApiOperation,
    ApiResponse,
    ApiQuery,
} from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import { Roles } from "../auth/roles.decorator";
import { AdminService } from "./admin.service";
import { Auth } from "../auth/auth.decorator";
import { AuthContext } from "../auth/auth.types";

@ApiTags("admin")
@ApiBearerAuth()
@Controller("admin")
@Roles("ADMIN")
@Throttle({ short: { limit: 30, ttl: 60000 }, long: { limit: 200, ttl: 3600000 } }) // Stricter limits for admin
export class AdminController {
    constructor(private readonly adminService: AdminService) {}

    @Get("health")
    @ApiOperation({ summary: "Get system health status" })
    @ApiResponse({ status: 200, description: "System health information" })
    async getSystemHealth() {
        return this.adminService.getSystemHealth();
    }

    @Get("stats")
    @ApiOperation({ summary: "Get system-wide statistics" })
    @ApiResponse({ status: 200, description: "System statistics" })
    async getSystemStats() {
        return this.adminService.getSystemStats();
    }

    @Get("tenants")
    @ApiOperation({ summary: "List all tenants" })
    @ApiQuery({ name: "page", required: false, type: Number })
    @ApiQuery({ name: "limit", required: false, type: Number })
    @ApiResponse({ status: 200, description: "List of tenants with pagination" })
    async getAllTenants(
        @Query("page") page?: string,
        @Query("limit") limit?: string
    ) {
        return this.adminService.getAllTenants(
            page ? parseInt(page, 10) : 1,
            limit ? parseInt(limit, 10) : 20
        );
    }

    @Get("users")
    @ApiOperation({ summary: "List all users" })
    @ApiQuery({ name: "page", required: false, type: Number })
    @ApiQuery({ name: "limit", required: false, type: Number })
    @ApiResponse({ status: 200, description: "List of users with pagination" })
    async getAllUsers(
        @Query("page") page?: string,
        @Query("limit") limit?: string
    ) {
        return this.adminService.getAllUsers(
            page ? parseInt(page, 10) : 1,
            limit ? parseInt(limit, 10) : 20
        );
    }

    @Get("audit-logs")
    @ApiOperation({ summary: "Get audit logs" })
    @ApiQuery({ name: "page", required: false, type: Number })
    @ApiQuery({ name: "limit", required: false, type: Number })
    @ApiQuery({ name: "userId", required: false, type: String })
    @ApiQuery({ name: "action", required: false, type: String })
    @ApiQuery({ name: "resource", required: false, type: String })
    @ApiQuery({ name: "startDate", required: false, type: String })
    @ApiQuery({ name: "endDate", required: false, type: String })
    @ApiResponse({ status: 200, description: "Audit logs with pagination" })
    async getAuditLogs(
        @Query("page") page?: string,
        @Query("limit") limit?: string,
        @Query("userId") userId?: string,
        @Query("action") action?: string,
        @Query("resource") resource?: string,
        @Query("startDate") startDate?: string,
        @Query("endDate") endDate?: string
    ) {
        return this.adminService.getAuditLogs(
            page ? parseInt(page, 10) : 1,
            limit ? parseInt(limit, 10) : 50,
            {
                userId,
                action,
                resource,
                startDate: startDate ? new Date(startDate) : undefined,
                endDate: endDate ? new Date(endDate) : undefined,
            }
        );
    }

    @Get("usage")
    @ApiOperation({ summary: "Get usage metrics" })
    @ApiQuery({ name: "tenantId", required: false, type: String })
    @ApiResponse({ status: 200, description: "Usage metrics" })
    async getUsageMetrics(@Query("tenantId") tenantId?: string) {
        return this.adminService.getUsageMetrics(tenantId);
    }

    @Post("tenants/:id/suspend")
    @HttpCode(HttpStatus.OK)
    @Throttle({ short: { limit: 5, ttl: 60000 } }) // Very strict: 5 suspensions per minute
    @ApiOperation({ summary: "Suspend a tenant" })
    @ApiResponse({ status: 200, description: "Tenant suspended" })
    @ApiResponse({ status: 429, description: "Rate limit exceeded" })
    async suspendTenant(
        @Param("id") tenantId: string,
        @Body("reason") reason: string,
        @Auth() auth: AuthContext
    ) {
        return this.adminService.suspendTenant(tenantId, reason, auth.userId);
    }

    @Post("tenants/:id/unsuspend")
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: "Unsuspend a tenant" })
    @ApiResponse({ status: 200, description: "Tenant unsuspended" })
    async unsuspendTenant(
        @Param("id") tenantId: string,
        @Auth() auth: AuthContext
    ) {
        return this.adminService.unsuspendTenant(tenantId, auth.userId);
    }

    @Delete("users/:id")
    @Throttle({ short: { limit: 10, ttl: 60000 } }) // Strict: 10 deletions per minute
    @ApiOperation({ summary: "Delete a user" })
    @ApiResponse({ status: 200, description: "User deleted" })
    @ApiResponse({ status: 429, description: "Rate limit exceeded" })
    async deleteUser(
        @Param("id") userId: string,
        @Auth() auth: AuthContext
    ) {
        return this.adminService.deleteUser(userId, auth.userId);
    }

    @Post("users/:id/impersonate")
    @HttpCode(HttpStatus.OK)
    @Throttle({ short: { limit: 3, ttl: 60000 } }) // Very strict: 3 impersonations per minute
    @ApiOperation({ summary: "Impersonate a user (for debugging)" })
    @ApiResponse({ status: 200, description: "Impersonation details" })
    @ApiResponse({ status: 429, description: "Rate limit exceeded" })
    async impersonateUser(
        @Param("id") userId: string,
        @Auth() auth: AuthContext
    ) {
        return this.adminService.impersonateUser(userId, auth.userId);
    }
}
