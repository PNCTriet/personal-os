import type { Metadata } from "next";
import { CalendarDays } from "lucide-react";
import { requireScope } from "@/lib/session";
import { addDays, todayISO } from "@/lib/dates";
import { clock, dayKey } from "@/lib/format";
import { listTasks, isOpen } from "@/modules/tasks";
import { getPreview, DOMAIN_PHASE } from "@/modules/preview";
import { EmptyState, PageHeader } from "@/components/ui/page";
import { phaseLabel } from "@/components/ui/preview";

export const metadata: Metadata = { title: "Calendar" };
export const dynamic = "force-dynamic";
const TONE = { Work: "blue", Focus: "orange", Personal: "green" } as const;

export default async function CalendarPage() {
  const scope = await requireScope();
  const tz = scope.ctx.timezone;
  const today = todayISO(tz);
  const days = Array.from({ length: 7 }, (_, i) => addDays(today, i));
  const [tasks] = await Promise.all([listTasks(scope)]);
  const events = getPreview(scope).events;
  const fmt = (iso: string, o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("en-US", { ...o, timeZone: "UTC" }).format(new Date(`${iso}T00:00:00Z`));
  return (
    <>
      <PageHeader title="Calendar" subtitle="Next 7 days · events and tasks with due dates" phase={phaseLabel(scope.ctx.mode === "demo", DOMAIN_PHASE.calendar)} />
      <div className="panel" style={{ overflow: "hidden" }}>
        <div className="grid grid-cols-1 md:grid-cols-7">
          {days.map((d, i) => {
            const ev = events.filter((e) => dayKey(e.starts_at, tz) === d);
            const due = tasks.filter((t) => isOpen(t) && t.due_on === d);
            return (
              <div key={d} style={{ borderLeft: i ? "1px solid var(--line)" : 0, minHeight: 420, display: "flex", flexDirection: "column", minWidth: 0, overflow: "hidden" }}>
                <div style={{ padding: "10px 10px 8px", borderBottom: "1px solid var(--line)", background: "var(--panel-2)" }}>
                  <div className="t-small muted">{fmt(d, { weekday: "short" })}</div>
                  <div style={{ fontWeight: 600, fontSize: 15, color: d === today ? "var(--accent)" : undefined }} className="tabular">{fmt(d, { day: "numeric" })} {fmt(d, { month: "short" })}</div>
                </div>
                <div style={{ padding: 8, display: "grid", gridTemplateColumns: "minmax(0, 1fr)", gap: 6, alignContent: "start" }}>
                  {ev.map((e) => (
                    <div key={e.id} style={{ borderRadius: 7, padding: "6px 8px", background: "var(--panel-2)", borderLeft: `3px solid var(--${TONE[e.calendar] === "blue" ? "accent" : TONE[e.calendar]})` }}>
                      <div className="t-small tabular muted">{clock(e.starts_at, tz)}–{clock(e.ends_at, tz)}</div>
                      <div style={{ fontWeight: 600, lineHeight: 1.3 }}>{e.title}</div>
                    </div>
                  ))}
                  {due.map((t) => (
                    <div key={t.id} className="t-small" style={{ display: "flex", gap: 6, alignItems: "center", padding: "2px 4px", minWidth: 0 }} title={t.title}>
                      <span style={{ width: 10, height: 10, borderRadius: 9999, border: "1.5px solid var(--muted)", flex: "none" }} />
                      <span className="truncate-1">{t.title}</span>
                    </div>
                  ))}
                  {ev.length === 0 && due.length === 0 && <div className="t-small muted" style={{ padding: 4 }}>Free</div>}
                </div>
              </div>
            );
          })}
        </div>
        {events.length === 0 && <EmptyState icon={CalendarDays} title="No calendar connected" body="Google Calendar sync and task → time block arrive in Phase 2." phase="Connected in Phase 2" />}
      </div>
    </>
  );
}
