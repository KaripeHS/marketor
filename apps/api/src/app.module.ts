import { Module } from "@nestjs/common";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { PrismaModule } from "./prisma/prisma.module";
import { TenantsModule } from "./tenants/tenants.module";
import { CampaignsModule } from "./campaigns/campaigns.module";
import { ContentModule } from "./content/content.module";

@Module({
  imports: [PrismaModule, TenantsModule, CampaignsModule, ContentModule],
  controllers: [AppController],
  providers: [AppService]
})
export class AppModule {}
