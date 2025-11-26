import { Controller, Get, Query } from "@nestjs/common";
import { AuditService } from "./audit.service";
import { Auth } from "../auth/auth.decorator";
import { AuthContext } from "../auth/auth.types";
import { Roles } from "../auth/roles.decorator";

@Controller("audit")
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @Roles("ADMIN", "AGENCY")
  list(@Query("limit") limit?: string, @Auth() auth?: AuthContext) {
    const parsedLimit = limit ? parseInt(limit, 10) : 100;
    return this.auditService.list(auth?.tenantId, parsedLimit);
  }
}
