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
import { BrandModule } from "./brand/brand.module";
import { StrategyModule } from "./strategy/strategy.module";
import { PlansModule } from "./plans/plans.module";
import { AiModule } from "./ai/ai.module";
import { AnalyticsModule } from "./analytics/analytics.module";
import { AuditModule } from "./audit/audit.module";
import { AuthModule } from "./auth/auth.module";
import { SocialModule } from "./social/social.module";
import { InvitationsModule } from "./invitations/invitations.module";
import { MediaModule } from "./media/media.module";
import { SentryModule } from "./sentry/sentry.module";
import { QueueModule } from "./queue/queue.module";
import { CryptoModule } from "./crypto/crypto.module";
import { RateLimitModule } from "./ratelimit/ratelimit.module";
import { ComplianceModule } from "./compliance/compliance.module";
import { BillingModule } from "./billing/billing.module";
import { MetricsModule } from "./metrics/metrics.module";
import { CacheModule } from "./cache/cache.module";
import { APP_GUARD, APP_INTERCEPTOR } from "@nestjs/core";
import { AuthGuard } from "./auth/auth.guard";
import { RolesGuard } from "./auth/roles.guard";
import { AuditInterceptor } from "./audit/audit.interceptor";

@Module({
  imports: [
    PrismaModule,
    SentryModule,
    MetricsModule,
    CacheModule,
    TenantsModule,
    CampaignsModule,
    ContentModule,
    UsersModule,
    ApprovalsModule,
    CommentsModule,
    RevisionsModule,
    NotificationsModule,
    BrandModule,
    StrategyModule,
    PlansModule,
    AiModule,
    AnalyticsModule,
    AuditModule,
    AuthModule,
    SocialModule,
    InvitationsModule,
    MediaModule,
    QueueModule,
    CryptoModule,
    RateLimitModule,
    ComplianceModule,
    BillingModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: AuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_INTERCEPTOR, useClass: AuditInterceptor }
  ]
})
export class AppModule { }
