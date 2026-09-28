import type { Metadata } from "next";
import { CalendarDays } from "lucide-react";
import { requireScope } from "@/lib/session";
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
  const [t, { lk, pickers }] = await Promise.all([getToday(scope), loadLookups(scope)]);
  const events = getPreview(scope).events.filter((e) => dayKey(e.starts_at, scope.ctx.timezone) === t.today);
  const sections = [
    { id: "overdue", title: "Overdue", items: toTaskItems(t.overdue, lk), empty: "Nothing overdue." },
    { id: "due", title: "Due today", items: toTaskItems(t.dueToday, lk), empty: "Nothing else is due today." },
    { id: "progress", title: "In progress", items: toTaskItems(t.inProgress, lk), empty: "Nothing in progress." },
    { id: "upcoming", title: "Next 7 days", items: toTaskItems(t.upcoming, lk), empty: "A quiet week ahead." },
  ];
  return (
    <>
      <PageHeader title="Today" subtitle={`${longDate(t.today)} · ${t.counts.dueToday} due, ${t.counts.overdue} overdue, ${t.inProgress.length} in progress`} />
      <div className="panel" style={{ padding: 12, marginBottom: 12 }}>
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
        <Panel className="span-4" title="Schedule" flush style={{ alignSelf: "start" }}>
          {events.length === 0 ? <EmptyState icon={CalendarDays} title="No events" phase="Calendar connects in Phase 2" /> : (
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
