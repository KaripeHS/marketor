# GrowthPilot AI Handoff (Current State & Next Steps)

This file documents what is implemented so far and what remains, so another agent can continue seamlessly.

## What’s Implemented

- **Monorepo scaffold**
  - Workspaces: `apps/api` (Nest-style backend), `apps/web` (Next.js dashboard), `packages/shared` (shared types), `packages/docs` (prompt registry and compliance placeholders).
  - Root scripts for build/dev; `.env.example`, `.gitignore` present.

- **API foundations (Nest-style, TypeScript)**
  - Global ValidationPipe, CORS. Public health/root endpoints.
  - Basic header auth guard (`x-user-id`, `x-tenant-id`) populates auth context; audit interceptor logs to `AuditLog`.

- **Database (Prisma, Postgres/Neon)**
  - Schema deployed to Neon; models:
    - Tenancy/Auth: `Tenant`, `User`, `UserTenantRole` (roles: ADMIN, AGENCY, CLIENT, REVIEWER).
    - Campaigns/Content: `Campaign` (status), `ContentItem` (platform/format/state, scheduling).
    - Approvals/Revisions/Comments: `Approval`, `RevisionRequest` (status), `Comment`.
    - Notifications/Audit: `Notification` (payload JSON, readAt), `AuditLog`.
    - Prompt/Compliance: `PromptVersion`, `ComplianceRule`.
    - Strategy/Planning/Brand: `BrandProfile` (voice/audiences/valueProps/visualStyle JSON), `TrendMap` (JSON), `Strategy` (goals/pillars/platformFocus JSON, date range), `ContentPlan` with `ContentPlanItem` (platform/format/scheduledAt/topicSlug/contentId).

- **API endpoints (tenant-scoped via guard unless marked public)**
  - Tenants: `GET /tenants`, `POST /tenants` (slug validation).
  - Users/Memberships: `GET /users`, `POST /users`, `POST /users/membership` (upsert role).
  - Campaigns: `GET /campaigns` (tenant filter), `POST /campaigns` (tenant from auth).
  - Content: `GET /content` (tenant/campaign filters), `POST /content`, `PATCH /content/:id/state`.
  - Approvals: `GET /approvals`, `POST /approvals/:contentId` upsert status/notes/reviewer.
  - Comments: `GET /comments` (by content or tenant), `POST /comments` (author from auth).
  - Revisions: `GET /revisions` (tenant filter), `POST /revisions` (requestedBy from auth), `PATCH /revisions/:id/status`.
  - Notifications: `GET /notifications` (defaults to auth user), `POST /notifications` (user optional, default auth), `PATCH /notifications/:id/read` (validates ownership).
  - Brand: `GET /brand`, `POST /brand` (upsert per tenant+name, JSON fields).
  - Strategy: `GET /strategy`, `POST /strategy` (dates + JSON goals/pillars/platform focus).
  - Plans: `GET /plans` (with items), `POST /plans` (strategy optional, timeWindow JSON, items with platform/format/scheduledAt/topicSlug/contentId).

- **Web app**
  - Next.js 16 shell with styled landing; no API wiring yet. Configured for standalone build.

- **Shared types**
  - Enums: `Platform`, `ContentFormat`, `ContentState`, `RevisionStatus`. ID type aliases.

- **Prompt/Compliance placeholders**
  - `packages/docs/prompt-registry/registry.yaml`, `packages/docs/compliance/doctor-rules.yaml`.

- **Deployment**
  - Vercel project `marketer` linked via root `vercel.json` (builds `apps/web`). Latest production ready: `https://marketer-bignon-deguenons-projects.vercel.app` (aliases include marketer-ten/...).
  - API currently only exists within the monorepo; no separate hosted API runtime configured.

- **Git/Repo**
  - GitHub: `https://github.com/KaripeHS/marketor.git` (branch `main`). Latest commit: `feat(api): add brand profiles, strategies, and content plans`.

- **DB**
  - Neon database synced to current Prisma schema. `prisma db push` already run with provided `DATABASE_URL`.

## What’s Missing / Next Steps (Detailed)

- **Auth/RBAC (critical)**
  - Integrate real identity (Clerk/OIDC). Validate JWT/session in Nest middleware/guard. Map external user to `User` + `UserTenantRole`.
  - Add role guards (ADMIN/AGENCY/CLIENT/REVIEWER), enforce tenant scoping everywhere. Seed initial users/tenants; add `whoami`.

- **Frontend (major)**
  - Build dashboard: login, tenant switcher, campaigns list/create, content queue with states, approvals, comments, revisions, notifications inbox, brand/strategy/plan views, calendar/schedule, settings, audit log view.
  - Add API client with auth headers, error/loading handling; components for previews and actions.

- **Agents & Prompt Ops**
  - Implement orchestrator + agents: ingestion, trend research, strategy, planner, script/narrative, image/video, caption/metadata, compliance guardian, scheduler/publisher, analytics, learning, reporting.
  - Define agent I/O schemas in `packages/shared`; expand prompt registry with versioned prompts, metadata, CRUD endpoints, A/B flags, diff/rollback.

- **Compliance & Safety**
  - Expand rulepacks (state-level doctor rules, platform policies). Implement Compliance Guardian (claims/PII/disclaimers/banned media) in content workflow. Crisis kill switches per tenant/global. Add red-team/eval harness.

- **Social Integrations & Scheduling**
  - Token vault (encrypted), refresh, rate-limit budgets. Worker queues (BullMQ/Redis) for scheduled posting, retries/backoff.
  - Platform clients or mocks (TikTok/IG/FB/YT). Manual upload fallback. Scheduler service to enqueue posts per plan; publish result handlers.

- **Media Pipeline**
  - Storage client (S3/R2), signed URL uploads, virus/sanity checks, optional transcoding, CDN rules, cost controls. Use Blob token only for light assets if desired.

- **Analytics & Learning**
  - Metrics ingestion per platform, normalized schema; dashboards; top-post detection; timing effectiveness.
  - Learning summaries feeding strategy; reporting (daily/weekly/monthly/90d).

- **Notifications**
  - Integrate providers (Resend/Twilio/Expo push). Templates and preferences. Events: approvals, revisions, schedule, publish success/failure, token expiry, onboarding, digests.

- **Billing/Entitlements**
  - Stripe plans/add-ons, usage metering (posts/media minutes/users), webhooks, entitlements enforcement in API/UI.

- **Ops/CI**
  - Add lint/test/format, CI workflows, staging env, monitoring (Sentry/Prometheus), backups/DR, secrets management (KMS), security headers, RLS-style isolation.
  - Load tests; Playwright E2E for core flows.

- **Mobile (Expo)**
  - Auth, review/approve/reject, notifications inbox, calendar, comments, offline caching, store submission prep.

## How to Run (Current)

- Install: `npm install`
- API: `npm run api:dev` (uses headers `x-user-id`, `x-tenant-id` until real auth); build `npm run api:build`.
- Web: `npm run web:dev`; build `npm run web:build`.
- Prisma: `npm run prisma:generate --workspace apps/api`; `npm run prisma:push --workspace apps/api` (needs `DATABASE_URL`).
- Env: set `DATABASE_URL`, `BLOB_READ_WRITE_TOKEN`, plus upcoming auth/Stripe/SMTP/SMS keys. Add secrets to Vercel `marketer`.

## Latest Deployment

- Vercel project: `marketer`. Production: `https://marketer-bignon-deguenons-projects.vercel.app` (latest deployment `dpl_EwrDfDaHi5UNGULNf92291tTwb8T`).

## Pointers for Next Agent

- Begin with real auth/RBAC integration and seed data; enforce tenant scoping.
- Build web UI tied to API endpoints; add lightweight API client with auth.
- Expand agent contracts and prompt registry; add worker stubs for ingestion/strategy/planning.
- Add storage/social integration stubs with token vault and scheduler workers.
- Harden ops: CI, lint/test, monitoring, secrets, staging.
