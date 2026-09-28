import Link from "next/link";
import { AlertTriangle, CalendarClock, CheckCircle2, ListChecks, PieChart, UserRoundCheck, Users, Wallet, Bot } from "lucide-react";
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
import { Avatar, EmptyState, Panel, PhaseHint, Progress } from "@/components/ui/page";
import { MobileMore } from "@/components/ui/mobile-more";
import { getI18n } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

import type { MessageKey } from "@/lib/i18n";

function greeting(h: number): MessageKey {
  if (h < 5 || h >= 18) return "greet.evening";
  return h < 12 ? "greet.morning" : "greet.afternoon";
}

export default async function Dashboard() {
  const scope = await requireScope();
  const tz = scope.ctx.timezone;
  const [today, projects, activity, tasks, { lk }, { t, locale }] = await Promise.all([
    getToday(scope), listProjectsWithStats(scope), listActivity(scope, { limit: 7 }), listTasks(scope), loadLookups(scope), getI18n(),
  ]);
  const pv = getPreview(scope);
  const fin = financeSummary(pv, today.today);
  const followUps = tasks.filter((x) => isOpen(x) && x.kind === "follow_up" && x.due_on !== null && x.due_on <= addDays(today.today, 7));
  const reconnect = pv.people
    .map((p) => ({ p, due: reconnectDue(p, today.today) }))
    .filter((x) => x.due !== null && x.due > 0)
    .sort((a, b) => (b.due ?? 0) - (a.due ?? 0));
  const events = pv.events.filter((e) => dayKey(e.starts_at, tz) === today.today);
  const agendaTasks = toTaskItems([...today.overdue, ...today.dueToday], lk);
  const activeProjects = projects.filter((p) => p.status === "active" || p.status === "planned");
  const spendRatio = pct(fin.spend, fin.budget);
  const hasFinance = pv.accounts.length > 0;
  const { dueToday, overdue, open } = today.counts;

  // Primary tiles are the only ones shown on phones; the rest appear from tablet width up.
  const kpis: { label: string; icon: typeof ListChecks; value: string; href: string; tone?: string; extra?: boolean; sub?: React.ReactNode }[] = [
    { label: t("dash.dueToday"), icon: CalendarClock, value: String(dueToday), href: "/today" },
    { label: t("dash.overdue"), icon: AlertTriangle, value: String(overdue), href: "/today#overdue", tone: overdue ? "tone-red" : "" },
    {
      label: t("dash.spend"), icon: PieChart, value: hasFinance ? vndCompact(fin.spend) : "—", href: "/finance/budgets",
      sub: hasFinance ? <Progress value={spendRatio} tone={spendRatio > 0.9 ? "red" : spendRatio > 0.75 ? "orange" : undefined} label={t("dash.ofBudget", { b: vndCompact(fin.budget) })} /> : null,
    },
    { label: t("dash.open"), icon: ListChecks, value: String(open), href: "/tasks", extra: true },
    { label: t("dash.cash"), icon: Wallet, value: hasFinance ? vndCompact(fin.cash) : "—", href: "/finance/accounts", extra: true },
    { label: t("dash.followUps"), icon: UserRoundCheck, value: String(followUps.length), href: "/tasks?view=follow_up", extra: true },
  ];

  return (
    <>
      <header className="hero">
        <div className="t-label">{longDate(today.today, locale)}</div>
        <h1 className="t-title hero-title">{t(greeting(hourIn(tz)))}, {scope.ctx.displayName}</h1>
        <p className="hero-line">{dueToday + overdue > 0 ? t("dash.summary", { due: dueToday, overdue }) : t("dash.summaryClear")}</p>
      </header>

      <section className="panel kpis" aria-label={t("nav.dashboard")}>
        {kpis.map((k) => (
          <Link key={k.href} href={k.href} className={`kpi${k.extra ? " kpi-extra" : ""}`}>
            <span className="label"><k.icon aria-hidden="true" /><span className="truncate-1">{k.label}</span></span>
            <span className={`t-kpi ${k.tone ?? ""}`}>{k.value}</span>
            {k.sub && <span className="kpi-bar">{k.sub}</span>}
          </Link>
        ))}
      </section>

      <div className="grid-dash">
        <Panel className="span-5" title={t("dash.agenda")} action={<Link href="/today" className="link t-small">{t("common.seeAll")}</Link>} flush>
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
            {events.length === 0 && agendaTasks.length === 0 && <EmptyState icon={CheckCircle2} title={t("dash.nothingScheduled")} body={t("dash.nothingScheduledBody")} />}
          </div>
          {pv.events.length === 0 && <div className="panel-foot muted hide-mobile">{t("dash.calendarLater")}</div>}
        </Panel>

        <MobileMore more={t("common.showMore")} less={t("common.showLess")} hint={t("dash.moreSections")}>
        <Panel className="span-4" title={t("dash.projects")} action={<Link href="/projects" className="link t-small">{t("common.seeAll")}</Link>} flush>
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
                    {p.code} · {t("dash.done", { done: p.stats.done, total: p.stats.open + p.stats.done })}{p.stats.overdue ? <span className="tone-red"> · {t("dash.overdueN", { n: p.stats.overdue })}</span> : ""}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </Panel>

        <Panel className="span-3" title={<span style={{ display: "flex", alignItems: "center", gap: 8 }}><h2 className="t-h2">{t("dash.approvals")}</h2>{pv.approvals.length > 0 && <span className="pill" data-tone="orange">{pv.approvals.length}</span>}</span>} action={<PhaseHint text={t("common.phase", { p: "1.5" })} />} flush>
          {pv.approvals.length === 0 ? <EmptyState icon={Bot} title={t("dash.noApprovals")} /> : (
            <div className="rows">
              {pv.approvals.map((a) => (
                <div key={a.id} className="row" style={{ alignItems: "flex-start", flexDirection: "column", gap: 6 }}>
                  <div style={{ display: "flex", gap: 6, alignItems: "center", width: "100%" }}>
                    <span className="tabular t-small" style={{ fontWeight: 600 }}>{a.tool}</span>
                    <span className="t-small muted" style={{ marginLeft: "auto" }}>{a.client} · {relativeTime(a.requested_at, locale)}</span>
                  </div>
                  <div className="text-2" style={{ lineHeight: 1.35 }}>{a.summary}</div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button className="btn btn-primary" disabled title={t("dash.approvalsSoon")} style={{ height: 24, padding: "0 10px", fontSize: 12 }}>{t("common.approve")}</button>
                    <button className="btn btn-plain" disabled title={t("dash.approvalsSoon")} style={{ height: 24, padding: "0 10px", fontSize: 12 }}>{t("common.reject")}</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>

        <Panel className="span-5" title={t("dash.transactions")} action={<Link href="/finance/transactions" className="link t-small">{t("common.seeAll")}</Link>} flush>
          {pv.transactions.length === 0 ? <EmptyState icon={Wallet} title={t("dash.noTransactions")} phase={t("common.connectedIn", { p: 3 })} /> : (
            <div className="rows">
              {pv.transactions.filter((x) => x.kind !== "transfer").slice(0, 6).map((x) => (
                <div key={x.id} className="row">
                  <span className="t-small muted tabular" style={{ width: 44 }}>{x.occurred_on.slice(8)}/{x.occurred_on.slice(5, 7)}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="truncate-1">{x.description}</div>
                    <div className="t-small muted truncate-1">{x.category} · {x.account}</div>
                  </div>
                  <span className={`tabular ${x.amount > 0 ? "tone-green" : ""}`} style={{ fontWeight: 600 }}>{vnd(x.amount, { sign: true })}</span>
                </div>
              ))}
            </div>
          )}
        </Panel>

        <Panel className="span-4" title={t("dash.activity")} action={<Link href="/settings/audit-log" className="link t-small">{t("common.seeAll")}</Link>} flush>
          <ActivityList items={activity} empty={t("common.noActivity")} locale={locale} />
        </Panel>
        <Panel className="span-3" title={t("dash.reconnect")} action={<Link href="/people" className="link t-small">{t("common.seeAll")}</Link>} flush>
          {pv.people.length === 0 ? <EmptyState icon={Users} title={t("dash.noPeople")} phase={t("common.connectedIn", { p: 4 })} /> : reconnect.length === 0 ? <EmptyState icon={Users} title={t("dash.caughtUp")} /> : (
            <div className="rows">
              {reconnect.slice(0, 6).map(({ p, due }) => (
                <Link key={p.id} href={`/people?q=${encodeURIComponent(p.name)}`} className="row">
                  <Avatar name={p.name} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="truncate-1" style={{ fontWeight: 600 }}>{p.name}</div>
                    <div className="t-small muted truncate-1">{p.company ?? p.relationship}</div>
                  </div>
                  <span className={`t-small tabular ${(due ?? 0) > 14 ? "tone-red" : "tone-orange"}`}>{p.last_contacted_on ? t("dash.daysLate", { n: due ?? 0 }) : t("dash.never")}</span>
                </Link>
              ))}
            </div>
          )}
        </Panel>
        </MobileMore>
      </div>
    </>
  );
}
