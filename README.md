# GrowthPilot AI Monorepo (Scaffold)

This repo will hold the GrowthPilot AI platform: a multi-tenant SaaS with an AI multi-agent engine, web dashboard, and mobile app for regulated professionals (starting with doctors) to autopilot marketing with human-in-loop safety.

## Structure
- `apps/api` &mdash; NestJS-style backend (auth/RBAC, tenants, campaigns, content, scheduling, compliance, analytics).
- `apps/web` &mdash; Next.js-style dashboard (calendar, review/approvals, revisions, previews, notifications, billing).
- `packages/shared` &mdash; shared libs/types (schemas, client SDK, utilities).
- `packages/docs` &mdash; docs/prompt registry/compliance rule packs.

## Status
- Repo initialized; implementation plan: `implementation-plan.md`.
- Tooling/dependencies not yet installed (offline environment). Next steps: install deps, scaffold apps, wire lint/test/e2e, add CI, and set up Vercel/GitHub.
