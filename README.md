# PERSONAL OS

API-first personal operating system for one owner — the Founder of HOWL LAB. It centralizes work, time, finance,
relationships, communication, knowledge and memory in one Postgres source of truth, and exposes them through a
versioned REST API and an MCP tool layer, so AI agents can read authorized context and perform authorized, audited
actions. External services (Google Calendar, Gmail, Notion, GitHub, Resend) are replaceable adapters, not sources of truth.

**Stack:** Next.js 16 (App Router, Route Handlers) · TypeScript strict · Tailwind v4 · Supabase (Postgres, Auth, RLS) · Zod · Vercel · MCP.
**Shape:** modular monolith. No microservices, queues, or Redis until a concrete requirement appears.
**UI:** [DESIGN.md](DESIGN.md) is the source of truth for every visual decision (tokens, type scale, components).

## Status: MVP v0 (thin Phase 1 slice)

All ADRs blocking Phase 1 are accepted (ADR-001/002/006 on 2026-09-29). ADR-007, 009 and 014 are still Proposed
and only block Phases 3, 2 and 2. See [docs/decisions.md](docs/decisions.md) and [docs/phase-1-plan.md](docs/phase-1-plan.md).

## Run it

```bash
nvm use            # Node 20+ (see .nvmrc)
npm ci
npm run dev        # http://localhost:3000, demo mode with sample data, no setup needed
```

Checks (same as CI): `npm run typecheck && npm run lint && npm run build`. Schema: `npm run db:validate`
(needs a local PostgreSQL 15+, e.g. `PGHOST=/var/run/postgresql`).

### Two modes, picked automatically

| | Demo mode (default) | Supabase mode |
|---|---|---|
| Turns on when | any of the three vars below is missing, or `DEMO_MODE=1` | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` and `OWNER_EMAIL` are all set |
| Data | in-memory store seeded with realistic HOWL LAB data; resets when the server restarts (and per serverless instance on Vercel) | Postgres via the user's JWT, RLS enforced (`owner_all` + restrictive `no_oauth_client_tokens`) |
| Auth | none; a "Demo" badge sits in the global nav | owner-only magic link (`shouldCreateUser: false`, generic response), session refreshed in `src/proxy.ts` |
| API | `/api/v1/*` open (demo data only) | `/api/v1/*` requires the owner session; Origin check on cookie mutations |

Supabase setup: `supabase start` (or a hosted project), apply `supabase/migrations/`, create the owner user in
Auth, then put the three vars (plus `APP_URL`) in `.env.local`. Both implementations sit behind the same
repository interfaces (`src/modules/*/repository.ts`); they're chosen in `src/lib/session.ts`.

### What's in v0

- Domains in `src/modules/<domain>` (ADR-001, public API via `index.ts` only, enforced by ESLint):
  companies (read), projects, tasks (status, priority, due date, kind `task | follow_up | milestone`,
  human codes `HOWL-POS-01-T07` with re-coding + `previous_codes` on move, ADR-006), today, activity (backed by `audit_logs`).
- `/api/v1/projects` and `/api/v1/tasks`: list/create, get/patch/delete by id **or** code, Zod validation,
  `{ data, meta }` / `{ error: { code, message, details, request_id } }` envelopes, cursor pagination on tasks.
  `/api/v1/health` reports the mode.
- Pages: Overview (greeting, today's focus, counts, projects, recent activity), Today, Tasks (quick add, view chips,
  inline status), Projects and project detail. Light and dark mode, fade-and-rise motion that respects `prefers-reduced-motion`.
- Migration `supabase/migrations/20260929000000_mvp_v0_work.sql`: profiles, companies, projects, tasks, audit_logs; RLS on
  every table, immutable project codes, task-code trigger, append-only audit log. Validated in CI against Postgres 17.
- CI workflow (typecheck, lint, build, migration + RLS smoke test) in `ci/github-actions-ci.yml`. It's parked there
  because the pushing token lacks GitHub's `workflow` scope; move it to `.github/workflows/ci.yml` to switch it on.

### Not in v0 (next steps, in order)

1. Hosted Supabase project + generated DB types (`supabase gen types`); drop the hand-written row mapping.
2. API keys (`pk_live_…`) and the scope/permission layer, so `/api/v1` works for scripts and Cursor MCP (Phase 1.5a).
3. Idempotency keys, rate limits, request logging (pino) and Sentry.
4. People, notes, time blocks, CRM, finance, integrations, AI command center: later phases, see [docs/roadmap.md](docs/roadmap.md).
5. Playwright e2e in CI (screenshots were taken manually for this slice).

## Documents

| Doc | Contents |
|---|---|
| [SPEC.md](SPEC.md) | Master engineering spec v0.1 (input) |
| [docs/architecture.md](docs/architecture.md) | Layers, repo layout, module boundaries, request lifecycle, environments, env var spec |
| [docs/domain-model.md](docs/domain-model.md) | Bounded contexts, entities, identity & code rules, data classification |
| [docs/schema.md](docs/schema.md) | Table-by-table rationale, cuts/merges vs spec, RLS, soft delete |
| [supabase/proposal/0000_proposed_schema.sql](supabase/proposal/0000_proposed_schema.sql) | **PROPOSAL** full schema (validated, not applied) |
| [supabase/migrations/](supabase/migrations/) | Real migrations (MVP v0: work tables only) |
| [DESIGN.md](DESIGN.md) | UI design system (source of truth for the app's look) |
| [docs/erd.md](docs/erd.md) | Mermaid ERDs |
| [docs/api.md](docs/api.md) | `/api/v1` contract; Phase 1 endpoints in detail |
| [docs/security.md](docs/security.md) | Scopes, operation registry, confirmation flow, auth, RLS, tokens, API keys, audit, rate limits |
| [docs/integrations.md](docs/integrations.md) | Adapter architecture, OAuth, Google/Gmail/Notion/GitHub/Resend, webhooks |
| [docs/ai-tools.md](docs/ai-tools.md) | Tool registry, MCP, permissions, ai_actions, grounding |
| [docs/roadmap.md](docs/roadmap.md) | Phases 0–8 (+ 1.5 MCP slice) |
| [docs/phase-1-plan.md](docs/phase-1-plan.md) | Executable Phase 1 plan (`HOWL-POS-P1-Txx`), estimates, risks, Founder inputs |
| [docs/risks.md](docs/risks.md) | Technical risks and mitigations |
| [docs/decisions.md](docs/decisions.md) | ADRs to lock before coding, with open questions |
| [.env.example](.env.example) | Environment variables (no secrets) |

## Validation

```bash
# Schema: proposal + real migrations, each with a behavioural smoke test, on a scratch PostgreSQL 15+
PGHOST=/var/run/postgresql ./scripts/validate-schema.sh

# Diagrams: renders every mermaid block (needs @mermaid-js/mermaid-cli)
./scripts/validate-mermaid.sh
```

Owner: HOWL LAB · Founder: Howls · Technical Director: Ivan.
