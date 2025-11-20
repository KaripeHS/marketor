import { Module } from "@nestjs/common";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { PrismaModule } from "./prisma/prisma.module";
import { TenantsModule } from "./tenants/tenants.module";
import { CampaignsModule } from "./campaigns/campaigns.module";
import { ContentModule } from "./content/content.module";
import { UsersModule } from "./users/users.module";
import { ApprovalsModule } from "./approvals/approvals.module";
import { CommentsModule } from "./comments/comments.module";
import { RevisionsModule } from "./revisions/revisions.module";
import { NotificationsModule } from "./notifications/notifications.module";
import { APP_GUARD, APP_INTERCEPTOR } from "@nestjs/core";
import { AuthGuard } from "./auth/auth.guard";
import { AuditInterceptor } from "./audit/audit.interceptor";

@Module({
  imports: [
    PrismaModule,
    TenantsModule,
    CampaignsModule,
    ContentModule,
    UsersModule,
    ApprovalsModule,
    CommentsModule,
    RevisionsModule,
    NotificationsModule
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: AuthGuard },
    { provide: APP_INTERCEPTOR, useClass: AuditInterceptor }
  ]
})
export class AppModule {}
