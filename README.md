# PERSONAL OS

API-first personal operating system for one owner — the Founder of HOWL LAB. It centralizes work, time, finance,
relationships, communication, knowledge and memory in one Postgres source of truth, and exposes them through a
versioned REST API and an MCP tool layer, so AI agents can read authorized context and perform authorized, audited
actions. External services (Google Calendar, Gmail, Notion, GitHub, Resend) are replaceable adapters, not sources of truth.

**Stack:** Next.js (App Router, Route Handlers) · TypeScript strict · Tailwind + shadcn/ui · Supabase (Postgres, Auth, RLS) · Zod · Vercel · MCP.
**Shape:** modular monolith. No microservices, queues, or Redis until a concrete requirement appears.

## Status: Phase 0 — Architecture (partially approved) → Phase 1 planned

No application code exists yet, on purpose (spec §37). On 2026-09-29 the Founder accepted ADR-003, 012, 013, 015 and 017.
Still pending Founder: ADR-001, 002, 006 (block Phase 1 start), ADR-007, 009, 014 (block Phases 2–3). See
[docs/decisions.md](docs/decisions.md). Phase 1 execution plan: [docs/phase-1-plan.md](docs/phase-1-plan.md).

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
| [docs/roadmap.md](docs/roadmap.md) | Phases 0–8 (+ 1.5 MCP slice) |
| [docs/phase-1-plan.md](docs/phase-1-plan.md) | Executable Phase 1 plan (`HOWL-POS-P1-Txx`), estimates, risks, Founder inputs |
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
