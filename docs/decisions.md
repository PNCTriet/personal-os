# Architecture Decisions (lock before coding)

Format: **Decision** · Why · Trade-off · **Open question for Founder**. Status for all: *Proposed* until approved.
★ = needs Founder approval before Phase 1 starts (the rest can be accepted by Technical Director).

### ADR-001 Modular monolith with vertical modules ★
**Decision:** One Next.js app; `src/modules/<domain>/{service,domain,repository,schemas,operations}.ts`; boundaries lint-enforced; no Edge Functions.
Why: spec §3/§15; keeps each domain in one place. Trade-off: deviates from spec §5's layer-first folders.
**Q:** OK to use vertical modules instead of root `services/` + `repositories/`?

### ADR-002 Single owner, multi-user-ready rows ★
**Decision:** `user_id` on every row + RLS; sign-in restricted to `OWNER_EMAIL`; no sign-up, no teams. Ivan's automation = API keys.
Why: near-zero cost now, avoids a rewrite later. Trade-off: Ivan is not a separate *user* with his own login in v1.
**Q:** Does Ivan need his own login (read-only?) in v1, or are named API keys enough?

### ADR-003 Data access: supabase-js + generated types + SQL functions, no ORM ★
**Decision:** Repositories use supabase-js (user-JWT client for session, secret-key client + mandatory `user_id` filter for API-key/AI). Multi-row atomic ops = Postgres functions via RPC.
Why: stays in the declared stack; RLS native for the session path; HTTP-based client suits serverless (no pool exhaustion).
Trade-off: no ad-hoc transactions; logic split between TS and a few SQL functions. Alternative: Kysely + direct Postgres (Supavisor) for real transactions.
**Q:** Accept supabase-js, revisiting if we exceed ~10 RPC functions?

### ADR-004 SQL-first migrations (Supabase CLI), phase-scoped
**Decision:** Hand-written SQL migrations in `supabase/migrations`, generated TS types checked in CI. `0000_proposed_schema.sql` is split per phase after approval.
Why: DB-level integrity (triggers, RLS, partial indexes) is first-class in SQL. Trade-off: no schema-in-TS DX.

### ADR-005 API style: snake_case, envelope, cursor pagination
**Decision:** `{data, meta}` / `{error}`; snake_case end-to-end; cursor pagination; `Idempotency-Key` on money/EXECUTE writes; OpenAPI from Zod.
Why: no mapping layer; stable for external consumers. Trade-off: snake_case in TS code (acceptable; types are generated).

### ADR-006 Identity: UUID + human codes ★
**Decision:** UUID v4 PKs. Codes only for projects (owner-chosen, immutable, never reused) and tasks (`{project}-T{NN}`, DB-assigned). Moving a task assigns a new code; old code kept in `previous_codes` and still resolves.
Why: spec §7; codes are handles, not identity. Trade-off: task codes can change on move.
**Q:** On move, re-code (recommended, Jira-like) or keep the original code forever? Is `HOWL-XXX-NN` the required project pattern or free-form uppercase segments?

### ADR-007 Money model ★
**Decision:** `bigint` minor units + ISO currency per account; signed amounts; balances/outstanding/progress are views; no FX conversion in v1 (summaries per currency); base currency VND.
Why: spec §6 deterministic finance. Trade-off: no single "net worth" across currencies until FX rates are modeled.
**Q:** Which currencies do you actually hold (VND only? USD/EUR too)? Is per-currency reporting acceptable for v1?

### ADR-008 Archive vs soft delete
**Decision:** `archived_at` = done/hidden, `deleted_at` = trash (30 days), hard purge only by explicit job; audit never purged.
Trade-off: every query must filter `deleted_at IS NULL` (repository helper).

### ADR-009 Integration token storage: app-level AES-256-GCM ★
**Decision:** Tokens encrypted in the app with `TOKEN_ENCRYPTION_KEY` (per env), stored in `integration_secrets` (service-role only).
Why: DB dump alone is useless; portable (works in local/scratch Postgres and tests). Alternative: Supabase Vault (key managed by Supabase, less code, but key and data live with the same vendor/project and it's harder to test locally).
**Q:** Accept app-level encryption over Supabase Vault?

### ADR-010 `external_references` is the only core→external link
**Decision:** No `notion_page_id`/`google_event_id` columns; convenience fields computed in API responses.
Why/Trade-off: see integrations.md §2 (flexibility vs no FK).

### ADR-011 Audit model
**Decision:** `audit_logs` append-only for all actors; `ai_actions` for every agent invocation + confirmation state; written by the app (not DB triggers) so actor/source/intent are captured.
Trade-off: an audit write can fail after a successful mutation (logged/alerted; R-07).

### ADR-012 Server-side confirmation flow ★
**Decision:** Non-session actors get `202 confirmation_required`; the owner approves in the web UI; the server executes the stored, hashed args; 15-min expiry. Confirmation-gated: EXECUTE (email send, external writes with attendees), DELETE, finance writes, SENSITIVE writes.
Why: spec §19; the only control that survives prompt injection. Trade-off: friction for AI workflows (no fully autonomous sending).
**Q:** Is the gated list right? Specifically: should AI-recorded *expenses* (e.g. "log 50k coffee") skip confirmation below a threshold (e.g. < 500,000 VND)?

### ADR-013 Integration auth modes ★
**Decision:** Google = OAuth (Calendar first, Gmail added incrementally at P4). Notion = internal integration token stored encrypted (simplest for one workspace; OAuth later if needed). GitHub = fine-grained read-only PAT stored encrypted; GitHub App at P8 for webhooks. Resend = app-level API key.
Why: simplest working auth per provider for a single user. Trade-off: PAT/internal tokens need manual rotation.
**Q:** Is your Google account Workspace (→ Internal OAuth app, no verification) or personal @gmail.com (→ unverified personal-use app; see R-03)?

### ADR-014 Calendar ownership & conflicts ★
**Decision:** OS rows for all events in a −30/+180 day window (imported from Google + created in OS). OS-created events push to Google. Conflicts: last writer wins per event, loser recorded in audit. Recurring = expanded instances.
Why: the OS must reason over the real calendar while Google remains the execution surface (spec §2). Trade-off: editing a whole recurring series from the OS is not supported in v1.
**Q:** Which Google calendars to sync (primary only?), and is "edit series only in Google" acceptable?

### ADR-015 Table cuts/merges vs spec §10 ★
**Decision:** cut `users`, `integrations`, `contacts`, `follow_ups`; merge `receivables` into `debts`; rename `accounts` → `finance_accounts`; add `companies`, `email_sequence_steps`, `campaign_enrollments`, `integration_secrets`, `api_keys`, `idempotency_keys`, `webhook_deliveries`. Details: schema.md.
**Q:** Approve, especially "follow-ups are tasks (kind=follow_up)"?

### ADR-016 API key format & hashing
**Decision:** `pk_live_`/`pk_test_` + 32 random bytes (base64url); sha256 stored; default 90-day expiry; rotate with 24 h overlap.
Why: 256-bit random secrets don't need slow hashes. Trade-off: none material.

### ADR-017 MCP transport, auth and timing ★
**Decision:** Streamable HTTP at `/api/mcp`, stateless, official TS SDK; API-key bearer first; OAuth 2.1 when connecting ChatGPT (Phase 7).
**Q:** Pull a thin MCP slice (Phase 1 task tools only) forward to right after Phase 1? Which AI client matters first — ChatGPT (needs OAuth) or Claude/Cursor (API key works)?

### ADR-018 Rate limiting without Redis
**Decision:** Vercel Firewall rules first; Postgres counter function for per-key limits only if needed.
Trade-off: Firewall rule availability depends on Vercel plan.

### ADR-019 Timeline is a view
**Decision:** `timeline_events` view over domain tables; no timeline table. Trade-off: view grows as domains are added; materialize only if slow.

### ADR-020 Testing stack
**Decision:** Vitest (unit: domain/permissions/validation; integration: repositories + route handlers against `supabase start`), SQL smoke/RLS tests in `supabase/tests`, recorded-fixture adapter tests, Playwright only for a login + create-task smoke test.

### ADR-021 Gmail inbox is not mirrored
**Decision:** Gmail read/search is live via adapter; only OS-originated messages and explicit links are stored.
Why: privacy, volume, sync cost; spec §2 (Gmail = external communication). Trade-off: no offline full-text search over mail; "emails needing attention" depends on Gmail query quality and API latency.
