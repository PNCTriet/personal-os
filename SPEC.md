# PERSONAL OS — MASTER ENGINEERING SPECIFICATION (v0.1, Architecture / Foundation)
(Provided by the Founder of HOWL LAB. Condensed faithfully; every requirement preserved.)

## 1. Vision
API-first Personal Operating System for a single user. Not a simple task manager/CRM/finance tracker/Notion clone. Personal infrastructure centralizing: personal life, work, projects, tasks, time/calendar, finance, communication, relationships, fitness, learning, knowledge, personal memory, AI interactions, external services.
AI systems (ChatGPT, future agents) must be able to: read authorized data; understand entity relationships; query cross-domain; reason over personal context; execute authorized actions; update the OS; interact with third-party services; record every important action in an audit trail. Must stay useful if any AI provider is replaced. The Personal OS owns core data and state.

## 2. Core principle
Supabase = source of truth. Next.js = application + UI + API layer. Integration layer = external systems. AI/MCP = intelligence + control layer.
External services are NOT source of truth for core entities (Google Calendar = external execution; Gmail = external communication; Notion = external knowledge; GitHub = external dev; Resend = external email delivery). OS stores references + sync state.

## 3. Stack
Next.js (App Router, Route Handlers), TypeScript, React, Tailwind, shadcn/ui where appropriate, Supabase (Postgres, Auth), Vercel, Zod, type-safe service layer, MCP/AI tool layer, OAuth 2.0 for integrations.
Future (do NOT introduce prematurely): background jobs, webhooks, queue, cron, realtime, object storage.
Do NOT introduce NestJS, microservices, Kafka, Redis, Kubernetes, event buses without concrete requirement. Modular monolith.

## 4. Architecture layers
UI -> API/Route Handlers -> Application Services -> Domain Logic -> Repository/Data Access -> Supabase.
Integrations isolated: Application Services -> Integration Services -> External Adapters -> External APIs.
AI: AI/MCP Tool -> Permission Check -> Application Service -> Domain Logic -> DB/Integration. AI MUST NOT run arbitrary SQL on production.

## 5. Suggested repo structure (refine after analysis; avoid unnecessary abstraction)
app/(dashboard)/{dashboard,projects,tasks,finance,calendar,relationships,settings}; app/api/v1/{projects,tasks,finance,calendar,relationships,communication,integrations,ai}; components/; lib/{supabase,auth,validation,permissions,logging,integrations/{google/{auth,calendar,gmail},notion,github,resend},ai/{tools,mcp,permissions}}; services/{project,task,finance,calendar,relationship,communication,knowledge,memory}.service.ts; repositories/; types/; supabase/{migrations,seed,functions}; docs/{architecture,domain-model,api,security,integrations,ai-tools}.md; tests/; .env.example; README.md

## 6. Core domains
- Personal: profile, preferences, goals, habits, personal notes, life events.
- Work: projects, tasks, clients, companies, meetings, deliverables, work logs.
- Finance: accounts, transactions, debts, receivables, budgets, financial goals, subscriptions, cashflow. Calculations MUST be deterministic, never AI-generated.
- Time: calendar events, time blocks, routines, appointments, availability.
- Relationships (first-class, not a contact list): friends, family, romantic, professional, clients, acquaintances. Entities: Person, Relationship, Interaction, Important Date, Preference, Shared Experience, Follow-up.
- Communication: Gmail, Resend, cold email, campaigns, sequences, follow-ups, history. Resend = outbound business/cold email; Gmail = mailbox interaction. Keep separate.
- Development/Growth: fitness, running, learning, languages, skills, career, goals, habits.
- Knowledge: notes, research, documents, bookmarks, topics, sources, Notion references.
- Memory: structured (preferences, facts, people context, goals, historical context, life events). No uncontrolled global memory blob.

## 7. Identity
Stable internal UUID for every important entity; optional human-readable codes (project HOWL-VTO-01, tasks HOWL-VTO-01-T01...). Never titles as identifiers. External IDs stored for integrations (google_event_id, google_message_id, notion_page_id, github_issue_id, github_pr_id). Never invent external IDs.

## 8. Relationships
Project -> Task -> Calendar Event. A task may reference project, calendar event, GitHub issue, Notion page, related person, related company.

## 9. DB principles
Postgres via Supabase. Major tables: id, created_at, updated_at; where applicable created_by, updated_by, archived_at, deleted_at. FKs, indexes, constraints, enums/constrained values, DB-level integrity. Prefer calculation over duplicated derived data.

## 10. Initial core tables (design schema first, don't implement all; avoid unnecessary tables; review before migrations)
users, profiles, projects, tasks, task_dependencies, calendar_events, accounts, finance_transactions, debts, receivables, financial_goals, people, relationships, interactions, important_dates, notes, memories, contacts/leads, email_campaigns, email_messages, email_events, follow_ups, integrations, integration_accounts, external_references, ai_actions, audit_logs.

## 11. Integration model
integrations (provider, type, status, scopes, metadata); integration_accounts (integration_id, user_id, external_account_id, access token ref, refresh token ref, token expiry, metadata). Never expose OAuth secrets to client; no plaintext secrets unless protected; secure server-side storage.

## 12. Google
Calendar: get/create/update/cancel-delete/sync events, store external event ID. Gmail: search, read message, read thread, draft, send, optionally reply. Sending is permission-controlled.

## 13. Notion
Knowledge integration, not source of truth. Search/read/create/update pages; link to OS entity (project.notion_page_id).

## 14. GitHub
Repos, issues, PRs, commits, deployment refs. Store external IDs and useful synced metadata; don't mirror GitHub wholesale.

## 15. Resend
Transactional, cold email, campaigns, sequences, follow-ups, delivery status, open/click, bounce. Lead -> Campaign -> Sequence -> Email Message -> Resend -> Delivery Events. Sending auditable; cold email never bypasses permissions.

## 16. API
Versioned /api/v1/... Consistent response shape. Zod. Validate input, authn, authz, resource ownership, integration permissions. Examples: CRUD /api/v1/tasks(/:id); GET /finance/summary, GET/POST /finance/transactions; GET/POST /calendar/events; GET /relationships(/:id); GET /communication/leads; POST /communication/email/send. Designed for future external consumers.

## 17. AI tool layer
Semantic tools, no unrestricted access. Query: get_today, get_tasks, get_project, get_finance_summary, get_calendar, search_email, search_notes, get_person. Action: create_task, update_task, complete_task, create_project, record_transaction, schedule_event, update_event, draft_email, send_email, create_note, update_note. Relationship: get_person, get_relationship_context, log_interaction, create_follow_up. Tools call application services; never SQL wrappers.

## 18. MCP
Expose selected capabilities (get_today, get_tasks, create_task, complete_task, get_project, get_finance_summary, record_transaction, get_calendar, schedule_event, search_email, draft_email, send_email, search_notion, get_person, log_interaction). Same authorization layer as REST; no separate security model.

## 19. Permissions
Domain/action scopes: tasks.read/write, finance.read/write, calendar.read/write, gmail.read/draft/send, relationships.read/write, memory.read/write, integrations.manage. Action categories READ/WRITE/DELETE/EXECUTE. Explicit confirmation for sensitive ops: send email, delete data, financial actions, sensitive relationship data, external destructive actions.

## 20. Security
Server-side secrets only; tokens never in browser; validate all input; authz on every protected resource; Supabase RLS where applicable; audit sensitive actions; never log tokens/passwords; minimize sensitive data exposure; rate limit public endpoints; scoped API keys with rotate/revoke; separate dev/prod credentials. Never trust client or AI-generated arguments.

## 21. API keys
e.g. pk_live_xxxxx. Fields: name, hashed secret, scopes, created_at, expires_at, last_used_at, revoked_at. Sensitive scopes need explicit approval.

## 22. Audit
audit_logs and/or ai_actions: actor_type, actor_id, source, action, entity_type, entity_id, input, result, status, created_at. Must answer "What did Ivan/AI do today?"

## 23. Webhooks/events
Google Calendar, Resend, GitHub webhooks. Idempotent, retry-safe, no duplicates on redelivery.

## 24. Automation (future)
Task due -> reminder; email received -> AI classification -> follow-up task; event approaching -> prepare context; subscription due -> finance notification; important date approaching -> reminder. Explicit, auditable, controllable.

## 25. Privacy
Classification PUBLIC / PRIVATE / SENSITIVE. AI access respects classification; sensitive relationship data not exposed via generic search; needs explicit scoped access.

## 26. Memory model
id, user_id, person_id, category, content, importance, confidence, source, valid_from, valid_until, created_at, updated_at. Supports expiration/correction; time-aware.

## 27. Life timeline
Unified timeline derived from domain events (project created, task completed, payment received, workout, meeting, interaction, life event, learning milestone), not duplicated manually.

## 28. Frontend
Minimal. Pages: /, /projects, /tasks, /finance, /calendar, /relationships, /settings. Dashboard = Command Center (TODAY, PRIORITIES, UPCOMING, FINANCE, PROJECTS, FOLLOW-UPS, AI COMMAND). No excessive UI before domain model is stable.

## 29. AI Command Center (eventual)
"What should I do today?", "What am I forgetting?", "How much can I spend this week?", "What projects are blocked?", "Who should I follow up with?", "What emails need attention?", "Schedule my afternoon." Grounded in real data; never fabricate.

## 30. Data ownership
Provider-independent; integrations are replaceable adapters.

## 31. Observability
Structured logs, error tracking, integration health, API request logs, audit logs, webhook logs. No secrets in logs.

## 32. Testing
Unit: domain logic, finance calcs, permissions, validation, services. Integration: Supabase repositories, API routes, adapters. Deterministic tests for critical AI actions. AI is never source of truth for business rules.

## 33. Dev principles
TS strict, small modules, explicit types, runtime validation, clear domain boundaries, no unnecessary abstraction, no duplicated business logic, no DB or third-party calls from UI components, no client secrets, no title identity, no uncontrolled AI access, no premature microservices. Boring maintainable engineering.

## 34. Phases
0 Architecture (docs, domain model, ERD, schema proposal, permission model, API contract, integration + AI tool architecture; no major UI). 1 Core OS (auth, user, projects, tasks, activity logs, API keys, basic dashboard). 2 Calendar (domain, Google OAuth, Calendar integration, sync, task->calendar). 3 Finance. 4 Communication (people, companies, leads, Gmail, Resend, cold email, follow-ups, audit). 5 Knowledge (notes, Notion, documents, research, external refs). 6 Relationships (people, relationships, interactions, important dates, context, memory). 7 AI (tool registry, MCP, permission-aware tools, ai_actions, audit, context retrieval, command center). 8 Automation (jobs, webhooks, event processing, follow-ups, notifications).

## 35. Definition of done
Schema, validation, authorization, service logic, API where appropriate, tests, audit behavior defined, integration isolated, errors handled, docs updated, AI exposure considered, sensitive actions protected.

## 36. Engineering operating rules
Before significant features: inspect repo, understand architecture, identify domains/schema/API/security/integration impact, propose plan, ask only when necessary, then implement. No blind mass codegen; no rewriting working architecture without reason; no new infra without reason. DB: migrations, preserve compatibility, document breaking changes. APIs: backward compatible, version breaking changes. Integrations: isolate provider code, store external IDs, handle retries, expired creds, rate limits, webhook duplication. AI tools: reuse services, apply permissions, validate, log sensitive actions, never bypass domain rules.

## 37. FIRST TASK
Do NOT build the app. Analyze and produce: 1 final repo architecture; 2 domain-driven entity model; 3 initial PostgreSQL schema; 4 ERD in Mermaid; 5 API contract; 6 permission model; 7 integration architecture; 8 AI/MCP architecture; 9 security architecture; 10 env var specification; 11 development roadmap; 12 technical risks; 13 architectural decisions to lock before coding. Then wait for approval before large implementation.

## 38. North star
AI/Ivan -> MCP/API -> Personal OS (Next.js) -> Services/Domain Logic -> Supabase (source of truth) -> Google (Calendar/Gmail), Notion, GitHub, Resend. User owns data; controlled AI capabilities; replaceable integrations; evolve into a personal API platform. Longevity, privacy, extensibility, AI-native. Don't over-engineer v1.
