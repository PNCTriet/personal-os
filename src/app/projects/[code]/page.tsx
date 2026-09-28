import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireScope } from "@/lib/session";
import { AppError } from "@/lib/errors";
import { shortDate } from "@/lib/dates";
import { getProject, statsFor, PROJECT_STATUS_LABEL } from "@/modules/projects";
import { compareTasks, isOpen, listTasks } from "@/modules/tasks";
import { listActivity } from "@/modules/activity";
import { Reveal } from "@/components/reveal";
import { SubNav } from "@/components/sub-nav";
import { TaskList } from "@/components/task-row";
import { QuickAdd } from "@/components/quick-add";
import { ActivityList } from "@/components/activity-list";
import { loadLookups } from "@/components/lookups";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ code: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return { title: decodeURIComponent((await params).code).toUpperCase() };
}

export default async function ProjectPage({ params }: Props) {
  const { code } = await params;
  const scope = await requireScope();
  const project = await getProject(scope, decodeURIComponent(code)).catch((e: unknown) => {
    if (e instanceof AppError && e.code === "not_found") notFound();
    throw e;
  });
  const [tasks, { lk, pickers, companies }] = await Promise.all([listTasks(scope, { project_id: project.id }), loadLookups(scope)]);
  const taskIds = tasks.map((t) => t.id);
  const activity = await listActivity(scope, { limit: 8, entityIds: [project.id, ...taskIds] });
  const stats = statsFor(tasks, lk.today);
  const company = companies.find((c) => c.id === project.company_id);
  const open = tasks.filter(isOpen).sort(compareTasks);
  const inProgress = open.filter((t) => t.status === "in_progress");
  const rest = open.filter((t) => t.status !== "in_progress");
  const done = tasks.filter((t) => !isOpen(t)).sort((a, b) => (b.completed_at ?? "").localeCompare(a.completed_at ?? ""));
  const pct = Math.round(stats.progress * 100);

  return (
    <>
      <SubNav
        title={project.name}
        links={[{ href: "/projects", label: "All projects" }, { href: "#tasks", label: "Tasks" }, { href: "#activity", label: "Activity" }]}
        cta={<a href="#add" className="btn btn-primary btn-sm">Add task</a>}
      />
      <section className="tile tile-hero" style={{ paddingBottom: 64 }}>
        <div className="container" style={{ maxWidth: 820 }}>
          <Reveal>
            <p className="t-caption-strong tabular" style={{ color: "var(--text-muted)", margin: "0 0 8px" }}>
              {project.code} · {PROJECT_STATUS_LABEL[project.status]}{company ? ` · ${company.name}` : ""}
            </p>
            <h1 className="t-hero" style={{ margin: 0 }}>{project.name}.</h1>
            {project.description && <p className="t-lead" style={{ margin: "16px 0 0", color: "var(--text-secondary)" }}>{project.description}</p>}
          </Reveal>
          <Reveal delay={100}>
            <div className="grid grid-cols-2 sm:grid-cols-4" style={{ gap: 20, marginTop: 48 }}>
              {[
                { n: `${pct}%`, label: "Complete" },
                { n: stats.open, label: "Open" },
                { n: stats.in_progress, label: "In progress" },
                { n: stats.overdue, label: "Overdue" },
              ].map((s) => (
                <div key={s.label}>
                  <div className="t-display-lg tabular">{s.n}</div>
                  <div className="t-caption" style={{ color: "var(--text-muted)" }}>{s.label}</div>
                </div>
              ))}
            </div>
            <div className="progress" style={{ marginTop: 24 }} role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Progress">
              <span style={{ transform: `scaleX(${stats.progress})` }} />
            </div>
            <p className="t-caption tabular" style={{ color: "var(--text-muted)", margin: "8px 0 0", display: "flex", justifyContent: "space-between" }}>
              <span>{project.start_date ? `Started ${shortDate(project.start_date)}` : ""}</span>
              <span>{project.target_date ? `Target ${shortDate(project.target_date)}` : ""}</span>
            </p>
          </Reveal>
        </div>
      </section>

      <section id="tasks" className="tile tile-parchment" style={{ scrollMarginTop: 52 }}>
        <div className="container" style={{ maxWidth: 820 }}>
          <Reveal className="card" id="add">
            <QuickAdd id="project-add" projects={pickers.projects} companies={pickers.companies} fixedProjectId={project.id} />
          </Reveal>
          {inProgress.length > 0 && (
            <Reveal>
              <h2 className="t-tagline" style={{ margin: "40px 0 16px" }}>In progress</h2>
              <TaskList tasks={inProgress} lk={lk} showProject={false} empty="" />
            </Reveal>
          )}
          <Reveal>
            <h2 className="t-tagline" style={{ margin: "40px 0 16px" }}>Up next <span className="tabular" style={{ color: "var(--text-muted)", fontWeight: 400 }}>{rest.length}</span></h2>
            <TaskList tasks={rest} lk={lk} showProject={false} empty="Nothing queued. Add the next step above." />
          </Reveal>
          {done.length > 0 && (
            <Reveal>
              <details style={{ marginTop: 40 }}>
                <summary className="t-tagline" style={{ cursor: "pointer", marginBottom: 16 }}>
                  Completed <span className="tabular" style={{ color: "var(--text-muted)", fontWeight: 400 }}>{done.length}</span>
                </summary>
                <TaskList tasks={done} lk={lk} showProject={false} empty="" />
              </details>
            </Reveal>
          )}
        </div>
      </section>

      <section id="activity" className="tile" style={{ scrollMarginTop: 52 }}>
        <div className="container" style={{ maxWidth: 820 }}>
          <Reveal><h2 className="t-display-md" style={{ margin: "0 0 24px" }}>Activity.</h2></Reveal>
          <Reveal delay={80}><ActivityList items={activity} empty="No activity on this project yet." /></Reveal>
          <p style={{ marginTop: 32 }}><Link href="/projects" className="link link-chevron">All projects</Link></p>
        </div>
      </section>
    </>
  );
}
