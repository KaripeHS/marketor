# Copilot / AI agent instructions for Marketor

Quick reference to become productive in this monorepo. Follow these actionable, project-specific rules — reference files are quoted for examples.

1. Big picture
- Monorepo with two primary apps and shared packages:
  - `apps/api` — NestJS backend (feature modules under `apps/api/src/*`). See `apps/api/src/app.module.ts` for the list of feature modules and global guards/interceptors.
  - `apps/web` — Next.js (App Router) dashboard (`apps/web/app/*`, `apps/web/components/*`).
  - `packages/shared` — shared types/utilities (see `packages/shared/src/index.ts`).

2. How services interact (data flows)
- Backend (API) is the single source of truth: Prisma + Postgres (schema at `apps/api/prisma/schema.prisma`).
- Web calls API via `apps/web/services/api.ts` and uses `AuthContext` (`apps/web/contexts/AuthContext.tsx`) for session state.
- AI calls happen server-side in `apps/api` (OpenAI client dependency in `apps/api/package.json`).

3. Common patterns & conventions
- Feature modules: add a new feature under `apps/api/src/<feature>` and export a `<feature>.module.ts`; register it in `apps/api/src/app.module.ts`.
- Guards & decorators: routes are protected by global `AuthGuard` and `RolesGuard` (see `apps/api/src/auth/*`). Use `public.decorator.ts` to mark publicly-available endpoints.
- Validation: API uses Nest's `ValidationPipe` and `class-validator` DTOs. Keep DTOs strict and `whitelist: true` is enabled in `main.ts`.
- Prisma: use the Prisma module/service for DB access; don't access `@prisma/client` directly from web.
- Web UI: Next.js App Router files live in `apps/web/app`. Use `services/api.ts` for HTTP calls and `contexts/AuthContext.tsx` for auth flows.

4. Developer workflows (commands)
- Install deps (root workspace):
  - `npm install`
- Run local development:
  - API: `npm run api:dev` (root) — uses `ts-node-dev` and listens on `API_PORT` or `4000` (see `apps/api/src/main.ts`).
  - Web: `npm run web:dev` (root) — runs Next dev at `localhost:3000`.
- Build:
  - `npm run api:build` and `npm run web:build` from repo root (workspaces-aware scripts in `package.json`).
- Prisma (when changing schema):
  - `npm run prisma:generate --workspace apps/api`
  - `npm run prisma:push --workspace apps/api` (requires `DATABASE_URL`)

5. Environment / deployment notes
- Required envs (examples): `DATABASE_URL`, `BLOB_READ_WRITE_TOKEN`, OpenAI/AI keys, Stripe keys. Vercel deployment configured via `vercel.json`.
- API CORS allows `http://localhost:3000` by default (see `main.ts`).

6. Integration points to watch
- OpenAI / AI: `openai` appears in `apps/api` dependencies — prefer server-side calls in `apps/api/ai/*`.
- Media uploads use `multer` (`@types/multer` present) — check `apps/api/src/media` for upload handlers and token expectations.
- Audit & analytics: `AuditInterceptor` and `analytics` module run as cross-cutting concerns — avoid changing interceptor registration without coordination.

7. Code change guidance (examples)
- Add API endpoint: create `apps/api/src/<feature>/<feature>.controller.ts`, `<feature>.service.ts`, `<feature>.module.ts`; import the module in `app.module.ts`.
- Make DB change: update `prisma/schema.prisma` -> run `prisma:generate` and `prisma:push` -> update any DTOs that map to changed models.
- Add web route: add a new folder under `apps/web/app/<route>` with `page.tsx` following existing `dashboard` or `invite` patterns.

8. Things NOT to change lightly
- Root workspace scripts and `workspaces` layout — CI / Vercel rely on these.
- Global guards/interceptors registration (`APP_GUARD`, `APP_INTERCEPTOR`) — they enforce security/audit for all routes.

9. Where to look for more context
- High-level overview: `README.md` (top-level).
- API composition: `apps/api/src/app.module.ts`, `apps/api/src/main.ts`.
- Auth patterns: `apps/api/src/auth/*` (`auth.guard.ts`, `roles.guard.ts`, `public.decorator.ts`).
- Shared types: `packages/shared/src/index.ts`.
- Web patterns: `apps/web/app/*`, `apps/web/services/api.ts`, `apps/web/contexts/AuthContext.tsx`.

If any sections are unclear or you'd like more examples (e.g., a scaffolded feature or example endpoint), tell me which area and I'll expand with concrete code snippets. 
