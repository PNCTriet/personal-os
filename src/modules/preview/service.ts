import type { Scope } from "@/lib/context";
import { daysBetween, todayISO } from "@/lib/dates";
import type { PreviewData, Person } from "./domain";
import { buildPreview } from "./seed";

const EMPTY: PreviewData = {
  accounts: [], transactions: [], budgets: [], debts: [], people: [], inbox: [], campaigns: [], notes: [], documents: [],
  goals: [], habits: [], memories: [], events: [], approvals: [], apiKeys: [],
};

const cache = new Map<string, PreviewData>();

/**
 * Demo mode: realistic seed data. Supabase mode: empty until each domain's backend ships
 * (pages then show their "Connected in Phase N" empty state).
 */
export function getPreview(scope: Scope): PreviewData {
  if (scope.ctx.mode !== "demo") return EMPTY;
  const key = `${scope.ctx.timezone}:${todayISO(scope.ctx.timezone)}`;
  let data = cache.get(key);
  if (!data) { data = buildPreview(scope.ctx.timezone); cache.clear(); cache.set(key, data); }
  return data;
}

export function reconnectDue(p: Person, today: string): number | null {
  if (!p.reconnect_every_days) return null;
  if (!p.last_contacted_on) return p.reconnect_every_days;
  return daysBetween(p.last_contacted_on, today) - p.reconnect_every_days;
}

export function financeSummary(d: PreviewData, today: string) {
  const month = today.slice(0, 7);
  const monthTx = d.transactions.filter((t) => t.occurred_on.startsWith(month));
  const spend = -monthTx.filter((t) => t.kind === "expense").reduce((s, t) => s + t.amount, 0);
  const income = monthTx.filter((t) => t.kind === "income").reduce((s, t) => s + t.amount, 0);
  const budget = d.budgets.reduce((s, b) => s + b.limit, 0);
  const cash = d.accounts.reduce((s, a) => s + a.balance, 0);
  const receivable = d.debts.filter((x) => x.direction === "receivable").reduce((s, x) => s + x.outstanding, 0);
  const payable = d.debts.filter((x) => x.direction === "payable").reduce((s, x) => s + x.outstanding, 0);
  return { spend, income, budget, cash, receivable, payable };
}
