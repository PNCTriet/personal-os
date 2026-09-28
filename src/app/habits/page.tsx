import type { Metadata } from "next";
import { Repeat } from "lucide-react";
import { requireScope } from "@/lib/session";
import { addDays, todayISO } from "@/lib/dates";
import { getPreview, DOMAIN_PHASE } from "@/modules/preview";
import { PageHeader } from "@/components/ui/page";
import { phaseLabel, previewEmpty } from "@/components/ui/preview";

export const metadata: Metadata = { title: "Habits" };
export const dynamic = "force-dynamic";

export default async function HabitsPage() {
  const scope = await requireScope();
  const habits = getPreview(scope).habits;
  const today = todayISO(scope.ctx.timezone);
  const days = Array.from({ length: 7 }, (_, i) => addDays(today, i - 6));
  const wd = (iso: string) => new Intl.DateTimeFormat("en-US", { weekday: "narrow", timeZone: "UTC" }).format(new Date(`${iso}T00:00:00Z`));
  return (
    <>
      <PageHeader title="Habits" subtitle="Last 7 days · reminders and streaks need scheduled jobs" phase={phaseLabel(scope.ctx.mode === "demo", DOMAIN_PHASE.habits)} />
      <div className="panel">
        {habits.length === 0 ? previewEmpty(Repeat, "habits", DOMAIN_PHASE.habits, false) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Habit</th><th style={{ width: 110 }}>Cadence</th>
                  {days.map((d) => <th key={d} style={{ width: 38, textAlign: "center" }} title={d}>{wd(d)}</th>)}
                  <th className="num" style={{ width: 90 }}>Streak</th><th className="num" style={{ width: 90 }}>7-day</th>
                </tr>
              </thead>
              <tbody>
                {habits.map((h) => (
                  <tr key={h.id}>
                    <td style={{ fontWeight: 600 }}>{h.name}</td>
                    <td className="muted">{h.cadence}</td>
                    {h.last7.map((done, i) => (
                      <td key={i} style={{ textAlign: "center", padding: 0 }}>
                        <span aria-label={done ? "Done" : "Missed"} style={{ display: "inline-block", width: 14, height: 14, borderRadius: 9999, background: done ? "var(--accent)" : "transparent", border: done ? "0" : "1.5px solid var(--track)" }} />
                      </td>
                    ))}
                    <td className="num">{h.streak} {h.streak === 1 ? "day" : "days"}</td>
                    <td className="num muted">{Math.round((h.last7.filter(Boolean).length / 7) * 100)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
