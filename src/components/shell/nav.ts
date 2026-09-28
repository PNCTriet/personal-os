import type { MessageKey } from "@/lib/i18n";

/** Sidebar information architecture, grouped by the spec's domains (SPEC.md §2, docs/domain-model.md). */
export type IconName =
  | "dashboard" | "today" | "calendar" | "projects" | "tasks" | "transactions" | "accounts" | "budgets" | "debts"
  | "people" | "companies" | "inbox" | "campaigns" | "notes" | "documents" | "goals" | "habits" | "memory"
  | "integrations" | "keys" | "audit";

export interface NavItem { href: string; label: MessageKey; icon: IconName; phase?: string; countKey?: "tasks" | "today" | "inbox" | "approvals" }
export interface NavGroup { label: MessageKey | null; items: NavItem[] }

export const NAV: NavGroup[] = [
  { label: null, items: [{ href: "/", label: "nav.dashboard", icon: "dashboard" }] },
  { label: "group.planning", items: [
    { href: "/today", label: "nav.today", icon: "today", countKey: "today" },
    { href: "/calendar", label: "nav.calendar", icon: "calendar", phase: "P2" },
  ] },
  { label: "group.work", items: [
    { href: "/projects", label: "nav.projects", icon: "projects" },
    { href: "/tasks", label: "nav.tasks", icon: "tasks", countKey: "tasks" },
  ] },
  { label: "group.finance", items: [
    { href: "/finance/transactions", label: "nav.transactions", icon: "transactions", phase: "P3" },
    { href: "/finance/accounts", label: "nav.accounts", icon: "accounts", phase: "P3" },
    { href: "/finance/budgets", label: "nav.budgets", icon: "budgets", phase: "P3" },
    { href: "/finance/debts", label: "nav.debts", icon: "debts", phase: "P3" },
  ] },
  { label: "group.relationships", items: [
    { href: "/people", label: "nav.people", icon: "people", phase: "P4" },
    { href: "/companies", label: "nav.companies", icon: "companies" },
  ] },
  { label: "group.communication", items: [
    { href: "/inbox", label: "nav.inbox", icon: "inbox", phase: "P4", countKey: "inbox" },
    { href: "/campaigns", label: "nav.campaigns", icon: "campaigns", phase: "P4" },
  ] },
  { label: "group.knowledge", items: [
    { href: "/notes", label: "nav.notes", icon: "notes", phase: "P5" },
    { href: "/documents", label: "nav.documents", icon: "documents", phase: "P5" },
  ] },
  { label: "group.growth", items: [
    { href: "/goals", label: "nav.goals", icon: "goals", phase: "P3" },
    { href: "/habits", label: "nav.habits", icon: "habits", phase: "P8" },
  ] },
  { label: "group.memory", items: [{ href: "/memory", label: "nav.memory", icon: "memory", phase: "P6" }] },
  { label: "group.settings", items: [
    { href: "/settings/integrations", label: "nav.integrations", icon: "integrations", phase: "P2" },
    { href: "/settings/api-keys", label: "nav.apiKeys", icon: "keys", phase: "P1" },
    { href: "/settings/audit-log", label: "nav.auditLog", icon: "audit" },
  ] },
];

export const ALL_NAV_ITEMS = NAV.flatMap((g) => g.items.map((i) => ({ ...i, group: g.label ?? ("group.overview" as MessageKey) })));

export function isActive(path: string, href: string) {
  return href === "/" ? path === "/" : path === href || path.startsWith(`${href}/`);
}
