# API Contract — `/api/v1`

Designed for the web UI, scripts, AI/MCP and future external consumers (spec §16). JSON over HTTPS. Phase 1 endpoints
are specified in detail; later phases are listed at contract level and detailed when their phase starts.

## 1. Conventions

| Topic | Rule |
|---|---|
| Base | `https://<host>/api/v1`. Breaking change ⇒ `/api/v2`; additive changes allowed in v1. |
| Casing | **snake_case** JSON fields = DB column names = generated TS types (ADR-005). No mapping layer. |
| IDs | UUID strings. Path params also accept human codes for projects/tasks (`/tasks/HOWL-VTO-01-T01`). |
| Time | RFC 3339 UTC timestamps (`2026-09-29T02:00:00Z`); dates `YYYY-MM-DD`. Server interprets "today" in `profiles.timezone`. |
| Money | `{ "amount_minor": -150000, "currency": "VND" }`. Never floats. |
| Validation | Every body/query parsed by a Zod schema from the module's `schemas.ts`; unknown fields rejected (`.strict()`). |
| Content type | `application/json; charset=utf-8`. |
| Request id | Server generates `request_id` (or accepts `X-Request-Id`), returns it in `meta`/`error` and `X-Request-Id` header, logs it, writes it to audit. |

### Envelope
Success:
```json
{ "data": { "id": "…", "code": "HOWL-VTO-01-T01", "title": "Draft itinerary" },
  "meta": { "request_id": "req_01J…" } }
```
List:
```json
{ "data": [ … ],
  "meta": { "request_id": "req_…", "next_cursor": "eyJrIjoi…", "has_more": true, "limit": 50 } }
```
Error:
```json
{ "error": { "code": "validation_failed", "message": "title: Required",
             "details": [{ "path": ["title"], "issue": "required" }], "request_id": "req_…" } }
```
Confirmation required (non-session actor, sensitive op):
```json
HTTP 202
{ "data": { "status": "confirmation_required", "action_id": "…", "expires_at": "…",
            "summary": "Send email to minh@example.com: 'Tour dates'" },
  "meta": { "request_id": "…" } }
```

### Error codes
| HTTP | `code` | When |
|---|---|---|
| 400 | `validation_failed` | Zod failure, bad cursor |
| 401 | `unauthenticated` | Missing/invalid/expired/revoked session or key |
| 403 | `forbidden` | Missing scope, classification denied, not owner |
| 403 | `confirmation_rejected` | Owner rejected pending action |
| 428 | `confirmation_required` | Session request to a confirmation-gated op without `X-Confirm: true` |
| 404 | `not_found` | Missing **or not owned** (never leak existence) |
| 409 | `conflict` | Unique violation (project code), invalid state transition, dependency cycle |
| 409 | `idempotency_conflict` | Same `Idempotency-Key`, different body |
| 410 | `confirmation_expired` | |
| 422 | `domain_rule_violation` | Business rule (e.g. currency mismatch) |
| 424 | `integration_unavailable` | Provider down/credentials expired (`details.provider`, `details.reconnect_url`) |
| 429 | `rate_limited` | `Retry-After` header |
| 500 | `internal_error` | Never includes stack/SQL |

Postgres errors are mapped centrally: `23505`→409, `23514`/`P0001 check_violation`→409/422, `42501`→403 (logged as a bug:
our code should have caught it first).

### Pagination, filtering, sorting
- Cursor pagination: `?limit=50&cursor=<opaque>`; `limit` 1–200, default 50. Cursor = base64url of `{sort key, id}`; stable under inserts.
- Filters are explicit per endpoint (`status`, `project_id`, `due_before`, …); arrays as repeated params `status=todo&status=in_progress`.
- `sort` from an allow-list per endpoint, e.g. `sort=due_on` / `sort=-updated_at`.
- `include_archived=true`; deleted rows only via `/trash` endpoints.
- `fields` / `expand` not in v1 (YAGNI). Nested resources returned as ids + minimal `{id, code, name}` summaries.

### Idempotency
`Idempotency-Key` header (8–255 chars): **required** for EXECUTE endpoints (email send, external writes) and money writes;
**accepted** on every POST. Stored in `idempotency_keys` 24 h with request hash + response; replay returns the stored
response; different body → 409.

### Auth
| Method | Header | Actor | Scopes |
|---|---|---|---|
| Session | Supabase SSR cookies | `user` | all (owner), confirmations via UI dialog |
| API key | `Authorization: Bearer pk_live_…` | `api_key` | key's scopes |
| MCP | via MCP transport (API key / OAuth) | `ai` | key/token scopes ∩ tool's operation |
Every request: authenticate → scope check per operation → ownership (`user_id`) → classification → confirmation rule.
CSRF: cookie-auth mutations require `Origin` = `APP_URL` (checked in the handler wrapper); API keys are not cookies.

## 2. Phase 1 endpoints (detailed)

### Health & identity
| Method | Path | Scope | Notes |
|---|---|---|---|
| GET | `/health` | none | `{status:"ok", version, db:"ok"}`; rate limited; no data |
| GET | `/me` | any valid auth | profile + actor info: `{ user: {id, display_name, timezone, base_currency}, actor: {type, id, scopes} }` |
| PATCH | `/me` | session only | `display_name`, `timezone` (IANA, validated), `locale`, `base_currency`, `settings` |

### Projects (`projects.read` / `projects.write`)
| Method | Path | Body / query | Response |
|---|---|---|---|
| GET | `/projects` | `status[]`, `company_id`, `include_archived`, `q` (name/code prefix), `sort` (`-updated_at`\|`name`\|`code`), cursor | `Project[]` with `open_task_count` |
| POST | `/projects` | `{code, name, description?, status?, company_id?, start_date?, target_date?, classification?}` | 201 `Project`; 409 if code taken (incl. deleted) |
| GET | `/projects/:idOrCode` | | `Project` + `task_counts_by_status`, `blocked_task_count` |
| PATCH | `/projects/:idOrCode` | any mutable field except `code` | `Project`; `status=completed` sets `completed_at` |
| POST | `/projects/:idOrCode/archive` · `/unarchive` | | `Project` |
| DELETE | `/projects/:idOrCode` | | 204 soft delete; 409 if open tasks unless `?cascade_tasks=true`; DELETE category |

`Project`: `{id, code, name, description, status, company_id, start_date, target_date, completed_at, classification, created_at, updated_at, archived_at}`

### Tasks (`tasks.read` / `tasks.write`)
| Method | Path | Body / query | Response |
|---|---|---|---|
| GET | `/tasks` | `project_id`, `status[]`, `priority[]`, `kind`, `person_id`, `due_before`, `due_after`, `overdue=true`, `blocked=true`, `q` (title FTS/code), `sort` (`due_on`\|`-priority`\|`-updated_at`), cursor | `Task[]` |
| POST | `/tasks` | `{title, project_id?, description?, status?, priority?, kind?, due_on?, estimate_minutes?, person_id?, company_id?, classification?, depends_on?: uuid[]}` | 201 `Task` (code assigned if project) |
| GET | `/tasks/:idOrCode` | | `Task` + `depends_on[]`, `blocks[]` summaries, `is_blocked` |
| PATCH | `/tasks/:idOrCode` | mutable fields; `project_id` move ⇒ new code, old in `previous_codes` | `Task`; 409 on invalid transition |
| POST | `/tasks/:idOrCode/complete` | `{completed_at?}` | `Task` (idempotent: completing a done task returns 200 unchanged) |
| POST | `/tasks/:idOrCode/reopen` | | `Task` |
| POST | `/tasks/:idOrCode/dependencies` | `{depends_on_task_id}` | 201; 409 on cycle |
| DELETE | `/tasks/:idOrCode/dependencies/:dependsOnId` | | 204 |
| DELETE | `/tasks/:idOrCode` | | 204 soft delete |
| GET | `/trash/tasks` · POST `/trash/tasks/:id/restore` | | session only in P1 |

`Task`: `{id, code, previous_codes, project: {id, code, name}|null, title, description, status, priority, kind, due_on, completed_at, estimate_minutes, person_id, company_id, classification, is_blocked, created_at, updated_at, archived_at}`

### Companies (`projects.read/write` in P1; `people.*` later)
`GET/POST /companies`, `GET/PATCH/DELETE /companies/:id` — minimal (name, domain, website).

### Dashboard
| Method | Path | Scope | Returns |
|---|---|---|---|
| GET | `/dashboard/today` | `tasks.read` (+ `calendar.read`, `finance.read` when phases land; sections omitted if scope missing) | `{ date, timezone, overdue: Task[], due_today: Task[], in_progress: Task[], blocked: Task[], projects: {active, at_risk}[], recent_activity: Audit[] }` |

### Activity / audit (`audit.read`)
| GET | `/activity` | `actor_type`, `actor_id`, `source`, `entity_type`, `entity_id`, `since`, `until`, `status`, cursor | `AuditEntry[]` (input redacted). "What did AI do today?" = `/activity?actor_type=ai&since=<today 00:00 local>` |

### API keys (session only — an API key can never manage keys)
| Method | Path | Body | Response |
|---|---|---|---|
| GET | `/api-keys` | | `[{id, name, prefix, scopes, created_at, expires_at, last_used_at, revoked_at}]` |
| POST | `/api-keys` | `{name, scopes[], expires_in_days? (default 90, max 365)}`; sensitive scopes require recent re-auth (≤5 min) | 201 `{…, secret: "pk_live_…"}` — **secret shown once** |
| POST | `/api-keys/:id/rotate` | | 201 new key; old key valid 24 h then revoked |
| POST | `/api-keys/:id/revoke` | | 200 |

### Approvals (session only; table exists P1, used by API keys from P1 and AI from P1.5 MCP slice)
| GET | `/approvals?status=pending_confirmation` | pending `ai_actions` with human summary |
| POST | `/approvals/:id/confirm` | executes stored args exactly; returns result |
| POST | `/approvals/:id/reject` | |
| GET | `/approvals?auto_approved=true` | actions that ran under an `auto_approval_rule` (ADR-012 small VND expense, from P3) |

Undo of an auto-recorded expense = `DELETE /finance/transactions/:id` from the session (soft delete, audited).

## 3. Later phases (contract level)

| Phase | Resource | Endpoints | Scopes |
|---|---|---|---|
| 2 | Calendar | `GET /calendar/events?from&to` · `POST /calendar/events` (`sync_to_google` bool) · `GET/PATCH/DELETE /calendar/events/:id` · `POST /tasks/:id/schedule` `{starts_at, ends_at}` · `GET /calendar/availability?from&to` | `calendar.read/write` |
| 2 | Integrations | `GET /integrations` (catalog + accounts + health) · `GET /integrations/google/connect?capabilities=calendar` → 302 · `GET /integrations/google/callback` · `POST /integrations/:accountId/sync` · `DELETE /integrations/:accountId` | `integrations.manage` (session only) |
| 3 | Finance | `GET /finance/summary?period=` · `GET/POST /finance/accounts` · `GET/POST /finance/transactions` · `PATCH/DELETE /finance/transactions/:id` · `POST /finance/transfers` · `GET/POST /finance/debts` · `GET /finance/debts/:id` · `GET/POST /finance/goals` · `GET /finance/spendable?until=` | `finance.read/write` (+ confirmation for writes by non-session, except a plain VND expense < 50,000 — ADR-012) |
| 4 | People | `GET/POST /people` · `GET/PATCH/DELETE /people/:id` | `people.read/write` |
| 4 | Communication | `GET/POST /communication/leads` · `PATCH /communication/leads/:id` · `GET/POST /communication/campaigns` · `POST /communication/campaigns/:id/enroll` · `POST /communication/email/send` (Resend; `Idempotency-Key` required) · `GET /communication/messages` · `GET /communication/gmail/search?q=` · `GET /communication/gmail/threads/:threadId` · `POST /communication/gmail/drafts` · `POST /communication/gmail/drafts/:id/send` | `outreach.read/write/send`, `gmail.read/draft/send` |
| 5 | Knowledge | `GET /notes?q&tag` · `POST /notes` · `GET/PATCH/DELETE /notes/:id` · `GET /notion/search?q` · `POST /notes/:id/link-notion` · `POST /external-references` · `DELETE /external-references/:id` · `GET /github/issues?repo` | `notes.read/write`, `notion.read/write`, `github.read` |
| 6 | Relationships | `GET /relationships` · `GET /relationships/:personId` (context: relationships, last interactions, dates, memories, follow-ups) · `POST /people/:id/interactions` · `POST /people/:id/follow-ups` (creates task) · `GET/POST /important-dates` · `GET /timeline?from&to&domain` | `relationships.read/write`, `sensitive.read` |
| 6 | Memory | `GET /memories?person_id&category` · `POST /memories` · `POST /memories/:id/correct` · `POST /memories/:id/expire` | `memory.read/write` |
| 7 | AI | `POST /ai/command` `{prompt}` → grounded answer + proposed actions · `GET /ai/actions` | `ai.command` |
| 4/8 | Webhooks (not under v1, not API-key auth) | `POST /api/webhooks/resend` · `/google-calendar` · `/github` | provider signature |

OpenAPI: generated from Zod schemas (`zod-openapi`) at `/api/v1/openapi.json` from Phase 1 — the contract is code, this doc is the index.
