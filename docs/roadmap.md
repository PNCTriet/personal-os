# Roadmap

Project codes for Personal OS itself: one per phase, **`HOWL-POS-P1`**, `HOWL-POS-P2`, … (dogfooding the identity rules;
task codes `HOWL-POS-P1-Txx`).
Each phase ends with: migrations applied, tests green, docs updated, audit/permission behavior verified (spec §35),
Founder demo. Estimates assume 1 engineer + AI assistance; they are sizing, not promises.

| Phase | Goal | Exit criteria | Size |
|---|---|---|---|
| **0 Architecture** | This doc set | Founder approves ADRs in decisions.md | ADR-003/012/013/015/017 accepted 2026-09-29; 001/002/006/007/009/014 pending |
| **1 Core OS** | Auth, profile, projects, tasks, deps, audit, API keys, approvals, basic dashboard, `/api/v1` foundation | Founder runs work from `/tasks` daily; a script with an API key creates/completes tasks; activity shows who did what | 4–5 wks (22 d + contingency; was 2–3 wks, re-estimated in phase-1-plan.md) |
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

## Phase 1 breakdown
Moved to **[phase-1-plan.md](phase-1-plan.md)**: 22 tasks `HOWL-POS-P1-T01…T22` with deliverables, acceptance criteria,
dependencies, estimates, risks, and what the Founder must supply.

## Explicitly not in Phase 1
Calendar, finance, people UI, integrations, MCP (Phase 1.5 slice, ADR-017), background jobs, realtime, file uploads, mobile.
