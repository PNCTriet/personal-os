/**
 * Read-only preview types for domains whose backend is not built yet.
 * Field names follow docs/schema.md so the pages can switch to real repositories later.
 * Money: VND has no minor unit, so amounts are whole đồng (schema: *_minor bigint, currency 'VND').
 */
export interface FinanceAccount { id: string; name: string; kind: "bank" | "savings" | "cash" | "ewallet" | "credit"; institution: string | null; currency: "VND"; balance: number }
export interface FinanceTransaction { id: string; occurred_on: string; description: string; category: string; account: string; amount: number; kind: "income" | "expense" | "transfer"; counterparty: string | null }
export interface Budget { id: string; category: string; limit: number; spent: number }
export interface Debt { id: string; direction: "receivable" | "payable"; counterparty: string; principal: number; outstanding: number; due_on: string | null; note: string }
export interface Person { id: string; name: string; company: string | null; role: string | null; email: string | null; relationship: "client" | "partner" | "friend" | "family" | "lead" | "vendor"; tags: string[]; last_contacted_on: string | null; reconnect_every_days: number | null }
export interface EmailThread { id: string; from: string; subject: string; snippet: string; received_at: string; label: "Clients" | "Partners" | "Personal" | "Receipts" | "Newsletters"; unread: boolean }
export interface Campaign { id: string; name: string; status: "draft" | "active" | "paused" | "completed"; steps: number; enrolled: number; sent: number; opened: number; replied: number; updated_on: string }
export interface Note { id: string; title: string; excerpt: string; kind: "note" | "research" | "bookmark" | "document"; tags: string[]; updated_at: string }
export interface DocumentRef { id: string; title: string; source: "Notion" | "Google Drive" | "GitHub" | "Link"; linked_to: string | null; updated_on: string }
export interface Goal { id: string; title: string; area: "Finance" | "Fitness" | "Learning" | "Career" | "Personal"; current: number; target: number; unit: string; due_on: string }
export interface Habit { id: string; name: string; cadence: "Daily" | "Weekdays" | "3× week" | "Weekly"; streak: number; last7: boolean[] }
export interface Memory { id: string; content: string; kind: "preference" | "fact" | "context" | "decision"; subject: string; source: "manual" | "ai_command" | "email" | "note"; confidence: number; valid_from: string }
export interface CalendarEvent { id: string; title: string; starts_at: string; ends_at: string; calendar: "Work" | "Personal" | "Focus"; location: string | null }
export interface AiApproval { id: string; tool: string; summary: string; client: "Cursor" | "ChatGPT" | "Claude"; risk: "low" | "medium" | "high"; requested_at: string; expires_at: string }
export interface ApiKeyRow { id: string; name: string; prefix: string; scopes: string[]; last_used_at: string | null; created_on: string; kind: "api_key" | "oauth_grant" }
export interface Integration { id: string; provider: string; purpose: string; phase: string; status: "connected" | "not_connected" | "planned" }

export interface PreviewData {
  accounts: FinanceAccount[];
  transactions: FinanceTransaction[];
  budgets: Budget[];
  debts: Debt[];
  people: Person[];
  inbox: EmailThread[];
  campaigns: Campaign[];
  notes: Note[];
  documents: DocumentRef[];
  goals: Goal[];
  habits: Habit[];
  memories: Memory[];
  events: CalendarEvent[];
  approvals: AiApproval[];
  apiKeys: ApiKeyRow[];
}

/** Phase in which each domain gets a real backend (docs/roadmap.md). */
export const DOMAIN_PHASE = {
  calendar: 2, finance: 3, people: 4, inbox: 4, campaigns: 4, notes: 5, documents: 5,
  goals: 3, habits: 8, memory: 6, integrations: 2, apiKeys: 1, approvals: 1.5,
} as const;
