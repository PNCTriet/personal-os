# Architecture Decisions (lock before coding)

Format: **Status** · **Decision** · Why · Trade-off · **Open question for Founder**.
★ = needs Founder approval before Phase 1 starts (the rest can be accepted by Technical Director).

## Status log
| Date | ADRs | Status |
|---|---|---|
| 2026-09-29 | ADR-003, ADR-012, ADR-013, ADR-015, ADR-017 | **Accepted** by Founder (details below) |
| 2026-09-29 | ADR-017 amended: first client Cursor, then ChatGPT, Claude later (Founder); minimal OAuth pulled into Phase 1.5b (Technical Director) | **Accepted** |
| 2026-09-29 | ADR-004, 005, 008, 010, 011, 016, 018, 019, 020, 021 | **Accepted** by Technical Director (Ivan), as proposed |
| — | ADR-001, ADR-002, ADR-006, ADR-007, ADR-009, ADR-014 (★) | *Proposed*, awaiting Founder |

Phase 1 plan (docs/phase-1-plan.md) assumes the *proposed* option of every pending ADR. ADR-001 must be locked before
`HOWL-POS-P1-T01` (scaffold), ADR-002 and ADR-006 before `HOWL-POS-P1-T04` (first migration).
ADR-007/009/014 only block Phases 3/2/2 respectively.

### ADR-001 Modular monolith with vertical modules ★
**Status:** *Proposed* — awaiting Founder.
**Decision:** One Next.js app; `src/modules/<domain>/{service,domain,repository,schemas,operations}.ts`; boundaries lint-enforced; no Edge Functions.
Why: spec §3/§15; keeps each domain in one place. Trade-off: deviates from spec §5's layer-first folders.
**Q:** OK to use vertical modules instead of root `services/` + `repositories/`?

### ADR-002 Single owner, multi-user-ready rows ★
**Status:** *Proposed* — awaiting Founder.
**Decision:** `user_id` on every row + RLS; sign-in restricted to `OWNER_EMAIL`; no sign-up, no teams. Ivan's automation = API keys.
Why: near-zero cost now, avoids a rewrite later. Trade-off: Ivan is not a separate *user* with his own login in v1.
**Q:** Does Ivan need his own login (read-only?) in v1, or are named API keys enough?

### ADR-003 Data access: supabase-js + generated types + SQL functions, no ORM ★
**Status:** **Accepted** 2026-09-29 (Founder).
**Decision:** Repositories use supabase-js typed with generated `Database` types (`supabase gen types typescript`, checked
in, CI drift check). Two clients: user-JWT client for session requests (RLS enforced); secret-key client for
API-key/AI/webhook requests, used only through the repository base helper that always adds `.eq('user_id', ctx.userId)`.
Multi-row atomic ops = Postgres functions via RPC. No ORM, no query builder.
Why: stays in the declared stack; RLS native for the session path; HTTP-based client suits serverless (no pool exhaustion).
Trade-off: no ad-hoc transactions; logic split between TS and a few SQL functions.
**Consequences:**
- Every multi-row invariant (task code assignment, transfers, dependency add with cycle check, confirmation claim) is a
  trigger or RPC function, tested in `supabase/tests`. An RPC registry comment in the migration lists them.
- Audit is written after the mutation (not in the same transaction) — R-07 mitigation stays: failures logged + alerted.
- Revisit trigger: > ~10 RPC functions, or a feature that needs an interactive multi-statement transaction →
  new ADR for Kysely over a Supavisor transaction-mode connection. Not before.

### ADR-004 SQL-first migrations (Supabase CLI), phase-scoped
**Status:** **Accepted** 2026-09-29 (Technical Director), as proposed.
**Decision:** Hand-written SQL migrations in `supabase/migrations`, generated TS types checked in CI. `0000_proposed_schema.sql` is split per phase after approval.
Why: DB-level integrity (triggers, RLS, partial indexes) is first-class in SQL. Trade-off: no schema-in-TS DX.

### ADR-005 API style: snake_case, envelope, cursor pagination
**Status:** **Accepted** 2026-09-29 (Technical Director), as proposed.
**Decision:** `{data, meta}` / `{error}`; snake_case end-to-end; cursor pagination; `Idempotency-Key` on money/EXECUTE writes; OpenAPI from Zod.
Why: no mapping layer; stable for external consumers. Trade-off: snake_case in TS code (acceptable; types are generated).

### ADR-006 Identity: UUID + human codes ★
**Status:** *Proposed* — awaiting Founder.
**Decision:** UUID v4 PKs. Codes only for projects (owner-chosen, immutable, never reused) and tasks (`{project}-T{NN}`, DB-assigned). Moving a task assigns a new code; old code kept in `previous_codes` and still resolves.
Why: spec §7; codes are handles, not identity. Trade-off: task codes can change on move.
**Q:** On move, re-code (recommended, Jira-like) or keep the original code forever? Is `HOWL-XXX-NN` the required project pattern or free-form uppercase segments?

### ADR-007 Money model ★
**Status:** *Proposed* — awaiting Founder.
**Decision:** `bigint` minor units + ISO currency per account; signed amounts; balances/outstanding/progress are views; no FX conversion in v1 (summaries per currency); base currency VND.
Why: spec §6 deterministic finance. Trade-off: no single "net worth" across currencies until FX rates are modeled.
**Q:** Which currencies do you actually hold (VND only? USD/EUR too)? Is per-currency reporting acceptable for v1?

### ADR-008 Archive vs soft delete
**Status:** **Accepted** 2026-09-29 (Technical Director), as proposed.
**Decision:** `archived_at` = done/hidden, `deleted_at` = trash (30 days), hard purge only by explicit job; audit never purged.
Trade-off: every query must filter `deleted_at IS NULL` (repository helper).

### ADR-009 Integration token storage: app-level AES-256-GCM ★
**Status:** *Proposed* — awaiting Founder.
**Decision:** Tokens encrypted in the app with `TOKEN_ENCRYPTION_KEY` (per env), stored in `integration_secrets` (service-role only).
Why: DB dump alone is useless; portable (works in local/scratch Postgres and tests). Alternative: Supabase Vault (key managed by Supabase, less code, but key and data live with the same vendor/project and it's harder to test locally).
**Q:** Accept app-level encryption over Supabase Vault?

### ADR-010 `external_references` is the only core→external link
**Status:** **Accepted** 2026-09-29 (Technical Director), as proposed.
**Decision:** No `notion_page_id`/`google_event_id` columns; convenience fields computed in API responses.
Why/Trade-off: see integrations.md §2 (flexibility vs no FK).

### ADR-011 Audit model
**Status:** **Accepted** 2026-09-29 (Technical Director), as proposed.
**Decision:** `audit_logs` append-only for all actors; `ai_actions` for every agent invocation + confirmation state; written by the app (not DB triggers) so actor/source/intent are captured.
Trade-off: an audit write can fail after a successful mutation (logged/alerted; R-07).

### ADR-012 Server-side confirmation flow ★
**Status:** **Accepted** 2026-09-29 (Founder), with a 50,000 VND auto-record threshold for AI-logged expenses.
**Decision:** Non-session actors get `202 confirmation_required`; the owner approves in the web UI; the server executes
the stored, hashed args; 15-min expiry. Confirmation-gated: EXECUTE (email send, external writes with attendees),
DELETE, finance writes, SENSITIVE writes — **with one exception:**

**Small-expense exception (AI-logged expenses < 50,000 VND).** `finance.transactions.create` by a non-session actor
(`ai` or `api_key`) is recorded **without** confirmation iff **all** hold:
1. `kind = 'expense'` (single negative amount; not a transfer, not income, not linked to a debt, not a split);
2. `currency = 'VND'` and `abs(amount_minor) < 50000` — strictly below; exactly 50,000 VND needs confirmation;
3. the target account already exists and is not archived; no account/category creation as a side effect;
4. the request carries an `Idempotency-Key` (required for all finance writes anyway).
Anything else — ≥ 50,000 VND, any non-VND currency (no FX in v1, so no threshold is defined for them), income,
transfers, debt links, **every update and delete** of a transaction — keeps confirmation.
Auto-recorded expenses are still fully traceable and reversible:
- one `ai_actions` row (`status=succeeded`, `requires_confirmation=false`, `auto_approval_rule='finance.small_expense_vnd_lt_50000'`)
  and one `audit_logs` row (with `ai_action_id`);
- listed in Settings → Activity / Approvals as "auto-recorded" with a one-click **Undo** (session soft-delete of the
  transaction, itself audited);
- the threshold lives in code (`src/modules/finance/domain.ts`, `AI_EXPENSE_AUTO_RECORD_LIMIT = { VND: 50_000 }`),
  not in env or DB, so changing it is a reviewed PR + ADR update.
Why: spec §19; confirmation is the only control that survives prompt injection, but confirming a 30k coffee is pure friction.
Trade-off: an injected or buggy agent can create small wrong expenses without a human in the loop; bounded by the
threshold, the `finance.write` scope being opt-in per key (sensitive scope), full audit, and Undo.
**Consequences:** Operation registry gains a conditional rule (`confirmation: 'non_session_unless'` with a pure predicate,
unit-tested at 49,999 / 50,000 / USD / income / transfer); `ai_actions.auto_approval_rule` column added to the schema
proposal. Applies from Phase 3 (finance) / Phase 7 (`record_transaction`); Phase 1 builds the generic mechanism.
**Open question (proposed guardrail, not in force unless the Founder approves):** a rolling 24 h cap on auto-recorded totals (default 500,000 VND or 20
entries per actor); above the cap, small expenses fall back to confirmation. Implemented with Phase 3.

### ADR-013 Integration auth modes ★
**Status:** **Accepted** 2026-09-29 (Founder). Google account = **personal @gmail.com** (not Workspace).
**Decision:** Google = OAuth, External user type, publishing status **Testing**, Founder's address as the only test
user; Calendar first (Phase 2), Gmail scopes added incrementally (Phase 4). Notion = internal integration token stored
encrypted. GitHub = fine-grained read-only PAT stored encrypted; GitHub App at P8 for webhooks. Resend = app-level API key.
Why: simplest working auth per provider for a single user; no Google verification or security assessment needed.
Trade-off: PAT/internal tokens need manual rotation; Google needs re-consent weekly (below).
**Consequences of a personal Gmail account:**
- **No Internal OAuth app** (that requires a Workspace org). The app is External.
- **Testing mode ⇒ refresh tokens expire 7 days after consent** (Google applies this to External apps in Testing that
  request anything beyond openid/email/profile). Calendar and Gmail share one Google OAuth client, so they expire together.
  Every ~7 days the Founder must click "Reconnect Google" (≈ 20 s: tester warning screen + consent).
- **Publishing to "In production" is not planned:** restricted Gmail scopes (`gmail.readonly`, `gmail.compose`,
  `gmail.metadata`, `gmail.modify`) then require OAuth verification plus an annual third-party security assessment
  (CASA) because our server stores/transmits Gmail data; unverified production apps show warning screens and have
  user caps. Cost/effort is out of proportion for one user. Revisit only if the Testing workflow becomes unbearable.
- Google-dependent automation (Phase 8 calendar watch channels, scheduled syncs) stops silently when the token lapses
  unless the health check below catches it.
**Mitigation plan:**
1. Separate Google Cloud projects for dev/staging and production (Google policy); each with its own OAuth client.
2. **Minimal scopes, requested incrementally** (`include_granted_scopes=true`): Phase 2 `calendar.events` +
   `calendar.calendarlist.readonly`; Phase 4 adds Gmail. Gmail choice (decide at Phase 4 kickoff, default in bold):
   **`gmail.readonly` + `gmail.compose`** (search with `q`, read bodies, drafts, send) vs `gmail.metadata` + `gmail.send`
   (headers/labels only — no bodies, no `q` search, no drafts; `gmail.send` is only *sensitive*). Never `mail.google.com/`
   or `gmail.modify`. If the Founder only needs sending, `gmail.send` alone is the smallest option.
3. Store `refresh_token_expires_at = consent time + 7 d` on `integration_accounts` (new column) and show it in integration health.
4. Re-auth reminders: dashboard banner from T-48 h, `status=expired` + reconnect CTA on `invalid_grant`; in Phase 8 a daily
   cron health check emails/pushes the Founder at T-24 h and on failure. No retry storms on `invalid_grant`.
5. One-click reconnect (`prompt=consent`, same scopes) that preserves `sync_state` so the calendar resumes incrementally.
6. Keep ≤ 100 refresh tokens per client (Google silently drops the oldest): reuse the account row, revoke old tokens on reconnect.

### ADR-014 Calendar ownership & conflicts ★
**Status:** *Proposed* — awaiting Founder.
**Decision:** OS rows for all events in a −30/+180 day window (imported from Google + created in OS). OS-created events push to Google. Conflicts: last writer wins per event, loser recorded in audit. Recurring = expanded instances.
Why: the OS must reason over the real calendar while Google remains the execution surface (spec §2). Trade-off: editing a whole recurring series from the OS is not supported in v1.
**Q:** Which Google calendars to sync (primary only?), and is "edit series only in Google" acceptable?

### ADR-015 Table cuts/merges vs spec §10 ★
**Status:** **Accepted** 2026-09-29 (Founder), as proposed.
**Decision:** cut `users`, `integrations`, `contacts`, `follow_ups`; merge `receivables` into `debts(direction)`; rename `accounts` → `finance_accounts`; add `companies`, `email_sequence_steps`, `campaign_enrollments`, `integration_secrets`, `api_keys`, `idempotency_keys`, `webhook_deliveries`. Details: schema.md.
**Consequences:** follow-ups are `tasks(kind=follow_up)` with a required person or company (DB check) — they appear in
`/tasks`, "today" and "what am I forgetting" for free; automated follow-ups are `email_sequence_steps`. `companies` ships in
Phase 1 (task/project FKs). A receivable is `debts.direction='receivable'`; outstanding comes from `debt_balances`.
Spec §10 table names are not used anywhere in code or API.

### ADR-016 API key format & hashing
**Status:** **Accepted** 2026-09-29 (Technical Director), as proposed.
**Decision:** `pk_live_`/`pk_test_` + 32 random bytes (base64url); sha256 stored; default 90-day expiry; rotate with 24 h overlap.
Why: 256-bit random secrets don't need slow hashes. Trade-off: none material.

### ADR-017 MCP transport, auth, timing and client order ★
**Status:** **Accepted** 2026-09-29 (Founder); amended the same day: first client **Cursor**, then **ChatGPT**; Claude later.
OAuth timing (Phase 1.5b) decided by the Technical Director; Founder may veto (then ChatGPT waits for Phase 7).
**Decision:** One MCP endpoint, `/api/mcp`, in the Next.js app: Streamable HTTP, **stateless** (no `Mcp-Session-Id`,
POST JSON-RPC per request, works on Vercel serverless), official TS SDK (`@modelcontextprotocol/sdk`, or `mcp-handler`).
The same endpoint and tool registry serve every client; only the credential differs:

| Client | Phase | Credential | How it connects |
|---|---|---|---|
| **Cursor** (first) | 1.5a | `Authorization: Bearer pk_live_…` API key (`api_keys.kind='api_key'`) | `~/.cursor/mcp.json`: `{"url": "https://<prod>/api/mcp", "headers": {"Authorization": "Bearer ${env:PERSONAL_OS_MCP_KEY}"}}` |
| **ChatGPT** (second) | 1.5b | OAuth 2.1 access token from **Supabase Auth's OAuth 2.1 server** (auth code + PKCE S256, dynamic client registration) | Developer mode → create connector with the URL, auth = OAuth |
| Claude (later) | 7 | Either of the above (Claude Code: key header; Claude.ai: OAuth) | no server change |

Auth resolver at `/api/mcp` (in order): (1) `Bearer pk_…` → API-key lookup; (2) `Bearer <JWT>` → verify with Supabase
JWKS: `iss` = `<supabase-url>/auth/v1`, not expired, `client_id` claim present, `sub` = owner, and an **active
`oauth_grant` row for that `client_id`** (gives scopes, revocation, audit identity; `aud` pinned to the MCP resource via a
Custom Access Token Hook if the spike confirms it); (3) otherwise `401` + `WWW-Authenticate: Bearer
resource_metadata="<APP_URL>/.well-known/oauth-protected-resource"` (the metadata endpoint exists only once 1.5b ships).
Both paths produce the same `RequestContext {actor: ai, id: api_keys.id, source: 'mcp', scopes}`; `authorize()`, confirmations and
`ai_actions` are unchanged. Also: `Origin` header validated when present (MCP spec, DNS-rebinding), Vercel Firewall limits.

**OAuth timing — pulled into Phase 1.5b (not Phase 7).** Why: ChatGPT is now the second client and it *cannot* use API
keys (OAuth 2.1 or no auth only); keeping OAuth in Phase 7 would delay it by Phases 2–6 (~10+ weeks). "Minimal OAuth" is
small because we do **not** build an authorization server: Supabase Auth ships an OAuth 2.1/OIDC server with DCR,
PKCE and JWKS; we add a consent page, a token verifier, grant rows and one RLS hardening policy (≈ 4.5 d incl. a 0.5 d
spike). Fallback if the spike fails (e.g. `resource`/`aud` or metadata incompatibility with ChatGPT): a minimal
self-hosted AS in the app (+3–4 d) — or defer ChatGPT to Phase 7; decided at the spike's go/no-go.
**Security consequences:** Supabase OAuth tokens are normal `authenticated` JWTs with a `client_id` claim, so without care
ChatGPT's token could hit the Supabase Data API with full owner RLS rights, bypassing our scopes. Mitigation (in schema
proposal): a `RESTRICTIVE` policy `no_oauth_client_tokens` on every table (`auth.jwt()->>'client_id' IS NULL`) — OAuth tokens
only work through `/api/mcp`. Consent is owner-only, scopes chosen at consent from an allow-list (default `tasks.read
tasks.write projects.read`; sensitive scopes need re-auth), grants revocable in Settings → Connections.
Why overall: proves the AI-native thesis early and exercises the permission layer while it is small.
Trade-off: ~2 weeks before Phase 2; MCP surface must stay stable once Cursor/ChatGPT depend on it.
**Consequences:** `api_keys` becomes the credential table (`kind api_key | oauth_grant`, `oauth_client_id`);
`ai_actions.client` = `cursor-mcp` / `chatgpt-mcp`. The MCP endpoint is public from day one.
Estimates and tasks: phase-1-plan.md §8 (1.5a Cursor 3 d, 1.5b ChatGPT 4.5 d).

### ADR-018 Rate limiting without Redis
**Status:** **Accepted** 2026-09-29 (Technical Director), as proposed.
**Decision:** Vercel Firewall rules first; Postgres counter function for per-key limits only if needed.
Trade-off: Firewall rule availability depends on Vercel plan.

### ADR-019 Timeline is a view
**Status:** **Accepted** 2026-09-29 (Technical Director), as proposed.
**Decision:** `timeline_events` view over domain tables; no timeline table. Trade-off: view grows as domains are added; materialize only if slow.

### ADR-020 Testing stack
**Status:** **Accepted** 2026-09-29 (Technical Director), as proposed.
**Decision:** Vitest (unit: domain/permissions/validation; integration: repositories + route handlers against `supabase start`), SQL smoke/RLS tests in `supabase/tests`, recorded-fixture adapter tests, Playwright only for a login + create-task smoke test.

### ADR-021 Gmail inbox is not mirrored
**Status:** **Accepted** 2026-09-29 (Technical Director), as proposed.
**Decision:** Gmail read/search is live via adapter; only OS-originated messages and explicit links are stored.
Why: privacy, volume, sync cost; spec §2 (Gmail = external communication). Trade-off: no offline full-text search over mail; "emails needing attention" depends on Gmail query quality and API latency.
