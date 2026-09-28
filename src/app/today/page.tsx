import type { Metadata } from "next";
import Link from "next/link";
import { requireScope } from "@/lib/session";
import { longDate } from "@/lib/dates";
import { getToday } from "@/modules/today";
import { Reveal } from "@/components/reveal";
import { SubNav } from "@/components/sub-nav";
import { TaskList } from "@/components/task-row";
import { QuickAdd } from "@/components/quick-add";
import { loadLookups } from "@/components/lookups";

export const metadata: Metadata = { title: "Today" };
export const dynamic = "force-dynamic";

export default async function TodayPage() {
  const scope = await requireScope();
  const [t, { lk, pickers }] = await Promise.all([getToday(scope), loadLookups(scope)]);
  const sections = [
    { id: "overdue", title: "Overdue.", tasks: t.overdue, empty: "Nothing overdue. Nice." },
    { id: "due", title: "Due today.", tasks: t.dueToday, empty: "Nothing else is due today." },
    { id: "progress", title: "In progress.", tasks: t.inProgress, empty: "Nothing in progress." },
    { id: "upcoming", title: "Next 7 days.", tasks: t.upcoming, empty: "A quiet week ahead." },
  ];

  return (
    <>
      <SubNav
        title="Today"
        links={sections.map((s) => ({ href: `#${s.id}`, label: s.title.replace(".", "") }))}
        cta={<Link href="#add" className="btn btn-primary btn-sm">Add task</Link>}
      />
      <section className="tile tile-hero">
        <div className="container" style={{ maxWidth: 820 }}>
          <Reveal>
            <p className="t-caption-strong" style={{ color: "var(--text-muted)", margin: "0 0 8px" }}>{longDate(t.today)}</p>
            <h1 className="t-hero" style={{ margin: 0 }}>Today.</h1>
            <p className="t-lead" style={{ margin: "16px 0 32px", color: "var(--text-secondary)" }}>
              {t.counts.dueToday} due, {t.counts.overdue} overdue, {t.inProgress.length} in progress.
            </p>
          </Reveal>
          <Reveal delay={100} className="card" id="add">
            <QuickAdd id="today-add" projects={pickers.projects} companies={pickers.companies} defaultDue={t.today} />
          </Reveal>
        </div>
      </section>
      {sections.map((s, i) => (
        <section key={s.id} id={s.id} className={`tile ${i % 2 === 0 ? "tile-parchment" : ""}`} style={{ scrollMarginTop: 52, padding: "56px 0" }}>
          <div className="container" style={{ maxWidth: 820 }}>
            <Reveal>
              <h2 className="t-display-md" style={{ margin: "0 0 20px" }}>
                {s.title} <span style={{ color: "var(--text-muted)", fontWeight: 400 }} className="tabular">{s.tasks.length || ""}</span>
              </h2>
            </Reveal>
            <Reveal delay={80}><TaskList tasks={s.tasks} lk={lk} empty={s.empty} /></Reveal>
          </div>
        </section>
      ))}
    </>
  );
}
