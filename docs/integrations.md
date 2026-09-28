# Integration Architecture

Principle (spec §2, §30): Supabase is the source of truth for core entities; providers are replaceable adapters. The OS
stores **references + sync state**, never a wholesale mirror.

## 1. Layers
```
module service (e.g. time.service.scheduleTask)
  └─ integration service  (src/integrations/<provider>/*.service.ts)
       · loads integration_account + decrypts credentials (vault.ts)
       · refreshes tokens, maps domain <-> provider DTOs, writes external_references / sync_state
       └─ adapter          (src/integrations/<provider>/*.adapter.ts)
            · thin typed HTTP client over provider API (official SDK or fetch)
            · retries (idempotent verbs only), backoff on 429/5xx, maps errors to IntegrationError
```
- Domain modules depend on a **port** interface (e.g. `CalendarProvider { listChanges, upsertEvent, cancelEvent }`), not on Google. Swapping providers = new adapter implementing the port.
- `IntegrationError { provider, kind: 'auth_expired'|'rate_limited'|'not_found'|'conflict'|'unavailable'|'invalid', retryable }` → API `424 integration_unavailable` with reconnect hint.
- No provider SDK import outside `src/integrations/**` (lint rule).

## 2. Data model
| Table | Role |
|---|---|
| (code) `integrations/core/catalog.ts` | Provider catalog: id, auth mode, capabilities (`calendar`, `gmail`, …), required provider scopes per capability, adapter factory. **Replaces spec's `integrations` table** (see schema.md). |
| `integration_accounts` | One row per connected external account: provider, `external_account_id` (Google `sub`, Notion workspace id, GitHub user id), display name, status (`active/expired/revoked/error/disconnected`), granted provider scopes, `token_expires_at`, `sync_state` jsonb (e.g. calendar `syncToken` per calendar), `last_synced_at`, `last_error`. |
| `integration_secrets` | Encrypted access/refresh tokens (AES-256-GCM, app-held key). Service role only. Spec's "access token ref / refresh token ref" = this row. |
| `external_references` | Polymorphic link `(entity_type, entity_id) ↔ (provider, external_type, external_id)`, plus `external_url`, `etag`, `sync_status`, `remote_updated_at`, `last_synced_at`, small `metadata` (e.g. GitHub issue title/state/number). |
| `webhook_deliveries` | Dedupe + log for every inbound webhook. |

**I disagree with dedicated columns like `project.notion_page_id` / `google_event_id` (spec §7, §13) because** each new
provider would need migrations across many tables, and many-to-many links (a task linked to an issue *and* a PR)
don't fit a column. `external_references` gives one lookup path, one sync-state shape, one cleanup trigger. Trade-off:
no DB-level FK from `entity_id` → mitigated by an `entity_type` enum, hard-delete cleanup triggers, and a
unique partial index guaranteeing 1:1 for calendar events. The API still exposes convenient fields
(`project.notion_page_id` as a computed read field) so consumers don't care.

## 3. OAuth flow (Google, Notion)
**Google setup (ADR-013, accepted 2026-09-29):** the Founder uses a personal @gmail.com account, so the OAuth app is
**External**, publishing status **Testing**, with the Founder as the only test user; separate Google Cloud projects for
dev/staging and production. Consequence: refresh tokens expire **7 days after consent** (Calendar and Gmail together,
same client) → weekly one-click reconnect, driven by `refresh_token_expires_at` (below). Publishing to production is not
planned: restricted Gmail scopes would require verification + annual CASA security assessment.

1. `GET /api/v1/integrations/google/connect?capabilities=calendar` (session, `integrations.manage`) → server creates
   `state` (random, stored in HttpOnly cookie, 10 min) + PKCE verifier → 302 to provider with **incremental** scopes
   (`include_granted_scopes=true`, `access_type=offline`, `prompt=consent` first time).
2. Callback validates `state`, exchanges code server-side, reads `sub`/email, upserts `integration_accounts`, encrypts
   tokens into `integration_secrets`, audits `integration.connect`.
   For Google in Testing mode also set `refresh_token_expires_at = now() + 7 days` on every (re)consent.
3. Token use: `getAccessToken(accountId)` refreshes if `token_expires_at < now()+60s` (single-flight per account via
   `SELECT … FOR UPDATE` in an RPC or optimistic `updated_at` check); `invalid_grant` → `status=expired`, audit, UI banner.
4. Disconnect: revoke at provider (best effort), delete secrets row, `status=disconnected`, keep `external_references` (history).
5. Reconnect (Google weekly): same scopes, `prompt=consent`, reuses the account row and `sync_state` (incremental sync
   resumes), revokes the superseded refresh token (Google keeps max 100 per client+account and silently drops the oldest).

Tokens never reach the browser, never logged, never in API responses.

## 4. Adapters

### Google Calendar (Phase 2)
- Scope: `https://www.googleapis.com/auth/calendar.events` + `calendar.calendarlist.readonly` (calendar list). Not full `calendar`, not `calendar.readonly`.
- Operations: list (incremental via `syncToken`), get, insert, patch, cancel/delete. Store `event.id` + `etag` in `external_references(external_type=calendar_event)`.
- Sync (no background jobs until P8): on-demand + on dashboard load if `last_synced_at > 10 min`; window −30 d / +180 d; `singleEvents=true` (recurring series expanded to instances). `410 Gone` → full resync of window.
- Ownership/conflicts (ADR-014): events created in the OS are pushed to Google (`sync_status=pending_push → synced`). Events created in Google are imported as OS rows (so the OS can reason over them) with link. On conflict, compare `remote_updated_at` vs OS `updated_at`: **last writer wins per event**, loser version written to audit. Deleted in Google → OS event `status=cancelled`, `sync_status=deleted_remote`.
- Push notifications (`events.watch`) only in Phase 8; they just trigger the same incremental sync (idempotent by nature).

### Gmail (Phase 4)
- Scopes (added incrementally at Phase 4; final choice at Phase 4 kickoff, ADR-013):
  | Option | Scopes | Gives | Class |
  |---|---|---|---|
  | **Default** | `gmail.readonly` + `gmail.compose` | `q` search, read bodies/threads, drafts, send | restricted |
  | Metadata-only | `gmail.metadata` + `gmail.send` | headers/labels only; no bodies, no `q` search, no drafts | restricted + sensitive |
  | Send-only | `gmail.send` | send only | sensitive |
  Never `https://mail.google.com/` or `gmail.modify`. Restricted scopes are fine in Testing mode (no verification) but
  would require verification + CASA if the app were ever published (risks R-03).
- Operations: search (`q`), get message, get thread, create draft, send draft, reply (thread id + `In-Reply-To`).
- Nothing mirrored. Search/read results are returned live, marked untrusted for AI. OS-initiated drafts/sends logged in `email_messages(provider=gmail)`; linking a thread to a person/task creates `external_references(gmail_thread)`.
- Sending: `gmail.send` scope + confirmation for non-session actors + `Idempotency-Key`.

### Notion (Phase 5)
- Auth: OAuth public integration (consistent with token vault) or internal integration token pasted in Settings and stored encrypted (ADR-013). Page access is whatever the owner shares with the integration.
- Operations: search, get page (blocks → markdown, bounded depth), create page, update properties/append blocks.
- Link: `external_references(entity=project|note|task, external_type=notion_page)`. Notion content is not copied into `notes` unless the owner explicitly imports (then `source_url` = Notion URL).

### GitHub (Phase 5; webhooks Phase 8)
- v1: fine-grained PAT (read-only: metadata, issues, pull requests, contents:read, deployments) stored encrypted. Move to a GitHub App when webhooks/multi-repo installs are needed (ADR-013).
- Operations: list repos, get/list issues & PRs, list commits for a PR/branch, list deployments. Link issues/PRs/deployments to tasks/projects via `external_references`, caching number/title/state/url in `metadata`, refreshed on read if older than 15 min.
- No wholesale mirroring (spec §14).

### Resend (Phase 4)
- App-level API key per environment (`RESEND_API_KEY`) — it is HOWL LAB's sending infrastructure, not a user account; no `integration_accounts` row required (a row may be created for health display).
- Send path: `outreach.send` → create `email_messages(status=queued)` → Resend `POST /emails` with `Idempotency-Key` header = message id → store `provider_message_id`, `status=sent`.
- Pre-send checks (domain logic): recipient not `email_opt_out_at`, lead not `do_not_contact`, campaign `active`, unsubscribe link + `List-Unsubscribe` header present for cold email, daily send cap.
- Sending domain: dedicated subdomain (e.g. `mail.<domain>`) with SPF/DKIM/DMARC; never cold-email from the root domain.
- Events via webhook → `email_events`; bounce/complaint → set `email_opt_out_at`, stop enrollment.

## 5. Webhooks (spec §23)
Route: `/api/webhooks/<provider>` (Node runtime, raw body).
1. Verify signature **before parsing** (Resend: Svix headers + `RESEND_WEBHOOK_SECRET`; GitHub: `X-Hub-Signature-256` HMAC; Google Calendar: `X-Goog-Channel-Token` = `GOOGLE_WEBHOOK_TOKEN` + known channel id). Fail → 401, logged, no body stored.
2. Claim the delivery: `INSERT INTO webhook_deliveries (provider, delivery_id, …) ON CONFLICT (provider, delivery_id)
   DO UPDATE SET attempts = webhook_deliveries.attempts + 1 WHERE webhook_deliveries.status = 'failed' OR (webhook_deliveries.status = 'received' AND webhook_deliveries.received_at < now() - interval '5 minutes') RETURNING id`.
   No row returned ⇒ already received/processed ⇒ 200 immediately. A `failed` (or stuck in-flight >5 min) delivery is re-claimed on redelivery.
   delivery_id: Resend `svix-id`; GitHub `X-GitHub-Delivery`; Google `X-Goog-Channel-ID:X-Goog-Message-Number`.
3. Process synchronously (small payloads) with domain-level idempotency as second guard (e.g. `email_events` unique `provider_event_id`; calendar sync is state-based).
4. Mark `processed` (→ 200) or `failed` + error (→ 5xx so the provider retries).
5. Payloads stored redacted (no email bodies), 30-day retention (P8 job).

## 6. Health & observability
`GET /api/v1/integrations` returns per account: status, `last_synced_at`, `last_error`, token expiry,
`refresh_token_expires_at` + `reauth_due_in` (Google Testing mode), recent failure count (from audit). Dashboard banner
"Reconnect Google" from T-48 h; Phase 8 daily health-check cron notifies at T-24 h and on `invalid_grant`. Adapter calls log provider, operation, latency, status code, request id — never tokens or bodies.
