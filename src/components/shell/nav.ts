/** Sidebar information architecture, grouped by the spec's domains (SPEC.md §2, docs/domain-model.md). */
export type IconName =
  | "dashboard" | "today" | "calendar" | "projects" | "tasks" | "transactions" | "accounts" | "budgets" | "debts"
  | "people" | "companies" | "inbox" | "campaigns" | "notes" | "documents" | "goals" | "habits" | "memory"
  | "integrations" | "keys" | "audit";

export interface NavItem { href: string; label: string; icon: IconName; phase?: string; countKey?: "tasks" | "today" | "inbox" | "approvals" }
export interface NavGroup { label: string | null; items: NavItem[] }

export const NAV: NavGroup[] = [
  { label: null, items: [{ href: "/", label: "Dashboard", icon: "dashboard" }] },
  { label: "Planning", items: [
    { href: "/today", label: "Today", icon: "today", countKey: "today" },
    { href: "/calendar", label: "Calendar", icon: "calendar", phase: "P2" },
  ] },
  { label: "Work", items: [
    { href: "/projects", label: "Projects", icon: "projects" },
    { href: "/tasks", label: "Tasks", icon: "tasks", countKey: "tasks" },
  ] },
  { label: "Finance", items: [
    { href: "/finance/transactions", label: "Transactions", icon: "transactions", phase: "P3" },
    { href: "/finance/accounts", label: "Accounts", icon: "accounts", phase: "P3" },
    { href: "/finance/budgets", label: "Budgets", icon: "budgets", phase: "P3" },
    { href: "/finance/debts", label: "Debts", icon: "debts", phase: "P3" },
  ] },
  { label: "Relationships", items: [
    { href: "/people", label: "People", icon: "people", phase: "P4" },
    { href: "/companies", label: "Companies", icon: "companies" },
  ] },
  { label: "Communication", items: [
    { href: "/inbox", label: "Inbox", icon: "inbox", phase: "P4", countKey: "inbox" },
    { href: "/campaigns", label: "Campaigns", icon: "campaigns", phase: "P4" },
  ] },
  { label: "Knowledge", items: [
    { href: "/notes", label: "Notes", icon: "notes", phase: "P5" },
    { href: "/documents", label: "Documents", icon: "documents", phase: "P5" },
  ] },
  { label: "Growth", items: [
    { href: "/goals", label: "Goals", icon: "goals", phase: "P3" },
    { href: "/habits", label: "Habits", icon: "habits", phase: "P8" },
  ] },
  { label: "Memory", items: [{ href: "/memory", label: "Memory", icon: "memory", phase: "P6" }] },
  { label: "Settings", items: [
    { href: "/settings/integrations", label: "Integrations", icon: "integrations", phase: "P2" },
    { href: "/settings/api-keys", label: "API keys", icon: "keys", phase: "P1" },
    { href: "/settings/audit-log", label: "Audit log", icon: "audit" },
  ] },
];

export const ALL_NAV_ITEMS = NAV.flatMap((g) => g.items.map((i) => ({ ...i, group: g.label ?? "Overview" })));

export function isActive(path: string, href: string) {
  return href === "/" ? path === "/" : path === href || path.startsWith(`${href}/`);
}
