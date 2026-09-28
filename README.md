# PERSONAL OS

API-first personal operating system for one owner — the Founder of HOWL LAB. It centralizes work, time, finance,
relationships, communication, knowledge and memory in one Postgres source of truth, and exposes them through a
versioned REST API and an MCP tool layer, so AI agents can read authorized context and perform authorized, audited
actions. External services (Google Calendar, Gmail, Notion, GitHub, Resend) are replaceable adapters, not sources of truth.

**Stack:** Next.js (App Router, Route Handlers) · TypeScript strict · Tailwind + shadcn/ui · Supabase (Postgres, Auth, RLS) · Zod · Vercel · MCP.
**Shape:** modular monolith. No microservices, queues, or Redis until a concrete requirement appears.

## Status: Phase 0 — Architecture (awaiting Founder approval)

No application code exists yet, on purpose (spec §37). This repo currently holds the architecture, schema proposal and
decisions to approve before Phase 1. Next step: Founder reviews the ★ decisions in [docs/decisions.md](docs/decisions.md).

## Documents

| Doc | Contents |
|---|---|
| [SPEC.md](SPEC.md) | Master engineering spec v0.1 (input) |
| [docs/architecture.md](docs/architecture.md) | Layers, repo layout, module boundaries, request lifecycle, environments, env var spec |
| [docs/domain-model.md](docs/domain-model.md) | Bounded contexts, entities, identity & code rules, data classification |
| [docs/schema.md](docs/schema.md) | Table-by-table rationale, cuts/merges vs spec, RLS, soft delete |
| [supabase/migrations/0000_proposed_schema.sql](supabase/migrations/0000_proposed_schema.sql) | **PROPOSAL** schema (validated, not applied) |
| [docs/erd.md](docs/erd.md) | Mermaid ERDs |
| [docs/api.md](docs/api.md) | `/api/v1` contract; Phase 1 endpoints in detail |
| [docs/security.md](docs/security.md) | Scopes, operation registry, confirmation flow, auth, RLS, tokens, API keys, audit, rate limits |
| [docs/integrations.md](docs/integrations.md) | Adapter architecture, OAuth, Google/Gmail/Notion/GitHub/Resend, webhooks |
| [docs/ai-tools.md](docs/ai-tools.md) | Tool registry, MCP, permissions, ai_actions, grounding |
| [docs/roadmap.md](docs/roadmap.md) | Phases 0–8, Phase 1 task breakdown (`HOWL-POS-01-Txx`) |
| [docs/risks.md](docs/risks.md) | Technical risks and mitigations |
| [docs/decisions.md](docs/decisions.md) | ADRs to lock before coding, with open questions |
| [.env.example](.env.example) | Environment variables (no secrets) |

## Validation

```bash
# Schema: applies stub + proposal + behavioural smoke test to a scratch PostgreSQL 15+
PGHOST=/var/run/postgresql ./scripts/validate-schema.sh

# Diagrams: renders every mermaid block (needs @mermaid-js/mermaid-cli)
./scripts/validate-mermaid.sh
```

Owner: HOWL LAB · Founder: Howls · Technical Director: Ivan.
