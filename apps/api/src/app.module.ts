import { Module } from "@nestjs/common";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { PrismaModule } from "./prisma/prisma.module";
import { TenantsModule } from "./tenants/tenants.module";
import { CampaignsModule } from "./campaigns/campaigns.module";
import { ContentModule } from "./content/content.module";
import { UsersModule } from "./users/users.module";
import { ApprovalsModule } from "./approvals/approvals.module";

@Module({
  imports: [PrismaModule, TenantsModule, CampaignsModule, ContentModule, UsersModule, ApprovalsModule],
  controllers: [AppController],
  providers: [AppService]
})
export class AppModule {}
