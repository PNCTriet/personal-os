# Roadmap

Project codes for Personal OS itself: one per phase, **`HOWL-POS-P1`**, `HOWL-POS-P2`, … (dogfooding the identity rules;
task codes `HOWL-POS-P1-Txx`).
Each phase ends with: migrations applied, tests green, docs updated, audit/permission behavior verified (spec §35),
Founder demo. Estimates assume 1 engineer + AI assistance; they are sizing, not promises.

| Phase | Goal | Exit criteria | Size |
|---|---|---|---|
| **0 Architecture** | This doc set | Founder approves ADRs in decisions.md | ADR-003/012/013/015/017 accepted 2026-09-29; 001/002/006/007/009/014 pending |
| **1 Core OS** | Auth, profile, projects, tasks, deps, audit, API keys, approvals, basic dashboard, `/api/v1` foundation | Founder runs work from `/tasks` daily; a script with an API key creates/completes tasks; activity shows who did what | 4–5 wks (22 d + contingency; was 2–3 wks, re-estimated in phase-1-plan.md) |
| **1.5a MCP slice — Cursor** (ADR-017) | `/api/mcp` Streamable HTTP (stateless), API-key auth, task tools + `get_action_status`, ai_actions logging | Cursor creates/completes tasks via MCP; every call in ai_actions; confirmation path demoed | 3 d |
| **1.5b MCP OAuth — ChatGPT** (ADR-017) | Supabase OAuth 2.1 server (DCR), consent page, protected-resource metadata, JWT verifier, OAuth grants, RLS hardening | ChatGPT developer-mode connector links via OAuth and runs the same tools; grant revocation cuts it off; OAuth token rejected by Data API | 4.5 d (incl. 0.5 d spike; fallback +3–4 d) |
| **2 Calendar** | Calendar domain, Google OAuth + token vault, Calendar adapter, sync, task → time block | Scheduling a task creates a Google event; Google edits appear in OS; weekly reconnect flow works (Testing-mode 7-day refresh tokens, ADR-013) + expiry banner | 2 wks |
| **3 Finance** | Accounts, transactions, transfers, debts/receivables, goals, summary, spendable | Month-end balances match bank to the đồng; all calcs unit-tested; AI expense < 50,000 VND auto-recorded (audited, undoable), ≥ 50,000 gated (ADR-012) | 2 wks |
| **4 Communication** | People, companies, leads, Gmail (search/read/draft/send), Resend, campaigns/sequences, email events webhook | Send a 3-step cold sequence to 5 test leads with suppression + audit; Gmail send needs confirmation from API key | 3 wks |
| **5 Knowledge** | Notes + FTS, Notion adapter, GitHub adapter, external references UI | Link Notion page + GitHub issue to a task and see live metadata | 1–2 wks |
| **6 Relationships** | Relationships, interactions, important dates, memory model, relationship context, timeline | "Who should I follow up with?" answerable from data via service | 2 wks |
| **7 AI** | Remaining tools, Claude as a client (no server change), AI Command Center, confirmation UX, grounding tests | Cursor, ChatGPT and Claude via MCP run spec §18 tools under scopes; every call in ai_actions | 2 wks |
| **8 Automation** | Vercel Cron jobs, webhook-driven processing, reminders, sequences scheduler, purge/retention | Reminders fire for due tasks/important dates; sequences send on schedule; all jobs audited | 2 wks |

Order note: **accepted (ADR-017, amended 2026-09-29)** — a thin MCP slice (task tools only) runs right after Phase 1:
1.5a Cursor (API key), 1.5b ChatGPT (minimal OAuth via Supabase Auth, pulled forward from Phase 7); Claude later.
Phase 1.5 total ≈ 7.5 d + contingency (~2 weeks). Phase 7 shrinks accordingly.

## Phase 1 breakdown
Moved to **[phase-1-plan.md](phase-1-plan.md)**: 22 tasks `HOWL-POS-P1-T01…T22` with deliverables, acceptance criteria,
dependencies, estimates, risks, and what the Founder must supply.

## Explicitly not in Phase 1
Calendar, finance, people UI, integrations, MCP (Phase 1.5a/b, ADR-017), background jobs, realtime, file uploads, mobile.
