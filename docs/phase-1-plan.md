# Phase 1 Plan — Core OS

Status: **ready to start once ADR-001/002/006 are locked** (decisions.md). Written 2026-09-29.
Task IDs `HOWL-POS-P1-Txx` = project `HOWL-POS-P1` in Personal OS itself (valid code per ADR-006; once T16 ships, these
tasks are imported and keep their IDs). Estimates are engineer-days (1 engineer + AI assistance), sizing not promises.

## 1. Goal and exit criteria
The Founder runs daily work from Personal OS; scripts act on it through `/api/v1` with scoped API keys; every write is
attributable. Phase 1 exits when **all** hold:
1. Founder signs in on production (single owner) and manages projects/tasks from `/`, `/projects`, `/tasks` for 5 working days.
2. A script with an API key lists/creates/completes tasks; a DELETE by that key returns `202` and only executes after
   the Founder confirms in `/approvals`.
3. `/settings/activity` answers "what did key X / the owner do today" from `audit_logs`.
4. CI green on `main`; RLS second-user tests pass; security checklist (§7) signed off; docs updated.

## 2. Scope
| In | Out (phase) |
|---|---|
| Repo scaffold, CI, env validation | Calendar, Google OAuth, token vault (2) |
| Supabase local + hosted (staging, prod), Phase 1 migration, generated types | Finance incl. ADR-012 small-expense rule (3) — only the generic `non_session_unless` mechanism ships now |
| Single-user auth (email OTP, owner allowlist, optional TOTP) | People API/UI, leads, Gmail, Resend (4) |
| **platform**: profile (`/me`), API keys, audit writer + activity, idempotency, approvals (ai_actions confirmation flow) | Notes, Notion, GitHub (5) |
| **work**: companies (minimal), projects, tasks, task dependencies | Relationships, memory, timeline UI (6) |
| `/api/v1` foundation: route wrapper, Zod, envelope, errors, cursor pagination, OpenAPI | MCP server → **Phase 1.5a Cursor / 1.5b ChatGPT OAuth** (ADR-017, §8); Command Center (7) |
| Dashboard v0 + `/projects`, `/tasks`, `/settings/{api-keys,activity}`, `/approvals` | Cron jobs, webhooks, reminders, purge (8) |
| Observability (pino, Sentry), Vercel deploy, Firewall rate limits | Realtime, file uploads, mobile, multi-user, `/trash` UI beyond tasks |

Phase 1 tables (split from `0000_proposed_schema.sql`): `profiles`, `companies`, `people` (table only, FK target),
`projects`, `tasks`, `task_dependencies`, `api_keys`, `ai_actions`, `audit_logs`, `idempotency_keys`.
Task `kind=follow_up` requires `company_id` in Phase 1 (no people API until Phase 4).

## 3. Tasks
Rule: one task ≈ one PR (≤ ~400 lines diff), tests + docs in the same PR, CI green before merge. `Dep` = must merge first.

| ID | Title | Est (d) | Dep |
|---|---|---|---|
| HOWL-POS-P1-T01 | Repo scaffold | 0.5 | ADR-001 |
| HOWL-POS-P1-T02 | CI base | 0.5 | T01 |
| HOWL-POS-P1-T03 | Env & config | 0.5 | T01 |
| HOWL-POS-P1-T04 | Supabase local + Phase 1 migration | 1.5 | T01, ADR-002, ADR-006 |
| HOWL-POS-P1-T05 | DB/RLS tests + CI migration job | 1 | T02, T04 |
| HOWL-POS-P1-T06 | Supabase clients + generated types | 0.5 | T04, T05 |
| HOWL-POS-P1-T07 | Single-user auth | 1 | T03, T06 |
| HOWL-POS-P1-T08 | Deploy walking skeleton (Vercel + hosted Supabase) | 1 | T07, Founder inputs §6 |
| HOWL-POS-P1-T09 | HTTP foundation (route wrapper, Zod, errors) | 1 | T06 |
| HOWL-POS-P1-T10 | Observability | 0.5 | T09 |
| HOWL-POS-P1-T11 | Permission layer (operation registry) | 1 | T09 |
| HOWL-POS-P1-T12 | Audit writer + redaction | 1 | T11 |
| HOWL-POS-P1-T13 | Idempotency | 0.5 | T09 |
| HOWL-POS-P1-T14 | API keys | 1.5 | T07, T11, T12 |
| HOWL-POS-P1-T15 | Companies + projects module | 1 | T11, T12 |
| HOWL-POS-P1-T16 | Tasks module | 2 | T15 |
| HOWL-POS-P1-T17 | Task dependencies | 1 | T16 |
| HOWL-POS-P1-T18 | Approvals (confirmation flow) | 1.5 | T13, T14, T16 |
| HOWL-POS-P1-T19 | Activity feed | 0.5 | T07, T12 |
| HOWL-POS-P1-T20 | UI: dashboard v0, projects, tasks | 2.5 | T07, T16, T17 |
| HOWL-POS-P1-T21 | OpenAPI | 0.5 | T16 |
| HOWL-POS-P1-T22 | Phase 1 review, hardening, demo | 1 | all |
| | **Total** | **22** | + 15 % contingency ≈ **25 d (~5 weeks)** |

Critical path: T01 → T04 → T05 → T06 → T09 → T11 → T12 → T15 → T16 → T17 → T20 → T22 (14 d).
Milestones (sequential days): **M1** walking skeleton live, login on prod (T08) ≈ day 7 · **M2** API usable by scripts
(T16) ≈ day 15 · **M3** Founder daily use (T20) ≈ day 21 · **M4** exit (T22) ≈ day 22 (+ contingency).
If time slips, cut in this order: T21 (OpenAPI → Phase 1.5), dashboard panels beyond TODAY, MFA toggle.

### Task details

**T01 Repo scaffold.** Deliverable: Next.js (latest stable, App Router, `src/`), TypeScript `strict` +
`noUncheckedIndexedAccess`, Tailwind, shadcn/ui init (button, input, dialog, table, badge, toast), pnpm, ESLint flat config
with `eslint-plugin-boundaries` (modules import each other only via `index.ts`; `src/ai`, `src/app` cannot import
repositories/Supabase; secret client only from `src/lib/supabase/admin.ts`), Prettier, Vitest, folder skeleton
`src/{app,modules/{work,platform},lib,components}` per architecture.md §3, Node version pinned (`.nvmrc`, `engines`).
Move `supabase/migrations/0000_proposed_schema.sql` → `supabase/proposal/` (the CLI would otherwise apply it) and repoint
`scripts/validate-schema.sh` (**done in MVP v0**, which also delivered a thin slice of T01–T16; see README). Accept: `pnpm dev` renders a placeholder; `pnpm typecheck lint test` pass; a deliberate
cross-module deep import fails lint.

**T02 CI base.** Deliverable: GitHub Actions on PR + `main`: install (cached), `typecheck`, `lint`, `test` (unit),
`format:check`, `pnpm audit --prod` (high+), gitleaks secret scan, concurrency cancel. Accept: all jobs required
checks on `main`; a PR with a fake `pk_live_…`-shaped secret fails.

**T03 Env & config.** Deliverable: `src/lib/env.ts` (Zod; `serverEnv` with `server-only`, `clientEnv` with
`NEXT_PUBLIC_*` only); test that every key in `.env.example` is in the schema and vice versa. Accept: boot fails with a
readable error on missing/invalid vars; no secret in `clientEnv`.

**T04 Supabase local + Phase 1 migration.** Deliverable: `supabase init`; `config.toml` (sign-ups disabled, email OTP,
OTP expiry 10 min, site/redirect URLs); `supabase/migrations/<ts>_platform_and_work.sql` = the Phase 1 subset of the
proposal (tables in §2, enums they use, triggers: updated_at, task code, code immutability, dependency cycle, audit
append-only; RLS + grants incl. the RESTRICTIVE `no_oauth_client_tokens` policy; `api_keys.kind` column (only `api_key`
used until 1.5b); `private` schema); `seed.sql` (dev only: sample projects/tasks for a local owner).
Accept: `supabase db reset` applies cleanly from zero; no Phase 2+ objects present; schema diff vs proposal limited to the
Phase 1 subset.

**T05 DB/RLS tests + CI migration job.** Deliverable: pgTAP tests in `supabase/tests` porting the Phase 1 parts of
`supabase/validation/01_smoke_test.sql` (code assignment/move aliasing, immutability, cycle rejection,
done⇔completed_at, `api_keys.secret_hash` unreadable, audit append-only, **second user sees 0 rows on every Phase 1
table and cannot insert with a foreign `user_id`**, a JWT with a `client_id` claim sees nothing, `anon` denied). CI job: `supabase start` → `db reset` → `supabase test db`
→ `supabase db lint` → guard that files already on `main` under `supabase/migrations` are unchanged (append-only migrations).
Accept: job green; each RLS test fails if its policy is dropped (verified once locally).

**T06 Supabase clients + generated types.** Deliverable: `src/lib/supabase/{server.ts (user JWT via @supabase/ssr),
admin.ts (secret key, server-only), database.types.ts}`; `pnpm db:types`; CI step regenerates types and fails on diff.
Repository base helper `ownerScoped(ctx)` that always applies `.eq('user_id', ctx.userId)` for the admin client (ADR-003).
Accept: drift check fails when a column is added without regenerating; unit test proves helper adds the filter.

**T07 Single-user auth.** Deliverable: `(auth)/login` (email → OTP code), `signInWithOtp({ shouldCreateUser: false })`,
callback, sign-out, session refresh in middleware/proxy, `requireOwner()` (server `getUser()` + email == `OWNER_EMAIL`,
else sign out + 403), protected `(dashboard)` layout, `scripts/create-owner.ts` (one-time owner creation with the secret
key), optional TOTP enrollment page + AAL2 required for `/settings/api-keys` and `/approvals` when enrolled.
Accept: owner can log in locally (Mailpit) and on staging; non-owner email gets no OTP/403; no sign-up path exists;
Playwright smoke: login → dashboard.

**T08 Deploy walking skeleton.** Deliverable: Vercel project linked to GitHub (prod = `main`, previews = PRs), region
`sin1`; Supabase **staging** (previews) and **prod** projects in Singapore; env vars per environment (§6); GitHub
Actions workflow `db-deploy` running `supabase db push` to staging on `main`, to prod behind a manual-approval
environment; owner created in prod; Supabase auth URLs set; custom SMTP if provided; backups verified (PITR if plan allows).
Accept: Founder logs in on the prod URL; preview deploy hits staging DB; no secret in repo or build logs.

**T09 HTTP foundation.** Deliverable: `src/lib/http/handler.ts` wrapper: request id, auth → `RequestContext`
(session or `Bearer pk_…`), `Origin` check for cookie mutations, Zod parse of params/query/body (`.strict()`), error
mapping (PG `23505`→409, `23514`/`P0001`→409/422, `42501`→403 + alert), `{data, meta}` / `{error}` envelope, cursor
encode/decode, `/api/v1/health`, `GET/PATCH /api/v1/me`. Accept: route-level tests for 400/401/403/404/409/422/500
shapes; stack traces/SQL never in responses.

**T10 Observability.** Deliverable: pino JSON logger with redaction paths (authorization, cookie, `*.token`,
`*.secret`), request log line per call (id, route, actor type, status, latency), Sentry (server + client) with
`beforeSend` scrubbing. Accept: redaction unit test; a thrown test error appears in Sentry staging without headers/body.

**T11 Permission layer.** Deliverable: `src/lib/permissions`: scope const union, `defineOperation`
(`category`, `scopes`, `confirmation: 'never' | 'non_session' | 'always' | { mode: 'non_session_unless', rule, when }`,
`audit`, `classificationAware`, `summarize`), `authorize(ctx, opId, input)` returning `allow | deny | confirm`,
classification filter helper. Accept: unit tests for every category × actor; test that every exported service
function is registered; `non_session_unless` predicate path tested with a fixture op (the finance rule lands in Phase 3).

**T12 Audit writer.** Deliverable: `audit.record(ctx, {...})` with per-operation `auditFields` allow-list + global deny
regex; failure logs + Sentry alert without failing the user request (R-07). Accept: tests prove tokens/secrets/bodies
never persist; every WRITE/DELETE/EXECUTE and every denial writes exactly one row.

**T13 Idempotency.** Deliverable: `Idempotency-Key` support in the wrapper backed by `idempotency_keys` (24 h, request
hash, stored response). Accept: replay returns stored response; same key + different body → 409; concurrent duplicate
→ one execution.

**T14 API keys.** Deliverable: `platform` module: generate (`pk_{live|test}_` + 32 random bytes), sha256 lookup,
revoke, rotate (24 h overlap), expiry (default 90 d), `last_used_at` ≤ 1/min, sensitive-scope re-auth rule; `/api/v1/api-keys`
(session only); `/settings/api-keys` UI (secret shown once). Accept: tests for expired/revoked/wrong-scope/test-key-in-prod;
keys can never hold `api_keys.manage`/`integrations.manage`; audit rows for create/revoke/rotate.

**T15 Companies + projects module.** Deliverable: `work` module (domain, repository, service, schemas, operations) for
companies (minimal CRUD) and projects (code rules, CRUD, archive/unarchive, soft delete with open-task guard);
`/api/v1/companies`, `/api/v1/projects` per api.md §2. Accept: service + route tests incl. code taken (incl. deleted) → 409,
code immutable, second-user repository test returns nothing via admin client path.

**T16 Tasks module.** Deliverable: state machine, UUID/code/`previous_codes` lookup, CRUD, move (re-code), complete
(idempotent)/reopen, filters + sorts + cursor, soft delete, `/api/v1/tasks` per api.md §2; multi-row ops as RPC where needed.
Accept: tests for each transition (valid/invalid → 409), move keeps old code resolvable, filters, second-user test.

**T17 Task dependencies.** Deliverable: add/remove endpoints, cycle → 409 (DB trigger surfaced), `is_blocked` derivation
in reads. Accept: tests for self-dependency, cycle of 3, unblocking on completion.

**T18 Approvals.** Deliverable: `ai_actions` pending flow in `authorize()` → `202 confirmation_required`
(normalized args + `input_hash`, 15-min expiry); session-only `/api/v1/approvals` list/confirm/reject (conditional
status update, executes stored args once, re-checks hash/expiry); session `X-Confirm` → else 428; `/approvals` UI.
Accept: an API key DELETE of a task returns 202, task untouched until confirm; confirm executes once (double-click safe);
expired → 410; key cannot call confirm; all transitions audited.

**T19 Activity feed.** Deliverable: `/api/v1/activity` (filters per api.md) + `/settings/activity` page. Accept:
"what did key X do today" (owner timezone) returns correct rows; inputs shown redacted.

**T20 UI: dashboard v0, projects, tasks.** Deliverable: `/` Command Center (TODAY: overdue/due today/in progress/blocked;
PROJECTS: active + at-risk; recent activity) from a `dashboard.today` service; `/projects` list/detail; `/tasks`
list with filters, quick-add, inline status change, complete, dependency display; Server Components + Server Actions
calling services (no direct Supabase in components); keyboard quick-add. Accept: Playwright smoke login → create
project → create task → complete; Lighthouse a11y ≥ 90 on `/tasks`; works on mobile width.

**T21 OpenAPI.** Deliverable: Zod → `/api/v1/openapi.json` (zod-openapi), linked from api.md; CI check that every
v1 route is documented. Accept: spec validates; example script (`scripts/examples/tasks.ts`) runs against staging with a test key.

**T22 Phase 1 review.** Deliverable: security checklist (§7) run on prod, RLS second-user test on staging, Firewall
rate-limit rules configured, runbook (`docs/runbook.md`: owner login recovery, key revocation, restore from backup),
docs updated (README status, roadmap, api.md), Founder demo, import this plan's tasks as `HOWL-POS-P1-*` rows.
Accept: exit criteria §1 met and signed off by the Founder.

## 4. Definition of done
Per task: code + tests merged via PR with CI green (typecheck, lint, unit, DB/RLS tests, migration + type-drift checks);
new service operations registered with scopes/category/audit; no secrets committed (gitleaks); docs touched where the
contract changed; acceptance criteria demonstrated in the PR description.
Phase: §1 exit criteria met on production; audit + permission behaviour verified for every Phase 1 operation (spec §35);
migrations applied to staging and prod from CI; roadmap/decisions/README updated; Founder demo done.

## 5. Risks (Phase 1)
| Risk | Mitigation |
|---|---|
| ADR-001/002/006 still pending → blocks T01/T04 or causes rework | Plan uses the proposed options; changes are cheap until T04 merges. Ask Founder first. |
| Effort (25 d) exceeds roadmap's original 2–3 weeks; daily use slips (R-01) | Walking skeleton by ~day 7, daily-use milestone M3, explicit cut list (§3). Roadmap updated to 4–5 wks. |
| Admin-client path misses `user_id` filter (R-06) | `ownerScoped` helper + second-user test per repository + lint on admin import. |
| No transactions in supabase-js (R-07) | Invariants in triggers/RPC; audit failure alerting; ADR-003 revisit trigger. |
| Owner lockout (OTP email not delivered, Supabase default mailer rate limits) | Custom SMTP; runbook with dashboard break-glass; test login on prod in T08. |
| Supabase Free pauses inactive projects / no backups | Prod on Pro (PITR optional); staging may stay Free. |
| Next.js / @supabase/ssr breaking changes (middleware→proxy naming, cookie APIs) | Pin versions at T01; follow official Supabase SSR guide for that version. |
| Public repo leaks secrets | gitleaks in CI, GitHub push protection + custom `pk_live_` pattern, `.env*` git-ignored, env only in Vercel/GitHub secrets. |

## 6. What the Founder must supply
Before T01/T04:
- **Decisions:** ADR-001 (vertical modules), ADR-002 (does Ivan need his own login? default: no, API keys), ADR-006
  (re-code on move? code pattern free-form vs `HOWL-XXX-NN`).
- **`OWNER_EMAIL`**: the sign-in address (set only in env, never committed).

Before T08 (≈ day 5):
- **Supabase**: an org with two projects in `ap-southeast-1` (Singapore): `personal-os-prod` (Pro plan recommended:
  no pausing, daily backups; PITR optional add-on) and `personal-os-staging` (Free OK); Ivan invited as developer.
  From each: project ref, URL, publishable key, secret key, DB password — entered by the Founder directly into Vercel /
  GitHub secrets (not sent in chat or committed). A Supabase personal access token for CI migrations.
- **Vercel**: account/team (Pro recommended — Hobby is non-commercial only), GitHub repo connected, Ivan invited.
- **Domain** (optional): e.g. `os.<your-domain>` + DNS access; otherwise the `*.vercel.app` URL.
- **Auth email** (recommended): custom SMTP for Supabase Auth (e.g. Resend with a verified sending domain).
- **Sentry** (optional): org + project DSNs.
- **GitHub repo settings** (PNCTriet is admin): branch protection on `main` with required checks, secret scanning +
  push protection, custom pattern `pk_live_[A-Za-z0-9_-]{43}`.

Secrets per environment (Vercel: Production = prod, Preview = staging; local `.env.local`):
`APP_ENV`, `APP_URL`, `OWNER_EMAIL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`,
`SUPABASE_SECRET_KEY`, `API_KEY_PREFIX_ENV` (`live` in prod), `LOG_LEVEL`, `SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN`.
GitHub Actions secrets: `SUPABASE_ACCESS_TOKEN`, `SUPABASE_PROJECT_REF_STAGING`, `SUPABASE_PROJECT_REF_PROD`,
`SUPABASE_DB_PASSWORD_STAGING`, `SUPABASE_DB_PASSWORD_PROD`. Nothing Google/Notion/GitHub-token/AI is needed in Phase 1.

For Phase 1.5 (not in the total): **Cursor** installed (1.5a); a **ChatGPT** plan with developer mode — Plus, Pro,
Business, Enterprise or Edu, web — (1.5b); OK to enable Supabase Auth's OAuth 2.1 server + dynamic client registration
on staging/prod (dashboard toggle, done by Ivan if he has project access).

## 7. Security checklist (T22)
Sign-ups disabled; non-owner rejected server-side; MFA enrolled (recommended) · secret key imported only in `admin.ts`
· every table RLS-on, second-user tests green · `anon` has no grants · API key secrets hashed, shown once, prod rejects
`pk_test_` · confirmation flow: key cannot confirm, stored args executed once · audit append-only, no secrets in rows or
logs · `Origin` check on cookie mutations · Firewall rate limits active · no `NEXT_PUBLIC_` secret · backups verified.

## 8. Next: Phase 1.5 MCP slice (ADR-017) — Cursor, then ChatGPT
Not in the Phase 1 total. One endpoint `/api/mcp` (Streamable HTTP, stateless, official TS SDK) and one tool registry
serve both clients; only the credential differs (ai-tools.md §8). Tools: `get_today` (tasks), `get_tasks`,
`create_task`, `update_task`, `complete_task`, `get_action_status`.

**1.5a — Cursor (API key) · 3 d**
| ID | Title | Est (d) | Dep | Acceptance |
|---|---|---|---|---|
| HOWL-POS-P1.5-T01 | MCP endpoint + API-key auth | 1 | Phase 1 | `initialize`/`tools/list`/`tools/call` over stateless POST; missing/invalid key → 401 with `WWW-Authenticate: Bearer`; `Origin` checked; Firewall rule on `/api/mcp` |
| HOWL-POS-P1.5-T02 | Tool registry + 6 task tools + ai_actions | 1.5 | T01 | every call → one `ai_actions` row (`client='cursor-mcp'`); writes audited; scope denial → tool error + audit `denied`; lint: `src/ai` imports services only |
| HOWL-POS-P1.5-T03 | Cursor hookup + e2e | 0.5 | T02 | `~/.cursor/mcp.json` with `${env:PERSONAL_OS_MCP_KEY}` documented; SDK-client e2e test in CI; Founder completes a task from Cursor on prod |

**1.5b — ChatGPT (minimal OAuth 2.1 via Supabase Auth) · 4.5 d** — pulled forward from Phase 7 because ChatGPT is
the second client and accepts only OAuth; Supabase provides the authorization server, so we build only the edges.
| ID | Title | Est (d) | Dep | Acceptance |
|---|---|---|---|---|
| HOWL-POS-P1.5-T04 | Spike + go/no-go | 0.5 | T03 | on staging: OAuth server + DCR enabled; AS metadata has `S256` + `registration_endpoint`; token has `client_id`; `aud` settable via Custom Access Token Hook (or documented fallback); ChatGPT dev-mode connector completes linking against a stub. No-go → fallback decision (self-hosted AS +3–4 d, or ChatGPT to Phase 7) |
| HOWL-POS-P1.5-T05 | Protected-resource metadata + auth challenges | 0.5 | T04 | `/.well-known/oauth-protected-resource` (+ `/api/mcp` path variant) lists the Supabase issuer; 401 carries `resource_metadata`; tools declare `securitySchemes`; auth errors carry `_meta["mcp/www_authenticate"]` |
| HOWL-POS-P1.5-T06 | Consent page + OAuth grants | 1 | T05 | `/oauth/consent`: owner login required, shows client, scope allow-list (default `tasks.read tasks.write projects.read`), approve → `api_keys(kind=oauth_grant)` + audit; deny works; non-owner cannot consent |
| HOWL-POS-P1.5-T07 | JWT verifier in the MCP auth resolver | 1 | T06 | JWKS signature, `iss` = `MCP_OAUTH_ISSUER`, `exp`, `client_id` → active grant, `sub` = owner (+ `aud` if hook); revoked/unknown grant → 401; session cookies and plain Supabase session JWTs rejected at `/api/mcp`; unit tests per failure |
| HOWL-POS-P1.5-T08 | Connections UI + hardening | 0.5 | T07 | Settings → Connections list/revoke; pgTAP proves an OAuth token reads/writes nothing via the Data API; Cursor with key still connects (no OAuth prompt) |
| HOWL-POS-P1.5-T09 | ChatGPT e2e on prod + docs | 1 | T08 | Founder links ChatGPT, lists/creates/completes a task; `ai_actions.client='chatgpt-mcp'`; a DELETE-less tool set; security checklist for the public endpoint signed off |

Total Phase 1.5: **7.5 d + 15 % ≈ 8.5 d (~2 weeks)**; worst case with fallback AS ≈ 12 d.
