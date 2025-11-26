import { Module } from "@nestjs/common";
import { ContentService } from "./content.service";
import { ContentController } from "./content.controller";
import { ComplianceModule } from "../compliance/compliance.module";

@Module({
  imports: [ComplianceModule],
  providers: [ContentService],
  controllers: [ContentController]
})
export class ContentModule {}
