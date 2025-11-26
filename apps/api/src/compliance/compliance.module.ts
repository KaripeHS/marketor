import { Module } from "@nestjs/common";
import { ComplianceController } from "./compliance.controller";
import { ComplianceRulesService } from "./compliance-rules.service";
import { ComplianceGuardianService } from "./compliance-guardian.service";

@Module({
    controllers: [ComplianceController],
    providers: [ComplianceRulesService, ComplianceGuardianService],
    exports: [ComplianceRulesService, ComplianceGuardianService],
})
export class ComplianceModule {}
