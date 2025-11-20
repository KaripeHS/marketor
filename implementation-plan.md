# GrowthPilot AI Implementation Plan

## Purpose & Scope
Build GrowthPilot AI: an autonomous, multi-agent marketing engine and SaaS for regulated professionals (starting with doctors) that plans, creates, approves, schedules, publishes, analyzes, and optimizes daily multi-platform content with human-in-loop safety. This plan covers architecture, delivery phases, compliance, infra, testing, and success criteria for the first 6 months.

## Success Criteria
- Production-grade multi-tenant web + mobile apps with secure auth, RBAC, audit logging.
- Autopilot content loop live for pilot tenants: daily posts to TikTok/IG/YT/FB with approval flow and compliance guardrails; autopilot optional.
- Prompt/version ops in place with rollback, A/B, regression evals; every artifact tagged with prompt/version.
- Compliance: doctor-specific rules (claims, disclaimers, banned media) enforced by Compliance Guardian; auditability for all decisions; HIPAA-adjacent practices.
- Reliability: monitored queues, retries, alerts, backups + DR drill; SLOs for publish/job success; rate-limit-aware schedulers.
- Analytics + learning loop v2 adjusting strategy from real metrics; weekly reports generated.
- Billing + entitlement model live with Stripe; per-tenant isolation and encryption of secrets/tokens.

## Guiding Principles
- Human-in-loop by default; autopilot requires explicit opt-in and kill switch.
- Safety/compliance-first for doctors; default-block then regenerate.
- Deterministic data contracts between agents; everything is versioned, audited, and reproducible.
- Modular, replaceable agents; model-agnostic interfaces; minimal coupling.
- Operational excellence baked in early: monitoring, backups, QA, and DR rehearsals.

## Architecture Overview
- Backend: NestJS modular monolith; Postgres + Prisma; Redis + BullMQ for queues; S3/R2 + CDN for media; S3-style signed URLs; feature flags.
- Multi-tenant: tenants/agencies/clients; strict row-level isolation; per-tenant secrets vault (KMS); token encryption + refresh; rate-limit budgets per tenant.
- Agents (per core reference): Orchestrator, Brand Ingestion, Trend & Keyword, Strategy, Planner, Script/Narrative, Image Gen, Video Assembly, Caption/Metadata, Compliance Guardian, Scheduler/Publisher, Analytics, Learning/Optimization, Reporting; Brand Memory Service backing store for BrandProfile/TrendMap/ContentPlan/PostArtifact/AnalyticsSnapshot/LearningSummary.
- Data contracts: versioned JSON schemas for all inputs/outputs; stored with prompt/version IDs; validation layer in Orchestrator.
- Lifecycles: content item state machine (draft ? scripted ? assets ? compliance ? scheduled ? published ? measured ? learned) with idempotent transitions and retry metadata.

## Data & Schemas (initial cut)
- BrandProfile, TrendMap, Strategy, ContentPlan, ContentItem, ScriptPackage, MediaArtifact, CaptionMetadata, ComplianceReview, ScheduleJob, PostResult, AnalyticsSnapshot, LearningSummary, Report.
- AuditLog entries for auth, approvals, publishing, compliance decisions, prompt changes.
- Asset metadata (format, duration, resolution, size, checksums, source refs).
- Billing: plans, subscription, usage meters (posts, media minutes), entitlements.

## AI & Prompt Operations
- Prompt registry (JSON/YAML) with history table; diff viewer; rollback; A/B flags; ownership + changelog.
- Prompt evaluation harness: lint, schema checks, golden tests per persona/industry; regression suite in CI; automatic scoring (toxicity/compliance/readability/SEO); red-team prompts for medical claims.
- Model routing layer: choose LLM/vision; temperature defaults per agent; deterministic seeds where feasible; caching of embeddings/profile fetches.
- Brand ingestion: crawl site/PDF/docs; extract voice/tone/visual cues; embed to vector store; generate BrandProfile + seed topics/personas; store in Brand Memory.
- Trend research: connectors (search trends, social/SEO/hashtag APIs) abstracted for future live integrations; produce daily/weekly TrendMap.
- Strategy/Planning: Strategy object (goals, pillars, platform focus, topic pipeline); Planner outputs ContentPlan with timezone-aware schedule and per-platform cadence.
- Creation: Script/Narrative produces hooks/beats/overlays; Image Gen + Video Assembly per platform specs; Caption/Metadata adds captions/hashtags/titles/alt text; all tagged with prompt/version.
- Learning loop: ingest AnalyticsSnapshots ? LearningSummary ? Strategy; track hypotheses + outcomes.

## Compliance & Safety
- Rule packs: doctor-specific claims/disclaimers, banned before/after, testimonial rules, FDA constraints, state-by-state toggles; platform policy summaries.
- Compliance Guardian: PII scan, claim validation, banned phrase/media detection, required disclaimers injection, tone guard; block or rewrite with reasons; audit trail.
- Human approval default; autopilot toggle with warnings; crisis kill switch to pause publishing per tenant/global.
- Token safety: encryption at rest; short-lived access; rotation reminders; scoped permissions.

## Content & Publishing Workflow (happy path)
1) Intake: onboarding questionnaire + assets + competitor links + autopilot preference.
2) Brand ingestion ? BrandProfile in memory.
3) Trend map refresh (daily/weekly).
4) Strategy generation (weekly/rolling) ? Planner builds ContentPlan.
5) For each item: Script/Narrative ? Image Gen/Video Assembly ? Caption/Metadata.
6) Compliance Guardian checks package; on fail: regenerate or send to human revision queue.
7) Schedule/Publish agent enqueues jobs per platform; retries/backoff; manual override path.
8) Analytics agent pulls metrics; stored in memory.
9) Learning agent updates hypotheses; feeds Strategy; Reporting generates weekly/monthly/90d narratives.
10) Revision workflow supports branchable versions and rollbacks; diff of captions/scripts/assets.

## Product (Web)
- Roles: Admin (platform), Agency, Client. RBAC on tenants/campaigns/assets.
- Screens: onboarding intake; campaign dashboard; calendar; content queue (draft/review/scheduled/published); previews (TikTok/IG/YT/FB); approvals/rejections with reason; revision threads + @mentions + attachments; autopilot toggle; notifications inbox; audit log viewer; token/connection manager; billing page; settings for compliance preferences.

## Mobile (Expo)
- Auth (Clerk/oidc), tenant switcher; notifications inbox; review/approve/reject with reasons; rich previews; calendar; comments/revisions; autopilot toggle (with warnings); offline-friendly caching; app store/play store prep.

## Media & Asset Pipeline
- Uploads via signed URLs; virus scan + image/video sanity checks; transcoding stubs for future; CDN caching; foldering per tenant/campaign/content_id; lifecycle policies; checksum logging.

## Scheduling & Social Integrations
- OAuth/token vault; refresh + expiry alerts; platform-specific posting services with rate-limit budgets; dry-run mode; manual upload fallback; structured error taxonomy; retries/backoff; time-zone aware scheduling.

## Analytics & Reporting
- Normalizers per platform (likes/comments/shares/saves/views/watch time/retention/clicks); audience slices; timing effectiveness; top-post detection.
- Dashboards: per-platform/topic/format performance, trend deltas, funnel to site clicks.
- Reports: daily micro, weekly effectiveness, monthly growth, 90-day strategy; narrative + JSON; recommendations auto-fed to Strategy.

## Collaboration & Notifications
- Comment threads with @mentions, internal vs client visibility, activity feed; attachments.
- Notifications: email (Resend), SMS (Twilio), push (Expo); templates for approvals, deadlines, failures, digests; escalation ladder for no-response.

## Billing & Entitlements
- Stripe subscriptions; plans + add-ons; usage meters (posts/media minutes/users); entitlements enforced in API/UI; webhook handlers with retries; invoice emails.

## Infra, Security, SRE
- Environments: dev/stage/prod; seeded demo tenants; feature flags.
- Security: JWT sessions + Clerk/oidc; KMS-backed secret store; TLS; least-privilege IAM; RLS-style data isolation; OWASP checks; secure headers; IP/region allowlists for admin.
- Observability: Sentry, Prometheus/Grafana, distributed tracing; alerts for queue lag, publish failures, token expiry, error rates, latency, DRIFT in AI evals.
- Backups/DR: daily DB backups + PITR; media backup rules; DR runbook + quarterly drills; infra-as-code (Terraform) for reproducibility.
- Performance/scaling: worker autoscaling; circuit breakers on external APIs; bulkhead queues; rate-limit budgeting per tenant.

## Testing & QA
- Unit/integration tests for modules/agents/schedulers/RBAC; contract tests for social API mocks; load tests for queues/media; synthetic data packs per industry.
- Prompt regression suite; automated evals; red-team for compliance; golden datasets.
- E2E (Playwright) for onboarding ? campaign ? creation ? approval ? schedule; staging QA checklist; release gates tied to test pass + eval scores.

## Delivery Timeline (6 months)
- Phase 0 (Weeks 1–2): finalize industry schemas; prompt registry foundation; architecture blueprint; compliance rule packs; onboarding questionnaire; DR/monitoring outline.
- Phase 1 (Weeks 3–8): build multi-tenant backend (auth/RBAC/tenants/campaigns/content/queues/assets); Brand Memory store; core agents + prompt ops; storage/CDN; dashboard v1; approval/revision v1.
- Phase 2 (Weeks 9–16): social API integrations + rate-limit scheduler; notifications; collaboration/comments; previews + calendar; revision v2; industry templates.
- Phase 3 (Weeks 17–22): mobile app (Expo) with review/approval/notifications/calendar; analytics engine + dashboards; Learning Loop v2 wired to Strategy.
- Phase 4 (Weeks 23–26): harden monitoring/alerting; backups + DR drills; QA/regression/load; pen-test pass; beta with pilot tenants; bugfixes; public launch with billing + compliance + autopilot safeguards.

## Risks & Mitigations
- Social API approval/quotas: start early with sandbox keys; manual upload fallback; rate-limit budgeting.
- Compliance gaps: enforce rule packs early; block-by-default; human approval default until score confidence high.
- Quality variance: prompt tests + evals; weekly human scoring; autopilot disabled if quality dips.
- Media cost/latency: cache assets; budget controls per tenant; async pipelines with retries.
- Reliability: SLOs + error budgets; circuit breakers; kill switch per tenant/global.

## Immediate Next Steps (Phase 0 kick-off)
1) Confirm tech stack choices (NestJS/Prisma/Redis/BullMQ/Expo/Stripe/Resend/Twilio/S3/R2) and provision dev env.
2) Draft detailed industry compliance rule packs (doctors, dentists, medspa, wedding vendors) and onboarding questionnaires.
3) Build prompt registry scaffolding + CI lint/eval harness; define JSON schemas for all agent contracts.
4) Produce architecture diagrams (multi-tenant, agent flows, queues, rate limits, DR paths) and commit to repo.
