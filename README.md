# GrowthPilot AI Monorepo (Scaffold)

This repo will hold the GrowthPilot AI platform: a multi-tenant SaaS with an AI multi-agent engine, web dashboard, and mobile app for regulated professionals (starting with doctors) to autopilot marketing with human-in-loop safety.

## Structure
- `apps/api` &mdash; NestJS-style backend (auth/RBAC, tenants, campaigns, content, scheduling, compliance, analytics).
- `apps/web` &mdash; Next.js-style dashboard (calendar, review/approvals, revisions, previews, notifications, billing).
- `packages/shared` &mdash; shared libs/types (schemas, client SDK, utilities).
- `packages/docs` &mdash; docs/prompt registry/compliance rule packs.

## Status
- Repo initialized; implementation plan: `implementation-plan.md`.
- Base dependencies installed for API (NestJS) and Web (Next.js). Shared/docs/prompt/compliance placeholders present.
- Git remote set to `https://github.com/KaripeHS/marketor.git`.

## Getting Started
- Install deps: `npm install`
- Run web (Next.js): `npm run web:dev`
- Run API (Nest-style): `npm run api:dev` (listens on `API_PORT` or 4000)
- Build web: `npm run web:build`
- Build API: `npm run api:build`
- Prisma (API): `npm run prisma:generate --workspace apps/api`, `npm run prisma:push --workspace apps/api` (requires `DATABASE_URL`)

## Deployment (Vercel)
- Auth verified via CLI (`vercel whoami` should show `karipehs`).
- Configured with `vercel.json` to build `apps/web` from repo root. Deploy: `vercel --prod` (or `vercel` for preview).
- Project: `marketer` (linked via `.vercel` in repo root).
- Set required secrets in Vercel/local: `DATABASE_URL`, `BLOB_READ_WRITE_TOKEN`, auth keys, Stripe, etc.

## Next Steps
- Wire persistence (Postgres/Prisma) and tenants/auth.
- Expand prompt registry and compliance rulepacks.
- Build dashboard flows (calendar, review/approval, revisions).
- Add CI, linting, tests, and monitoring hooks.

## Live
- Production (Next.js web shell): https://marketer-bignon-deguenons-projects.vercel.app
