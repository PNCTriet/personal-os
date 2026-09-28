# Schema (PROPOSAL)

File: [`supabase/migrations/0000_proposed_schema.sql`](../supabase/migrations/0000_proposed_schema.sql) — **proposal, not
an applied migration.** 30 tables, 4 views, 35 enums, RLS on every table.
Table set (cuts/merges/additions) **accepted 2026-09-29 (ADR-015)**; data access via supabase-js + generated types, no ORM
(ADR-003, accepted). Remaining pending ADRs (001, 002, 006, 007) can still change details before the Phase 1 split.

## Validation
`scripts/validate-schema.sh` runs, against a scratch PostgreSQL 17:
1. `supabase/validation/00_supabase_stub.sql` — stubs `auth.users`, `auth.uid()` (reads `request.jwt.claim.sub`), roles `anon`/`authenticated`/`service_role`.
2. The proposed schema with `ON_ERROR_STOP=1`.
3. `supabase/validation/01_smoke_test.sql` — behavioural asserts as the `authenticated` role: task code assignment and
   move aliasing, code immutability, dependency cycle rejection, done⇔completed_at, balances/transfer/debt outstanding,
   currency guard, romantic⇒sensitive, external-ref cleanup + calendar 1:1, secrets unreadable, audit append-only,
   derived timeline, auto-approval waiver vs pending confirmation (ADR-012), cross-user RLS isolation (incl. through
   views), anon denied. **Result: PASSED** (re-run 2026-09-29).

## Conventions
- `id uuid pk default gen_random_uuid()`; `user_id uuid not null → auth.users on delete cascade` on **every** table (uniform RLS, multi-user-ready at ~zero cost).
- `created_at`, `updated_at` (trigger) on all mutable tables. `archived_at` (hide from active lists; still history) and `deleted_at` (trash; restorable) on user-facing aggregates. Hard purge of rows `deleted_at < now() - 30d` = explicit Phase 8 job; audit_logs never purged.
- Unique constraints that matter for users are partial `WHERE deleted_at IS NULL`, except codes (never reused).
- Enums for closed sets (cheap `ALTER TYPE ... ADD VALUE`); free text where the set is open (finance `category`, `notes.tags`).
- Money: `bigint` minor units + `char(3)` ISO currency; VND has exponent 0, USD 2 (exponent table lives in `finance/domain.ts`).
- All timestamps `timestamptz` (UTC stored). Date-only concepts use `date` (`due_on`, `occurred_on`). "Today" = `profiles.timezone`.
- Derived data are views with `security_invoker = true` so RLS still applies.
- Helper/trigger functions live in schema `private` (not exposed via the Data API).

**I disagree with `created_by`/`updated_by` on every table because** there is one owner, so the column is always the
same uuid, while the real question — *which actor* (UI, API key, which AI) — is answered by `audit_logs`
(`entity_type, entity_id` index). Trade-off: showing "created by AI" in a list needs a join to audit; acceptable,
and we can add an `origin actor_type` column to tasks/notes later if the UI needs it cheaply.

## Tables by domain

| Domain | Table | Phase | Key constraints / indexes |
|---|---|---|---|
| Core | `profiles` | 1 | pk = auth.users.id; auto-created by trigger |
| Work | `companies` | 1 | unique (user, domain) partial |
| Work | `projects` | 1 | unique (user, code) incl. deleted; code regex; code immutable trigger; completed⇔completed_at |
| Work | `tasks` | 1 | unique (user, code); code trigger; done⇔completed_at; follow_up needs target; partial index open tasks by due |
| Work | `task_dependencies` | 1 | composite pk; no self; cycle trigger (recursive CTE) |
| People | `people` | 1 (minimal) / 4 | GIN on emails; `email_opt_out_at` suppression |
| Time | `calendar_events` | 2 | ends ≥ starts; index (user, starts_at, ends_at) |
| Finance | `finance_accounts` | 3 | unique name per user; currency regex |
| Finance | `finance_transactions` | 3 | sign vs kind check; transfer⇔group; currency = account currency trigger; `record_transfer()` RPC |
| Finance | `debts` | 3 | direction; principal > 0; counterparty required |
| Finance | `financial_goals` | 3 | target > 0 |
| Relationships | `relationships` | 6 | unique (person, kind); romantic ⇒ sensitive |
| Relationships | `interactions` | 6 | index (person, occurred_at desc) |
| Relationships | `important_dates` | 6 | valid month/day; index (user, month, day) |
| Knowledge | `notes` | 5 | generated `tsvector` (simple) + GIN; tags GIN |
| Memory | `memories` | 6 | validity window; supersedes chain; partial index current |
| Outreach | `leads` | 4 | person or company required |
| Outreach | `email_campaigns`, `email_sequence_steps`, `campaign_enrollments` | 4 | step order unique; enrollment unique (campaign, lead); due index |
| Outreach | `email_messages` | 4 | sent⇔sent_at; unique (provider, provider_message_id) |
| Outreach | `email_events` | 4 | unique (provider, provider_event_id) = idempotent webhooks |
| Integrations | `integration_accounts` | 2 | unique (user, provider, external_account_id); `refresh_token_expires_at` drives Google re-auth reminders (ADR-013) |
| Integrations | `integration_secrets` | 2 | service-role only (RLS on, no policies, no grants) |
| Integrations | `external_references` | 2 | unique link; one OS event per Google event (partial unique) |
| Platform | `api_keys` | 1 | unique `secret_hash`; `secret_hash` not selectable by `authenticated` (column grants) |
| Platform | `ai_actions` | 1 (table) / 1.5 (MCP slice) / 7 | pending index; confirmation needs expiry; `auto_approval_rule` records confirmation waivers (ADR-012 small-expense rule), never together with `requires_confirmation` |
| Platform | `audit_logs` | 1 | bigint identity; append-only trigger; indexes by time, entity, actor |
| Platform | `idempotency_keys` | 1 | pk (user, key); 24 h expiry; service-role only |
| Platform | `webhook_deliveries` | 2/4/8 | unique (provider, delivery_id); service-role only |

Views: `finance_account_balances`, `debt_balances`, `email_message_delivery`, `timeline_events`.

## Cuts, merges, additions vs spec §10 (ADR-015 — accepted 2026-09-29)

| Spec table | Decision | Why |
|---|---|---|
| `users` | **Cut** → `auth.users` + `profiles` | Supabase Auth already owns identity; a copy drifts. |
| `accounts` | **Renamed** `finance_accounts` | "accounts" collides with auth/integration accounts in code and AI prompts. |
| `receivables` | **Merged** into `debts(direction)` | Identical shape and lifecycle; one outstanding calculation. |
| `contacts/leads` | **Split**: contacts → `people`; `leads` kept | A contact is a person. A lead is pipeline state, which a friend never has. |
| `follow_ups` | **Cut** → `tasks(kind=follow_up)` + `email_sequence_steps` | Human follow-ups need everything a task has (due, status, priority, "what am I forgetting"). Automated ones are sequence steps. |
| `integrations` | **Cut** → code catalog; status/scopes on `integration_accounts` | 4 static providers; a table adds joins and seed drift, zero behavior. **I disagree with spec §11 because** per-provider `status/scopes` are really per-*account* facts (two Google accounts can differ). Trade-off: enabling a provider = code deploy, which is fine for 4 providers. |
| `email_messages` | Kept, **narrowed** to OS-originated mail | Gmail inbox not mirrored (privacy, volume, sync cost). |
| — | **Added** `companies` | Spec §6/§8 require company links on tasks/projects/leads. |
| — | **Added** `email_sequence_steps`, `campaign_enrollments` | Spec §15 Lead → Campaign → Sequence → Message requires per-lead state. |
| — | **Added** `integration_secrets` | Least privilege: token ciphertext never reachable by any user-facing policy. |
| — | **Added** `api_keys` | Spec §21 (not listed in §10). |
| — | **Added** `idempotency_keys` | AI/clients retry; duplicate `record_transaction`/`send_email` must be impossible. |
| — | **Added** `webhook_deliveries` | Spec §23 idempotency + §31 webhook logs. |
| Timeline | **View**, not table | Spec §27 "derived, not duplicated". |
| Balances, outstanding, delivery status | **Views** | Spec §9 prefer calculation. |

Deferred (modeled in domain-model.md, no table yet): goals, habits, routines, life_events, budgets, subscriptions,
work_logs, activities (fitness/learning), person↔person relationships, interaction participants, event attendees table, categories.

## RLS sketch

- Every table: `ENABLE ROW LEVEL SECURITY`; `anon` has no grants.
- Owner tables: one policy `owner_all FOR ALL TO authenticated USING (user_id = (select auth.uid())) WITH CHECK (same)`.
  `(select auth.uid())` form = evaluated once per statement (Supabase perf guidance).
- `profiles`: select/update own row only.
- `audit_logs`: select + insert only; update/delete blocked by trigger for **every** role incl. service role.
- `api_keys`: column-level grant excludes `secret_hash`; only `revoked_at` updatable by owner; creation server-side.
- `integration_secrets`, `idempotency_keys`, `webhook_deliveries`: RLS on, **zero policies**, no grants → service role only.
- Server path: session requests use the user-JWT client (RLS enforced); API-key/AI/webhook requests use the secret-key
  client and repositories **always** add `.eq('user_id', ctx.userId)` (ADR-003). RLS is defense in depth, not the only check.

## Soft delete / archive

| Action | Effect | Visible in | Restorable |
|---|---|---|---|
| Archive | `archived_at = now()` | history, search with `include_archived`, timeline | yes (unarchive) |
| Delete | `deleted_at = now()` (DELETE category → confirmation for non-session actors) | trash only | yes, 30 days |
| Purge | hard `DELETE` (Phase 8 job or explicit owner action) | nowhere; `external_references` removed by trigger; audit kept | no |

`finance_transactions` have no `archived_at` (a transaction is never "done"); corrections are edits/deletes with audit.
FK behavior: `restrict` where silent loss is dangerous (task→project, transaction→account/debt, lead→person);
`set null` for optional context links; `cascade` only from owner (`auth.users`) and true children (steps, events, secrets).

## Migration plan after approval
1. `20261001000000_platform_and_work.sql` (Phase 1 tables only) + RLS tests.
2. One migration per later phase. Never edit an applied migration; additive changes; breaking changes documented in `docs/decisions.md`.
3. Generated types: `supabase gen types typescript --local > src/lib/supabase/database.types.ts` in CI; drift fails the build.
