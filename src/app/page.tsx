import Link from "next/link";
import { AlertTriangle, CalendarClock, CheckCircle2, HandCoins, ListChecks, PieChart, UserRoundCheck, Users, Wallet, Bot } from "lucide-react";
import { requireScope } from "@/lib/session";
import { hourIn, longDate, relativeTime, addDays } from "@/lib/dates";
import { clock, dayKey, pct, vnd, vndCompact } from "@/lib/format";
import { getToday } from "@/modules/today";
import { listProjectsWithStats } from "@/modules/projects";
import { listActivity } from "@/modules/activity";
import { listTasks, isOpen } from "@/modules/tasks";
import { getPreview, financeSummary, reconnectDue } from "@/modules/preview";
import { ActivityList } from "@/components/activity-list";
import { loadLookups } from "@/components/lookups";
import { toTaskItems } from "@/components/task-items";
import { TaskRow } from "@/components/task-row";
import { Avatar, EmptyState, PageHeader, Panel, PhaseHint, Progress } from "@/components/ui/page";

export const dynamic = "force-dynamic";

function greeting(h: number) {
  if (h < 5 || h >= 18) return "Good evening";
  return h < 12 ? "Good morning" : "Good afternoon";
}

export default async function Dashboard() {
  const scope = await requireScope();
  const tz = scope.ctx.timezone;
  const [today, projects, activity, tasks, { lk }] = await Promise.all([
    getToday(scope), listProjectsWithStats(scope), listActivity(scope, { limit: 7 }), listTasks(scope), loadLookups(scope),
  ]);
  const pv = getPreview(scope);
  const fin = financeSummary(pv, today.today);
  const followUps = tasks.filter((t) => isOpen(t) && t.kind === "follow_up" && t.due_on !== null && t.due_on <= addDays(today.today, 7));
  const reconnect = pv.people
    .map((p) => ({ p, due: reconnectDue(p, today.today) }))
    .filter((x) => x.due !== null && x.due > 0)
    .sort((a, b) => (b.due ?? 0) - (a.due ?? 0));
  const events = pv.events.filter((e) => dayKey(e.starts_at, tz) === today.today);
  const agendaTasks = toTaskItems([...today.overdue, ...today.dueToday], lk);
  const activeProjects = projects.filter((p) => p.status === "active" || p.status === "planned");
  const spendRatio = pct(fin.spend, fin.budget);
  const hasFinance = pv.accounts.length > 0;

  const kpis = [
    { label: "Open tasks", icon: ListChecks, value: String(today.counts.open), sub: `${tasks.filter((t) => t.status === "in_progress").length} in progress`, href: "/tasks" },
    { label: "Overdue", icon: AlertTriangle, value: String(today.counts.overdue), sub: today.counts.overdue ? "Needs attention" : "All clear", href: "/today", tone: today.counts.overdue ? "tone-red" : "" },
    { label: "Due today", icon: CalendarClock, value: String(today.counts.dueToday), sub: `${today.upcoming.length} more this week`, href: "/today" },
    { label: "Spend this month", icon: PieChart, value: hasFinance ? vndCompact(fin.spend) : "—", sub: hasFinance ? `${Math.round(spendRatio * 100)}% of ${vndCompact(fin.budget).replace(" ₫", "")} budget` : "Finance in Phase 3", href: "/finance/budgets" },
    { label: "Cash balance", icon: Wallet, value: hasFinance ? vndCompact(fin.cash) : "—", sub: hasFinance ? `${pv.accounts.length} accounts` : "Finance in Phase 3", href: "/finance/accounts" },
    { label: "Owed to you", icon: HandCoins, value: hasFinance ? vndCompact(fin.receivable) : "—", sub: hasFinance ? `You owe ${vndCompact(fin.payable)}` : "Debts in Phase 3", href: "/finance/debts" },
    { label: "Follow-ups due", icon: UserRoundCheck, value: String(followUps.length), sub: "Next 7 days", href: "/tasks?view=follow_up" },
    { label: "Reconnect", icon: Users, value: pv.people.length ? String(reconnect.length) : "—", sub: pv.people.length ? "People past cadence" : "People in Phase 4", href: "/people" },
  ];

  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle={`${longDate(today.today)} · ${greeting(hourIn(tz))}, ${scope.ctx.displayName}.`}
        actions={<><Link href="/today" className="btn btn-plain">Open Today</Link><Link href="/tasks" className="btn btn-plain">All tasks</Link></>}
      />

      <section className="panel kpis" aria-label="Key numbers" style={{ marginBottom: 12, overflow: "hidden" }}>
        {kpis.map((k) => (
          <Link key={k.label} href={k.href} className="kpi">
            <span className="label"><k.icon aria-hidden="true" />{k.label}</span>
            <span className={`t-kpi ${k.tone ?? ""}`}>{k.value}</span>
            <span className="sub">{k.sub}</span>
          </Link>
        ))}
      </section>

      <div className="grid-dash">
        <Panel className="span-5" title="Today’s agenda" action={<Link href="/today" className="link t-small">Open Today</Link>} flush>
          <div className="rows">
            {events.map((e) => (
              <div key={e.id} className="row">
                <span className="tabular t-small" style={{ width: 84, color: "var(--text-2)" }}>{clock(e.starts_at, tz)}–{clock(e.ends_at, tz)}</span>
                <span className="dot" data-tone={e.calendar === "Work" ? "blue" : e.calendar === "Focus" ? "orange" : "green"} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="truncate-1">{e.title}</div>
                  <div className="t-small muted truncate-1">{e.calendar}{e.location ? ` · ${e.location}` : ""}</div>
                </div>
              </div>
            ))}
            {agendaTasks.slice(0, 5).map((t) => <TaskRow key={t.id} t={t} />)}
            {events.length === 0 && agendaTasks.length === 0 && <EmptyState icon={CheckCircle2} title="Nothing scheduled" body="No events or tasks due today." />}
          </div>
          {pv.events.length === 0 && <div className="panel-foot muted">Calendar events connect in Phase 2 (Google Calendar).</div>}
        </Panel>

        <Panel className="span-4" title="Projects" action={<Link href="/projects" className="link t-small">All projects</Link>} flush>
          <div className="rows">
            {activeProjects.map((p) => (
              <Link key={p.id} href={`/projects/${p.code}`} className="row" style={{ alignItems: "center" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                    <span className="truncate-1" style={{ fontWeight: 600 }}>{p.name}</span>
                    <span className="t-small muted tabular">{Math.round(p.stats.progress * 100)}%</span>
                  </div>
                  <div style={{ margin: "6px 0 4px" }}><Progress value={p.stats.progress} label={`${p.name} progress`} /></div>
                  <div className="t-small muted tabular">
                    {p.code} · {p.stats.done}/{p.stats.open + p.stats.done} done{p.stats.overdue ? <span className="tone-red"> · {p.stats.overdue} overdue</span> : ""}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </Panel>

        <Panel className="span-3" title={<span style={{ display: "flex", alignItems: "center", gap: 8 }}><h2 className="t-h2">AI approvals</h2>{pv.approvals.length > 0 && <span className="pill" data-tone="orange">{pv.approvals.length}</span>}</span>} action={<PhaseHint text="Phase 1.5" />} flush>
          {pv.approvals.length === 0 ? <EmptyState icon={Bot} title="No pending approvals" body="AI actions that need your confirmation appear here." /> : (
            <div className="rows">
              {pv.approvals.map((a) => (
                <div key={a.id} className="row" style={{ alignItems: "flex-start", flexDirection: "column", gap: 6 }}>
                  <div style={{ display: "flex", gap: 6, alignItems: "center", width: "100%" }}>
                    <span className="tabular t-small" style={{ fontWeight: 600 }}>{a.tool}</span>
                    <span className="t-small muted" style={{ marginLeft: "auto" }}>{a.client} · {relativeTime(a.requested_at)}</span>
                  </div>
                  <div className="text-2" style={{ lineHeight: 1.35 }}>{a.summary}</div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button className="btn btn-primary" disabled title="Approvals ship with the MCP slice (Phase 1.5)" style={{ height: 24, padding: "0 10px", fontSize: 12 }}>Approve</button>
                    <button className="btn btn-plain" disabled title="Approvals ship with the MCP slice (Phase 1.5)" style={{ height: 24, padding: "0 10px", fontSize: 12 }}>Reject</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>

        <Panel className="span-5" title="Recent transactions" action={<Link href="/finance/transactions" className="link t-small">All transactions</Link>} flush>
          {pv.transactions.length === 0 ? <EmptyState icon={Wallet} title="No transactions yet" phase="Connected in Phase 3" /> : (
            <div className="rows">
              {pv.transactions.filter((t) => t.kind !== "transfer").slice(0, 7).map((t) => (
                <div key={t.id} className="row">
                  <span className="t-small muted tabular" style={{ width: 44 }}>{t.occurred_on.slice(8)}/{t.occurred_on.slice(5, 7)}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="truncate-1">{t.description}</div>
                    <div className="t-small muted truncate-1">{t.category} · {t.account}</div>
                  </div>
                  <span className={`tabular ${t.amount > 0 ? "tone-green" : ""}`} style={{ fontWeight: 600 }}>{vnd(t.amount, { sign: true })}</span>
                </div>
              ))}
            </div>
          )}
        </Panel>

        <Panel className="span-4" title="Activity" action={<Link href="/settings/audit-log" className="link t-small">Audit log</Link>} flush>
          <ActivityList items={activity} />
        </Panel>
        <Panel className="span-3" title="Reconnect" action={<Link href="/people" className="link t-small">People</Link>} flush>
          {pv.people.length === 0 ? <EmptyState icon={Users} title="No people yet" phase="Connected in Phase 4" /> : reconnect.length === 0 ? <EmptyState icon={Users} title="All caught up" /> : (
            <div className="rows">
              {reconnect.slice(0, 6).map(({ p, due }) => (
                <Link key={p.id} href={`/people?q=${encodeURIComponent(p.name)}`} className="row">
                  <Avatar name={p.name} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="truncate-1" style={{ fontWeight: 600 }}>{p.name}</div>
                    <div className="t-small muted truncate-1">{p.company ?? p.relationship}</div>
                  </div>
                  <span className={`t-small tabular ${(due ?? 0) > 14 ? "tone-red" : "tone-orange"}`}>{p.last_contacted_on ? `${due}d late` : "Never"}</span>
                </Link>
              ))}
            </div>
          )}
        </Panel>

      </div>
    </>
  );
}
