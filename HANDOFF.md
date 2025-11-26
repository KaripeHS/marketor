# GrowthPilot AI Handoff (Current State & Next Steps)

This file documents what is implemented so far and what remains, so another agent can continue seamlessly.

## What's Implemented

- **Monorepo scaffold**
  - Workspaces: `apps/api` (Nest-style backend), `apps/web` (Next.js dashboard), `packages/shared` (shared types), `packages/docs` (prompt registry and compliance placeholders).
  - Root scripts for build/dev; `.env.example`, `.gitignore` present.

- **API foundations (Nest-style, TypeScript)**
  - Global ValidationPipe, CORS. Public health/root endpoints.
  - **JWT Authentication** with bcrypt password hashing, Bearer token validation, and legacy header auth fallback.
  - Auth guard supports both `Authorization: Bearer <token>` and `x-user-id`/`x-tenant-id` headers.
  - **Role-Based Access Control (RBAC)** via `@Roles()` decorator and `RolesGuard` - roles: ADMIN, AGENCY, CLIENT, REVIEWER.
  - Audit interceptor logs to `AuditLog`.
  - **AI Module** with agent orchestration framework:
    - `POST /ai/generate` - Legacy generation endpoint for strategy/content ideas.
    - `GET /ai/prompts` - List all registered prompts (filterable by agent type).
    - `GET /ai/prompts/:agentType` - Get prompt for specific agent type (optional version param).
    - `GET /ai/prompts/:agentType/versions` - List all versions for an agent type.
    - `POST /ai/prompts` (ADMIN) - Register new prompt version.
    - `POST /ai/prompts/:agentType/:version/deactivate` (ADMIN) - Deactivate a prompt version.
    - `POST /ai/agents/execute` (ADMIN/AGENCY) - Execute an agent with variables.
    - `GET /ai/agents/types` - List all agent types with descriptions.
  - **Auth Module** with `/auth/register`, `/auth/login`, `/auth/whoami`, `/auth/refresh` endpoints.
  - **Audit Module** (`/audit`) for viewing audit logs with filtering.
  - **Social Module** for social platform connections and publishing queue.
  - **Queue Module** (BullMQ/Redis) for job processing with worker, scheduler, and automatic retries.
  - **Crypto Module** for token encryption at rest using AES-256-GCM.
  - **RateLimit Module** for per-platform API rate limiting with windowed and daily budgets.
  - **Compliance Module** with Compliance Guardian for content safety checks:
    - Rule categories: claims, PII, disclaimers, banned content, platform policy, medical, financial, legal, brand safety.
    - Built-in rulesets: `platform_general`, `medical_general`, `financial_general`, `privacy_pii`, `brand_safety`.
    - Severity levels: critical, high, medium, low, info with weighted scoring (0-100).
  - **Analytics Module** with real metrics ingestion and learning:
    - Metrics ingestion: `POST /analytics/ingest`, `POST /analytics/ingest/batch`, `POST /analytics/fetch/:contentId`.
    - Dashboard: `GET /analytics/dashboard`, `GET /analytics/overview`, `GET /analytics/platforms`, `GET /analytics/timeseries`, `GET /analytics/top-content`, `GET /analytics/comparison`.
    - Content metrics: `GET /analytics/content/:contentId`, `GET /analytics/content/:contentId/history`.
    - Learning insights: `GET /analytics/insights`, `POST /analytics/insights/analyze`.
    - Supports flexible period queries (7d, 30d, 90d, 1y, etc.).

- **Database (Prisma, Postgres/Neon)**
  - Schema deployed to Neon; models:
    - Tenancy/Auth: `Tenant`, `User`, `UserTenantRole` (roles: ADMIN, AGENCY, CLIENT, REVIEWER).
    - Campaigns/Content: `Campaign` (status), `ContentItem` (platform/format/state, scheduling, title/script/caption/hashtags/mediaUrl/thumbnailUrl).
    - Approvals/Revisions/Comments: `Approval`, `RevisionRequest` (status), `Comment`.
    - Notifications/Audit: `Notification` (type, channel, title, body, payload), `NotificationPreference` (channel/type preferences, quiet hours), `NotificationTemplate`, `AuditLog`.
    - Prompt/Compliance: `PromptVersion`, `ComplianceRule`.
    - **Analytics**: `ContentMetrics` (per-content daily metrics with engagement, views, watch time), `DailyAnalytics` (aggregated daily stats per platform), `LearningInsight` (AI-generated patterns and recommendations).
    - Strategy/Planning/Brand: `BrandProfile` (voice/audiences/valueProps/visualStyle JSON), `TrendMap` (JSON), `Strategy` (goals/pillars/platformFocus JSON, date range), `ContentPlan` with `ContentPlanItem` (platform/format/scheduledAt/topicSlug/contentId).
    - **Social Integration**: `SocialConnection` (platform/accountId/tokens/scopes), `PostJob` (contentId/platform/status/attempts/scheduledFor), `PublishResult` (platformPostId/platformUrl).
    - **Billing**: `Subscription` (stripeCustomerId, plan, status, limits), `UsageRecord` (type, quantity, period), `Invoice` (stripeInvoiceId, amount, status), `PlanDefinition` (limits, features, pricing).

- **API endpoints (tenant-scoped via guard unless marked public)**
  - Tenants: `GET /tenants`, `GET /tenants/:id`, `POST /tenants` (ADMIN), `PATCH /tenants/:id` (ADMIN).
  - Users/Memberships: `GET /users` (ADMIN/AGENCY), `GET /users/:id`, `POST /users` (ADMIN), `POST /users/membership` (ADMIN).
  - Campaigns: `GET /campaigns`, `GET /campaigns/:id`, `POST /campaigns`, `PATCH /campaigns/:id` (ADMIN/AGENCY/CLIENT), `DELETE /campaigns/:id` (ADMIN/AGENCY).
  - Content: `GET /content`, `GET /content/:id`, `POST /content`, `PATCH /content/:id/state` (auto compliance check on COMPLIANCE_REVIEW), `GET /content/:id/compliance`, `PATCH /content/:id` (ADMIN/AGENCY/CLIENT), `DELETE /content/:id` (ADMIN/AGENCY).
  - Approvals: `GET /approvals`, `POST /approvals/:contentId` (ADMIN/AGENCY/REVIEWER).
  - Comments: `GET /comments`, `POST /comments`.
  - Revisions: `GET /revisions`, `POST /revisions`, `PATCH /revisions/:id/status`.
  - Notifications: `GET /notifications`, `POST /notifications`, `PATCH /notifications/:id/read`.
  - Brand: `GET /brand`, `POST /brand` (ADMIN/AGENCY).
  - Strategy: `GET /strategy`, `POST /strategy` (ADMIN/AGENCY), `PATCH /strategy/:id` (ADMIN/AGENCY), `DELETE /strategy/:id` (ADMIN/AGENCY).
  - Plans: `GET /plans`, `POST /plans` (ADMIN/AGENCY).
  - AI: `POST /ai/generate`.
  - Auth: `GET /auth/whoami`.
  - Audit: `GET /audit` (ADMIN/AGENCY).
  - **Compliance**:
    - Rules: `GET /compliance/rules`, `GET /compliance/rules/rulesets`, `GET /compliance/rules/:ruleId`.
    - Checks: `POST /compliance/check` (inline content), `POST /compliance/check/:contentId`, `POST /compliance/check/batch`.
    - Quick checks: `POST /compliance/check/pii`, `POST /compliance/check/medical`, `POST /compliance/check/financial`.
  - **Notifications** (enhanced):
    - `GET /notifications` - List notifications with filtering (type, channel, unreadOnly, pagination).
    - `GET /notifications/unread-count` - Get unread notification count.
    - `PATCH /notifications/:id/read` - Mark single notification as read.
    - `POST /notifications/read-all` - Mark all notifications as read.
    - `DELETE /notifications/:id` - Delete single notification.
    - `DELETE /notifications` - Delete all notifications.
    - `GET /notifications/preferences` - Get user's notification preferences.
    - `PATCH /notifications/preferences` - Update notification preferences.
    - `GET /notifications/stats` (ADMIN) - Get notification statistics.
  - **Invitations**:
    - `GET /invitations` (ADMIN/AGENCY) - List all invitations for tenant.
    - `GET /invitations/pending` - Get pending invitations for current user.
    - `GET /invitations/verify/:token` (Public) - Verify invitation token.
    - `GET /invitations/:id` (ADMIN/AGENCY) - Get invitation details.
    - `POST /invitations` (ADMIN/AGENCY) - Create invitation (7-day expiry).
    - `POST /invitations/:token/accept` - Accept invitation and join tenant.
    - `PATCH /invitations/:id/cancel` (ADMIN/AGENCY) - Cancel pending invitation.
    - `PATCH /invitations/:id/resend` (ADMIN/AGENCY) - Resend with new token.
    - `DELETE /invitations/:id` (ADMIN/AGENCY) - Delete invitation.
  - **Social**:
    - Connections: `GET /social/connections`, `GET /social/connections/:id`, `POST /social/connections` (ADMIN/AGENCY), `PATCH /social/connections/:id/disconnect` (ADMIN/AGENCY), `DELETE /social/connections/:id` (ADMIN/AGENCY), `POST /social/connections/:id/refresh` (ADMIN/AGENCY).
    - Jobs: `GET /social/jobs`, `GET /social/jobs/stats`, `GET /social/jobs/:id`, `POST /social/jobs` (ADMIN/AGENCY/CLIENT), `PATCH /social/jobs/:id/cancel` (ADMIN/AGENCY), `PATCH /social/jobs/:id/retry` (ADMIN/AGENCY), `POST /social/jobs/process` (ADMIN - fallback worker endpoint).
    - Queue: `GET /social/queue/stats` (ADMIN), `POST /social/queue/pause` (ADMIN), `POST /social/queue/resume` (ADMIN).
    - Rate Limits: `GET /social/ratelimits`, `GET /social/ratelimits/configs`, `GET /social/ratelimits/:platform`, `POST /social/ratelimits/:platform/reset` (ADMIN).
  - **OAuth** (real platform integrations):
    - `GET /social/oauth/platforms` - List all platforms with configuration status.
    - `GET /social/oauth/:platform/authorize` (ADMIN/AGENCY) - Initiates OAuth flow, redirects to platform.
    - `GET /social/oauth/:platform/callback` (Public) - Handles OAuth callback, creates/updates connection.
    - `GET /social/oauth/refresh/:connectionId` (ADMIN/AGENCY) - Refresh access tokens.
  - **Billing**:
    - `GET /billing/subscription` - Get current subscription with limits and usage.
    - `GET /billing/plans` - List available plans.
    - `POST /billing/checkout` (ADMIN) - Create Stripe checkout session.
    - `POST /billing/portal` (ADMIN) - Create Stripe billing portal session.
    - `POST /billing/cancel` (ADMIN) - Cancel subscription.
    - `POST /billing/resume` (ADMIN) - Resume canceled subscription.
    - `GET /billing/invoices` - List invoices.
    - `GET /billing/usage` - Get current usage summary.
    - `GET /billing/usage/history` - Get usage history.
    - `GET /billing/entitlements` - Check feature entitlements.
    - `POST /billing/webhook` (Public) - Stripe webhook handler.

- **Web app (fully wired to API)**
  - Next.js 16 App Router with Tailwind CSS styling.
  - **Landing page** with marketing content and login CTA.
  - **Login page** with real email/password authentication via JWT.
  - **Register page** for new user sign-up (creates user + default tenant).
  - **Dashboard layout** with responsive sidebar (mobile hamburger menu), **tenant switcher** for users with multiple memberships.
  - **Dashboard pages**:
    - `/dashboard` - Overview with stats cards and quick actions.
    - `/dashboard/campaigns` - List/create/edit/delete campaigns with Eye link to detail view.
    - `/dashboard/campaigns/[id]` - Campaign detail with content items, **AI-powered content suggestions** modal.
    - `/dashboard/content` - Content queue with state management.
    - `/dashboard/content/[id]` - **Full content editor** with title, script, caption, hashtags editors, media preview, approval actions, and comments section.
    - `/dashboard/brand` - Brand profile management (voice, audiences, value props, visual style).
    - `/dashboard/strategy` - Strategy CRUD with **AI auto-generation** for goals/pillars/platform focus.
    - `/dashboard/plans` - Content plans with plan items.
    - `/dashboard/calendar` - **Interactive calendar** with day selection, content scheduling modal, unscheduled content sidebar, and status legend.
    - `/dashboard/integrations` - **Social integrations page** with connected accounts management, publishing queue, job stats, and mock OAuth flow.
    - `/dashboard/analytics` - Analytics dashboard with mock metrics.
    - `/dashboard/notifications` - Notifications inbox with read/unread filtering, mark as read.
    - `/dashboard/revisions` - Revision requests list.
    - `/dashboard/audit` - Audit log viewer.
    - `/dashboard/settings` - Settings page (placeholder).
    - `/dashboard/team` - **Team management page** with member list, pending invitations, invitation history, invite modal with role selection.
    - `/invite/[token]` - **Invitation acceptance page** for users to accept invitations to join organizations.
  - **API services** (`services/api.ts`) for all endpoints with Axios client, including social connections, post jobs, and invitations services.
  - **Auth context** with JWT token management, login/register/logout, tenant switching support.
  - **Tenant switcher component** for switching between organizations.
  - **TypeScript types** for all API models including social integration and invitation types.
  - **Toast notifications** using Sonner for user feedback.
  - **Rich text editor** (Tiptap) component for content scripts and captions with formatting toolbar (bold, italic, underline, strikethrough, headings, lists, blockquotes, links, undo/redo).
  - **Media upload system** with drag-and-drop uploader component, file validation (type, size), preview, and storage adapter architecture (mock + Vercel Blob ready).
  - **Platform preview mode** with realistic mockups for TikTok, Instagram (Feed + Reels), YouTube, YouTube Shorts, and Facebook. Switchable preview with platform-specific tips.

- **Shared types** (`packages/shared`)
  - Enums: `Platform`, `ContentFormat`, `ContentState`, `RevisionStatus`, `ApprovalStatus`, `CampaignStatus`, `PostJobStatus`. ID type aliases.
  - **Agent types**: `AgentType` enum (13 agent types), `AgentStatus` enum, `AgentContext`, `AgentInput`, `AgentOutput` interfaces.
  - **Agent I/O schemas**: Typed input/output interfaces for each agent (TrendResearch, Strategy, Planner, ScriptWriter, CaptionWriter, Compliance, Analytics, Learning, Reporting).

- **Prompt/Compliance placeholders**
  - `packages/docs/prompt-registry/registry.yaml`, `packages/docs/compliance/doctor-rules.yaml`.

- **Deployment**
  - Vercel project `marketer` linked via root `vercel.json` (builds `apps/web`). Latest production ready: `https://marketer-bignon-deguenons-projects.vercel.app` (aliases include marketer-ten/...).
  - API currently only exists within the monorepo; no separate hosted API runtime configured.

- **CI/CD**
  - GitHub Actions workflow (`.github/workflows/ci.yml`) for automated builds on push/PR.
  - Runs: npm install, Prisma generate, API build, Web build, lint, tests.
  - Auto-pushes DB schema to Neon on main branch merges (requires `DATABASE_URL` secret).

- **Testing & Linting**
  - **ESLint** configured with flat config (`eslint.config.mjs`) for TypeScript with relaxed rules for rapid development.
  - **Jest** testing framework for API with ts-jest, configured for TypeScript.
  - Test suites for `MediaService`, `AuthService`, and `ContentService` (30 tests total, all passing).
  - Run tests: `npm test`, Run lint: `npm run lint`, Fix lint: `npm run lint:fix`.

- **Error Monitoring (Sentry)**
  - **API**: Sentry Node SDK with Express integration, global exception filter for 5xx errors, user/tenant context.
  - **Web**: Sentry React SDK with browser tracing, session replay, global error boundary.
  - Set `SENTRY_DSN` (API) and `NEXT_PUBLIC_SENTRY_DSN` (Web) environment variables to enable.

- **Git/Repo**
  - GitHub: `https://github.com/KaripeHS/marketor.git` (branch `main`).

- **DB**
  - Neon database synced to current Prisma schema. `prisma db push` already run with provided `DATABASE_URL`.

## What's Missing / Next Steps (Detailed)

### Immediate Priority

- No immediate priority items remaining. All content editor enhancements complete.

### Medium-Term

- **Agents & Prompt Ops** (foundation complete)
  - ~~Define agent I/O schemas in `packages/shared`~~ (done - 13 agent types with full typed I/O schemas).
  - ~~Prompt registry with versioned prompts, metadata, CRUD endpoints~~ (done - `PromptRegistryService` with default prompts for all agents).
  - ~~Base agent orchestrator~~ (done - `AgentOrchestratorService` with OpenAI integration, retry logic, mock fallbacks).
  - Next: Implement individual agent logic beyond mock responses; add A/B flags, diff/rollback; add database persistence for prompts.

- **Compliance & Safety** (foundation complete)
  - ~~Implement Compliance Guardian (claims/PII/disclaimers/banned media) in content workflow~~ (done).
  - ~~Built-in rulesets for platform policies, medical, financial, PII, brand safety~~ (done).
  - ~~Integration with content state transitions~~ (done - auto-check on COMPLIANCE_REVIEW).
  - Next: Expand rulepacks (state-level doctor rules, more platform-specific rules). Crisis kill switches per tenant/global. Add red-team/eval harness.

- **Social Integrations Enhancement**
  - ~~Real OAuth flows for TikTok, Instagram, Facebook, YouTube~~ (done - requires platform credentials).
  - ~~Token vault with encryption at rest~~ (done - set `TOKEN_ENCRYPTION_KEY` to enable AES-256-GCM encryption).
  - ~~Worker queues (BullMQ/Redis) for scheduled posting with retries/backoff~~ (done - set `REDIS_URL` to enable).
  - ~~Rate-limit budgets per platform~~ (done - per-platform windowed and daily limits, enforced in PostJobProcessor).

- **Media Pipeline**
  - Vercel Blob storage now fully connected (set `BLOB_READ_WRITE_TOKEN` in production).
  - Optional enhancements: virus/sanity checks, transcoding, CDN rules, cost controls.

### Longer-Term

- **Analytics & Learning** (foundation complete)
  - ~~Metrics ingestion per platform, normalized schema~~ (done - `ContentMetrics`, `DailyAnalytics` models).
  - ~~Real dashboards with actual data~~ (done - `AnalyticsAggregationService` with dashboard/overview/timeseries/comparison).
  - ~~Top-post detection; timing effectiveness analysis~~ (done - `LearningInsightsService` analyzes timing, format, hashtags).
  - ~~Learning summaries feeding strategy~~ (done - insights/best practices/strategy recommendations).
  - Next: Connect to real platform APIs for metrics fetching; add scheduled metrics sync jobs; build automated reporting (daily/weekly/monthly).

- **Notifications Enhancement** (foundation complete)
  - ~~Email service with Resend integration~~ (done - `EmailService` with API key config).
  - ~~Notification templates with variable interpolation~~ (done - `NotificationTemplatesService` with 18 notification types, HTML email templates).
  - ~~Notification preferences per user/tenant~~ (done - channel toggles, type preferences, quiet hours).
  - ~~Notification trigger service~~ (done - `NotificationTriggerService` with convenience methods for common events).
  - 18 notification types: approval workflow, revisions, comments, mentions, publishing, token expiry, digests, invitations, system announcements.
  - Next: Implement push notifications (Expo push/web push), scheduled digest emails, real email sending in production (requires RESEND_API_KEY).

- **Billing/Entitlements** (foundation complete)
  - ~~Stripe integration for subscription management~~ (done - `StripeService` with checkout, portal, webhooks).
  - ~~Plan definitions with limits~~ (done - FREE, STARTER, PROFESSIONAL, AGENCY, ENTERPRISE plans).
  - ~~Usage metering~~ (done - `UsageService` tracks posts, storage, team members, platforms, AI generations).
  - ~~Entitlements guard for feature gating~~ (done - `@RequireEntitlement()` decorator with `EntitlementsGuard`).
  - Prisma models: `Subscription`, `UsageRecord`, `Invoice`, `PlanDefinition`.
  - Endpoints: `GET /billing/subscription`, `GET /billing/plans`, `POST /billing/checkout`, `POST /billing/portal`, `GET /billing/usage`, `GET /billing/entitlements`, webhook handler.
  - Next: Configure Stripe products/prices in dashboard, connect webhook endpoint, test end-to-end subscription flow.

- **Ops/CI**
  - ~~Sentry error monitoring~~ (done - needs DSN configured in Vercel/production).
  - Prometheus metrics, backups/DR, secrets management (KMS), security headers, RLS-style isolation.
  - Load tests; Playwright E2E for core flows.

- **Mobile (Expo)**
  - Auth, review/approve/reject, notifications inbox, calendar, comments, offline caching, store submission prep.

## How to Run (Current)

- Install: `npm install`
- API: `npm run api:dev`; build `npm run api:build`.
- Web: `npm run web:dev`; build `npm run web:build`.
- Prisma: `npm run prisma:generate --workspace apps/api`; `npm run prisma:push --workspace apps/api` (needs `DATABASE_URL`).
- Env: set `DATABASE_URL`, `BLOB_READ_WRITE_TOKEN`, `JWT_SECRET`, `SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN`, `REDIS_URL` (optional - enables BullMQ queues), `TOKEN_ENCRYPTION_KEY` (optional - 64 hex chars for AES-256-GCM, generate with `openssl rand -hex 32`), `RESEND_API_KEY` (optional - enables email notifications), `EMAIL_FROM` (optional - sender email), `APP_URL` (optional - for email links), `STRIPE_SECRET_KEY` (optional - enables billing), `STRIPE_WEBHOOK_SECRET` (optional - for Stripe webhooks), `OPENAI_API_KEY` (optional - enables AI agents), plus OAuth credentials for platforms:
  - TikTok: `TIKTOK_CLIENT_KEY`, `TIKTOK_CLIENT_SECRET`, `TIKTOK_REDIRECT_URI`
  - Instagram/Facebook: `INSTAGRAM_CLIENT_ID`, `INSTAGRAM_CLIENT_SECRET`, `FACEBOOK_APP_ID`, `FACEBOOK_APP_SECRET`
  - YouTube: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `YOUTUBE_REDIRECT_URI`
  - Set `API_URL` and `WEB_APP_URL` for OAuth redirects. Add secrets to Vercel `marketer`.

## Latest Deployment

- Vercel project: `marketer`. Production: `https://marketer-bignon-deguenons-projects.vercel.app`.

## Pointers for Next Agent

- Configure OAuth credentials for TikTok, Instagram, Facebook, YouTube in production environment.
- Add `REDIS_URL` to enable BullMQ worker queues (Upstash, Redis Cloud, or self-hosted Redis).
- Add `TOKEN_ENCRYPTION_KEY` to enable token encryption at rest (generate with `openssl rand -hex 32`).
- Add `BLOB_READ_WRITE_TOKEN` to Vercel environment variables to enable production media uploads.
- Agent foundation is complete - implement actual agent logic in `AgentOrchestratorService` (currently returns mocks when OPENAI_API_KEY not set).
- Add more tests (Jest for API: more services), Playwright for E2E.
- Configure Sentry DSN in Vercel environment variables for production error tracking.
- Implement real platform publishing in `PostJobProcessor` (currently mock responses).
