# Roadmap

Project code for Personal OS itself: **`HOWL-POS-01`** (dogfooding the identity rules; task codes `HOWL-POS-01-Txx`).
Each phase ends with: migrations applied, tests green, docs updated, audit/permission behavior verified (spec §35),
Founder demo. Estimates assume 1 engineer + AI assistance; they are sizing, not promises.

| Phase | Goal | Exit criteria | Size |
|---|---|---|---|
| **0 Architecture** | This doc set | Founder approves ADRs in decisions.md | ADR-003/012/013/015/017 accepted 2026-09-29; 001/002/006/007/009/014 pending |
| **1 Core OS** | Auth, profile, projects, tasks, deps, audit, API keys, approvals, basic dashboard, `/api/v1` foundation | Founder runs work from `/tasks` daily; a script with an API key creates/completes tasks; activity shows who did what | 2–3 wks |
| **1.5 MCP slice** (ADR-017) | `/api/mcp` Streamable HTTP, API-key auth, task tools + `get_action_status`, ai_actions logging | Claude (Code) creates/completes tasks via MCP; every call in ai_actions; a DELETE-less tool set; confirmation path demoed | 3–4 days |
| **2 Calendar** | Calendar domain, Google OAuth + token vault, Calendar adapter, sync, task → time block | Scheduling a task creates a Google event; Google edits appear in OS; weekly reconnect flow works (Testing-mode 7-day refresh tokens, ADR-013) + expiry banner | 2 wks |
| **3 Finance** | Accounts, transactions, transfers, debts/receivables, goals, summary, spendable | Month-end balances match bank to the đồng; all calcs unit-tested; AI expense < 50,000 VND auto-recorded (audited, undoable), ≥ 50,000 gated (ADR-012) | 2 wks |
| **4 Communication** | People, companies, leads, Gmail (search/read/draft/send), Resend, campaigns/sequences, email events webhook | Send a 3-step cold sequence to 5 test leads with suppression + audit; Gmail send needs confirmation from API key | 3 wks |
| **5 Knowledge** | Notes + FTS, Notion adapter, GitHub adapter, external references UI | Link Notion page + GitHub issue to a task and see live metadata | 1–2 wks |
| **6 Relationships** | Relationships, interactions, important dates, memory model, relationship context, timeline | "Who should I follow up with?" answerable from data via service | 2 wks |
| **7 AI** | Remaining tools, MCP OAuth 2.1 (ChatGPT, Claude.ai connectors), AI Command Center, confirmation UX, grounding tests | Claude and ChatGPT via MCP run spec §18 tools under scopes; every call in ai_actions | 2 wks |
| **8 Automation** | Vercel Cron jobs, webhook-driven processing, reminders, sequences scheduler, purge/retention | Reminders fire for due tasks/important dates; sequences send on schedule; all jobs audited | 2 wks |

Order note: **accepted (ADR-017, 2026-09-29)** — a thin MCP slice (task tools only) runs as Phase 1.5 right after
Phase 1; first client Claude (tentative). Phase 7 shrinks accordingly.

## Phase 1 breakdown (`HOWL-POS-01`)

Rule: each task is one PR, ≤ ~400 lines diff, with tests and docs. `Dep` = must merge first.

| Code | Task | Output / acceptance | Dep |
|---|---|---|---|
| T01 | Repo scaffold | Next.js App Router + TS strict + Tailwind + shadcn init, `src/` layout per architecture.md, ESLint (boundaries rules), Prettier, Vitest, `pnpm` scripts | – |
| T02 | CI | GitHub Actions: typecheck, lint, unit tests, `supabase db` migrations on local stack, type-gen drift check | T01 |
| T03 | Env & config | `src/lib/env.ts` Zod-validated server/client env, `.env.example` in sync (test) | T01 |
| T04 | Supabase local + Phase 1 migration | Split proposal → `platform_and_work` migration (profiles, companies, people, projects, tasks, task_dependencies, api_keys, ai_actions, audit_logs, idempotency_keys) + RLS; SQL smoke tests ported to `supabase/tests` | T01 |
| T05 | Supabase clients + generated types | `server.ts` (user JWT), `admin.ts` (secret key, `server-only`), `database.types.ts` generated | T04 |
| T06 | Auth | Email OTP login, owner allowlist, middleware session refresh, `(auth)` pages, sign-out; MFA optional toggle | T05 |
| T07 | HTTP foundation | Route handler wrapper: request id, auth → `RequestContext`, Zod parse, error mapping (PG codes), envelope, cursor helpers, `Origin` check | T05 |
| T08 | Permission layer | Scope union, `defineOperation`, `authorize()`, classification filter helper; unit tests incl. "every service op registered" | T07 |
| T09 | Audit writer | `audit.record()` with redaction allow/deny lists; tests prove tokens never persisted | T08 |
| T10 | API keys | Generate/hash/lookup/revoke/rotate, `/api/v1/api-keys`, settings UI, last_used throttle; tests for expired/revoked/scope | T08, T09 |
| T11 | Projects module | domain (code rules), repository, service, `/api/v1/projects` CRUD + archive; tests | T08, T09 |
| T12 | Tasks module | state machine, code lookup (UUID/code/previous_codes), CRUD, complete/reopen, filters, `/api/v1/tasks`; tests | T11 |
| T13 | Task dependencies | add/remove, cycle → 409, `is_blocked` derivation; tests | T12 |
| T14 | Idempotency | `Idempotency-Key` middleware backed by `idempotency_keys`; tests for replay/conflict | T07 |
| T15 | Approvals (confirmation) | ai_actions pending flow, `/approvals` endpoints + UI list; tested with an API key doing a DELETE | T10, T12 |
| T16 | Activity | `/api/v1/activity` + `/settings/activity` page ("what did X do today") | T09 |
| T17 | Dashboard v0 | `/` Command Center: TODAY, PRIORITIES, PROJECTS panels from `/dashboard/today` service; `/projects`, `/tasks` minimal pages | T12, T13 |
| T18 | Observability | pino structured logs with redaction, Sentry, request logging | T07 |
| T19 | OpenAPI | Zod → `/api/v1/openapi.json`; api.md links to it | T12 |
| T20 | Deploy | Vercel prod + preview, staging Supabase, prod Supabase, secrets set per env, Firewall rate-limit rules, backups (PITR if plan allows) | T06, T18 |
| T21 | Phase 1 review | Security checklist (security.md), RLS second-user test, docs updated, demo | all |

Critical path: T01 → T04 → T05 → T07 → T08 → T11 → T12 → T17 → T20.

## Explicitly not in Phase 1
Calendar, finance, people UI, integrations, MCP (Phase 1.5 slice, ADR-017), background jobs, realtime, file uploads, mobile.
