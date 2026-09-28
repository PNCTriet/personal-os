import type { Metadata } from "next";
import Link from "next/link";
import { requireScope } from "@/lib/session";
import { addDays } from "@/lib/dates";
import { compareTasks, isOpen, listTasks, type Task } from "@/modules/tasks";
import { Reveal } from "@/components/reveal";
import { SubNav } from "@/components/sub-nav";
import { TaskList } from "@/components/task-row";
import { QuickAdd } from "@/components/quick-add";
import { loadLookups } from "@/components/lookups";

export const metadata: Metadata = { title: "Tasks" };
export const dynamic = "force-dynamic";

const VIEWS = {
  open: { label: "Open", empty: "No open tasks. Add one above." },
  week: { label: "This week", empty: "Nothing due in the next 7 days." },
  follow_up: { label: "Follow-ups", empty: "No follow-ups waiting." },
  inbox: { label: "Inbox", empty: "Inbox zero." },
  done: { label: "Done", empty: "Nothing completed yet." },
} as const;
type View = keyof typeof VIEWS;

export default async function TasksPage({ searchParams }: { searchParams: Promise<{ view?: string; q?: string }> }) {
  const sp = await searchParams;
  const view: View = sp.view && sp.view in VIEWS ? (sp.view as View) : "open";
  const scope = await requireScope();
  const [all, { lk, pickers }] = await Promise.all([listTasks(scope, { q: sp.q }), loadLookups(scope)]);
  const weekEnd = addDays(lk.today, 7);
  const filters: Record<View, (t: Task) => boolean> = {
    open: isOpen,
    week: (t) => isOpen(t) && t.due_on !== null && t.due_on <= weekEnd,
    follow_up: (t) => isOpen(t) && t.kind === "follow_up",
    inbox: (t) => isOpen(t) && t.project_id === null,
    done: (t) => t.status === "done",
  };
  const tasks = all.filter(filters[view]).sort(
    view === "done" ? (a, b) => (b.completed_at ?? "").localeCompare(a.completed_at ?? "") : compareTasks,
  );
  const count = (v: View) => all.filter(filters[v]).length;

  return (
    <>
      <SubNav title="Tasks" cta={<Link href="#add" className="btn btn-primary btn-sm">Add task</Link>} />
      <section className="tile tile-hero" style={{ paddingBottom: 48 }}>
        <div className="container" style={{ maxWidth: 820 }}>
          <Reveal>
            <h1 className="t-hero" style={{ margin: 0 }}>Tasks.</h1>
            <p className="t-lead" style={{ margin: "16px 0 32px", color: "var(--text-secondary)" }}>
              {count("open")} open. {count("follow_up")} waiting on someone.
            </p>
          </Reveal>
          <Reveal delay={100} className="card" id="add">
            <QuickAdd id="tasks-add" projects={pickers.projects} companies={pickers.companies} />
          </Reveal>
        </div>
      </section>
      <section className="tile tile-parchment" style={{ paddingTop: 40 }}>
        <div className="container" style={{ maxWidth: 820 }}>
          <nav aria-label="Task views" style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 24 }}>
            {(Object.keys(VIEWS) as View[]).map((v) => (
              <Link key={v} href={v === "open" ? "/tasks" : `/tasks?view=${v}`} className="chip" aria-current={v === view ? "page" : undefined}>
                {VIEWS[v].label} <span className="tabular" style={{ color: "var(--text-muted)" }}>{count(v)}</span>
              </Link>
            ))}
          </nav>
          <Reveal><TaskList tasks={tasks} lk={lk} empty={VIEWS[view].empty} /></Reveal>
        </div>
      </section>
    </>
  );
}
