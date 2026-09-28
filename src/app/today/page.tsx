import type { Metadata } from "next";
import { CalendarDays } from "lucide-react";
import { requireScope } from "@/lib/session";
import { getI18n } from "@/lib/i18n/server";
import { longDate } from "@/lib/dates";
import { clock, dayKey } from "@/lib/format";
import { getToday } from "@/modules/today";
import { getPreview } from "@/modules/preview";
import { loadLookups } from "@/components/lookups";
import { toTaskItems } from "@/components/task-items";
import { TaskList } from "@/components/task-row";
import { QuickAdd } from "@/components/quick-add";
import { EmptyState, PageHeader, Panel } from "@/components/ui/page";

export const metadata: Metadata = { title: "Today" };
export const dynamic = "force-dynamic";

export default async function TodayPage() {
  const scope = await requireScope();
  const [t, { lk, pickers }, { t: tr, locale }] = await Promise.all([getToday(scope), loadLookups(scope), getI18n()]);
  const events = getPreview(scope).events.filter((e) => dayKey(e.starts_at, scope.ctx.timezone) === t.today);
  const sections = [
    { id: "overdue", title: tr("today.overdue"), items: toTaskItems(t.overdue, lk), empty: tr("today.emptyOverdue") },
    { id: "due", title: tr("today.due"), items: toTaskItems(t.dueToday, lk), empty: tr("today.emptyDue") },
    { id: "progress", title: tr("today.progress"), items: toTaskItems(t.inProgress, lk), empty: tr("today.emptyProgress") },
    { id: "upcoming", title: tr("today.upcoming"), items: toTaskItems(t.upcoming, lk), empty: tr("today.emptyUpcoming") },
  ];
  return (
    <>
      <PageHeader title={tr("nav.today")} subtitle={tr("today.subtitle", { date: longDate(t.today, locale), due: t.counts.dueToday, overdue: t.counts.overdue })} />
      <div className="panel hide-mobile" style={{ padding: 12, marginBottom: 12 }}>
        <QuickAdd id="today-add" projects={pickers.projects} companies={pickers.companies} defaultDue={t.today} compact />
      </div>
      <div className="grid-dash">
        <div className="span-8" style={{ display: "grid", gap: 12, alignContent: "start" }}>
          {sections.map((s) => (
            <Panel key={s.id} title={<h2 className="t-h2" id={s.id}>{s.title} <span className="muted tabular" style={{ fontWeight: 400 }}>{s.items.length || ""}</span></h2>} flush>
              <TaskList items={s.items} empty={s.empty} />
            </Panel>
          ))}
        </div>
        <Panel className="span-4" title={tr("today.schedule")} flush style={{ alignSelf: "start" }}>
          {events.length === 0 ? <EmptyState icon={CalendarDays} title={tr("today.noEvents")} phase={tr("today.calendarLater")} /> : (
            <div className="rows">
              {events.map((e) => (
                <div key={e.id} className="row" style={{ alignItems: "flex-start" }}>
                  <div className="tabular t-small" style={{ width: 44, color: "var(--text-2)", paddingTop: 1 }}>{clock(e.starts_at, scope.ctx.timezone)}</div>
                  <span className="dot" data-tone={e.calendar === "Work" ? "blue" : e.calendar === "Focus" ? "orange" : "green"} style={{ marginTop: 5 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div>{e.title}</div>
                    <div className="t-small muted">{clock(e.starts_at, scope.ctx.timezone)}–{clock(e.ends_at, scope.ctx.timezone)}{e.location ? ` · ${e.location}` : ""}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>
    </>
  );
}
