import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { requireScope } from "@/lib/session";
import { AppError } from "@/lib/errors";
import { shortDate } from "@/lib/dates";
import { getProject, statsFor, PROJECT_STATUS_LABEL } from "@/modules/projects";
import { listTasks } from "@/modules/tasks";
import { listActivity } from "@/modules/activity";
import { ActivityList } from "@/components/activity-list";
import { loadLookups } from "@/components/lookups";
import { toTaskItems } from "@/components/task-items";
import { TasksView } from "@/components/tasks-view";
import { QuickAdd } from "@/components/quick-add";
import { PageHeader, Panel, Pill, Progress } from "@/components/ui/page";

export const dynamic = "force-dynamic";
type Props = { params: Promise<{ code: string }>; searchParams: Promise<{ layout?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return { title: decodeURIComponent((await params).code).toUpperCase() };
}

const TONE = { active: "blue", planned: "gray", on_hold: "orange", completed: "green", cancelled: "none" } as const;

export default async function ProjectPage({ params, searchParams }: Props) {
  const [{ code }, sp] = await Promise.all([params, searchParams]);
  const scope = await requireScope();
  const project = await getProject(scope, decodeURIComponent(code)).catch((e: unknown) => {
    if (e instanceof AppError && e.code === "not_found") notFound();
    throw e;
  });
  const [tasks, { lk, pickers, companies }] = await Promise.all([listTasks(scope, { project_id: project.id }), loadLookups(scope)]);
  const activity = await listActivity(scope, { limit: 10, entityIds: [project.id, ...tasks.map((t) => t.id)] });
  const stats = statsFor(tasks, lk.today);
  const company = companies.find((c) => c.id === project.company_id);

  return (
    <>
      <Link href="/projects" className="t-small muted" style={{ display: "inline-flex", alignItems: "center", gap: 2, marginBottom: 6 }}><ChevronLeft size={14} />Projects</Link>
      <PageHeader
        title={project.name}
        subtitle={<span style={{ display: "inline-flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}><span className="tabular">{project.code}</span><Pill tone={TONE[project.status]}>{PROJECT_STATUS_LABEL[project.status]}</Pill>{company && <span>{company.name}</span>}</span>}
      />
      <div className="grid-dash">
        <div className="span-8" style={{ display: "grid", gap: 12, alignContent: "start", minWidth: 0 }}>
          <div className="panel" style={{ padding: 12 }}>
            <QuickAdd id="project-add" projects={pickers.projects} companies={pickers.companies} fixedProjectId={project.id} compact />
          </div>
          <TasksView items={toTaskItems(tasks, lk)} showProject={false} initialLayout={sp.layout === "board" ? "board" : "table"} />
        </div>
        <div className="span-4" style={{ display: "grid", gap: 12, alignContent: "start" }}>
          <Panel title="Overview">
            {project.description && <p className="text-2" style={{ margin: "0 0 12px" }}>{project.description}</p>}
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <span className="muted">Progress</span><span className="tabular" style={{ fontWeight: 600 }}>{Math.round(stats.progress * 100)}%</span>
            </div>
            <Progress value={stats.progress} label="Progress" />
            <dl style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 12px", margin: "14px 0 0" }}>
              {[
                ["Open", stats.open], ["In progress", stats.in_progress], ["Done", stats.done], ["Overdue", stats.overdue],
                ["Start", project.start_date ? shortDate(project.start_date) : "—"], ["Target", project.target_date ? shortDate(project.target_date) : "—"],
              ].map(([k, v]) => (
                <div key={String(k)}><dt className="t-small muted">{k}</dt><dd className={`tabular ${k === "Overdue" && Number(v) > 0 ? "tone-red" : ""}`} style={{ margin: 0, fontWeight: 600 }}>{v}</dd></div>
              ))}
            </dl>
          </Panel>
          <Panel title="Activity" flush><ActivityList items={activity} empty="No activity on this project yet." /></Panel>
        </div>
      </div>
    </>
  );
}
