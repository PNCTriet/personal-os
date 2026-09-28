import Link from "next/link";
import { requireScope } from "@/lib/session";
import { hourIn, longDate } from "@/lib/dates";
import { getToday } from "@/modules/today";
import { listProjectsWithStats } from "@/modules/projects";
import { listActivity } from "@/modules/activity";
import { Reveal } from "@/components/reveal";
import { TaskRow } from "@/components/task-row";
import { ProjectCard } from "@/components/project-card";
import { ActivityList } from "@/components/activity-list";
import { loadLookups } from "@/components/lookups";

export const dynamic = "force-dynamic";

function greeting(h: number) {
  if (h < 5) return "Good evening";
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

function plural(n: number, one: string, many = `${one}s`) {
  return `${n} ${n === 1 ? one : many}`;
}

export default async function Dashboard() {
  const scope = await requireScope();
  const [today, projects, activity, { lk, companies }] = await Promise.all([
    getToday(scope), listProjectsWithStats(scope), listActivity(scope, { limit: 6 }), loadLookups(scope),
  ]);
  const { counts } = today;
  const companyName = new Map(companies.map((c) => [c.id, c.name]));
  const active = projects.filter((p) => p.status === "active" || p.status === "planned").slice(0, 3);

  const summary: string[] = [];
  if (counts.dueToday) summary.push(`${plural(counts.dueToday, "task")} due today`);
  if (counts.overdue) summary.push(`${counts.overdue} overdue`);
  const lead = summary.length ? `${summary.join(", ")}.` : "Nothing due today.";

  return (
    <>
      <section className="tile tile-hero" aria-labelledby="hello">
        <div className="container" style={{ textAlign: "center" }}>
          <Reveal>
            <p className="t-caption-strong" style={{ color: "var(--text-muted)", margin: "0 0 12px" }}>{longDate(today.today)}</p>
            <h1 id="hello" className="t-hero" style={{ margin: 0 }}>{greeting(hourIn(scope.ctx.timezone))}, {scope.ctx.displayName}.</h1>
            <p className="t-lead" style={{ margin: "16px auto 0", maxWidth: 680, color: "var(--text-secondary)" }}>
              {lead} {plural(counts.open, "open task")} across {plural(projects.filter((p) => p.status === "active").length, "active project")}.
            </p>
          </Reveal>
          <Reveal delay={120}>
            <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap", marginTop: 32 }}>
              <Link href="/today" className="btn btn-primary">Open Today</Link>
              <Link href="/tasks#add" className="btn btn-secondary">Add a task</Link>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="tile tile-dark" aria-labelledby="focus">
        <div className="container" style={{ maxWidth: 820 }}>
          <Reveal>
            <h2 id="focus" className="t-display-lg" style={{ margin: 0, textAlign: "center" }}>Today’s focus.</h2>
            <p className="t-caption" style={{ textAlign: "center", color: "var(--text-muted)", margin: "8px 0 32px" }}>
              Overdue first, then due today, then work in progress.
            </p>
          </Reveal>
          {today.focus.length === 0 ? (
            <Reveal><p className="t-tagline" style={{ textAlign: "center", color: "var(--text-muted)" }}>Clear skies. Nothing needs you right now.</p></Reveal>
          ) : (
            <Reveal delay={80} className="list">
              {today.focus.map((t) => <TaskRow key={t.id} task={t} lk={lk} compact dark />)}
            </Reveal>
          )}
          <Reveal delay={160}>
            <p style={{ textAlign: "center", margin: "32px 0 0" }}>
              <Link href="/today" className="link link-chevron">See everything for today</Link>
            </p>
          </Reveal>
        </div>
      </section>

      <section className="tile" aria-labelledby="glance">
        <div className="container">
          <Reveal><h2 id="glance" className="t-display-md" style={{ margin: "0 0 24px" }}>At a glance.</h2></Reveal>
          <div className="grid grid-cols-2 lg:grid-cols-4" style={{ gap: 20 }}>
            {[
              { n: counts.open, label: "Open tasks", href: "/tasks" },
              { n: counts.dueToday, label: "Due today", href: "/today" },
              { n: counts.overdue, label: "Overdue", href: "/today#overdue" },
              { n: counts.doneThisWeek, label: "Done this week", href: "/tasks?view=done" },
            ].map((c, i) => (
              <Reveal key={c.label} delay={i * 60}>
                <Link href={c.href} className="card card-link" style={{ background: "var(--bg-alt)", borderColor: "transparent" }}>
                  <div className="t-display-lg tabular">{c.n}</div>
                  <div className="t-caption" style={{ color: "var(--text-muted)", marginTop: 4 }}>{c.label}</div>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="tile tile-parchment" aria-labelledby="projects">
        <div className="container">
          <Reveal>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 16, marginBottom: 24 }}>
              <h2 id="projects" className="t-display-md" style={{ margin: 0 }}>Projects.</h2>
              <Link href="/projects" className="link link-chevron">All projects</Link>
            </div>
          </Reveal>
          <div className="grid md:grid-cols-2 lg:grid-cols-3" style={{ gap: 20 }}>
            {active.map((p, i) => (
              <Reveal key={p.id} delay={i * 80}>
                <ProjectCard project={p} stats={p.stats} company={p.company_id ? companyName.get(p.company_id) : undefined} />
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="tile" aria-labelledby="activity">
        <div className="container" style={{ maxWidth: 820 }}>
          <Reveal><h2 id="activity" className="t-display-md" style={{ margin: "0 0 24px" }}>Recent activity.</h2></Reveal>
          <Reveal delay={80}><ActivityList items={activity} /></Reveal>
        </div>
      </section>
    </>
  );
}
