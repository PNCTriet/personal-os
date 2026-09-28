import type { Scope } from "@/lib/context";
import { conflict, notFound } from "@/lib/errors";
import { todayISO } from "@/lib/dates";
import { recordActivity } from "@/modules/activity";
import { isOpen, type Task } from "@/modules/tasks";
import type { NewProject, Project, ProjectPatch, ProjectStats } from "./domain";
import { ProjectCreateSchema, ProjectUpdateSchema } from "./schemas";

export function statsFor(tasks: Task[], today: string): ProjectStats {
  const live = tasks.filter((t) => t.status !== "cancelled");
  const done = live.filter((t) => t.status === "done").length;
  const open = live.filter(isOpen);
  return {
    total: live.length,
    done,
    open: open.length,
    in_progress: open.filter((t) => t.status === "in_progress").length,
    overdue: open.filter((t) => t.due_on !== null && t.due_on < today).length,
    progress: live.length ? done / live.length : 0,
  };
}

export async function listProjects(scope: Scope, opts: { includeArchived?: boolean } = {}) {
  return scope.repos.projects.list(opts);
}

export async function listProjectsWithStats(scope: Scope) {
  const [projects, tasks] = await Promise.all([scope.repos.projects.list(), scope.repos.tasks.list({})]);
  const today = todayISO(scope.ctx.timezone);
  return projects.map((p) => ({ ...p, stats: statsFor(tasks.filter((t) => t.project_id === p.id), today) }));
}

export async function getProject(scope: Scope, ref: string): Promise<Project> {
  const p = await scope.repos.projects.get(ref);
  if (!p) throw notFound("Project");
  return p;
}

export async function createProject(scope: Scope, raw: unknown) {
  const input = ProjectCreateSchema.parse(raw) as NewProject;
  if (await scope.repos.projects.get(input.code)) throw conflict(`Project code ${input.code} is taken`);
  const p = await scope.repos.projects.create(input);
  await recordActivity(scope, "project.create", { type: "project", id: p.id }, { label: p.name, code: p.code });
  return p;
}

export async function updateProject(scope: Scope, ref: string, raw: unknown) {
  const current = await getProject(scope, ref);
  const patch = ProjectUpdateSchema.parse(raw) as ProjectPatch;
  if (patch.status && patch.status !== current.status) {
    patch.completed_at = patch.status === "completed" ? new Date().toISOString() : null;
  }
  const p = await scope.repos.projects.update(current.id, patch);
  await recordActivity(scope, "project.update", { type: "project", id: p.id }, { label: p.name, code: p.code });
  return p;
}

export async function deleteProject(scope: Scope, ref: string) {
  const current = await getProject(scope, ref);
  const open = (await scope.repos.tasks.list({ project_id: current.id })).filter(isOpen);
  if (open.length) throw conflict(`Project has ${open.length} open task(s); complete or move them first`);
  await scope.repos.projects.softDelete(current.id);
  await recordActivity(scope, "project.delete", { type: "project", id: current.id }, { label: current.name, code: current.code });
}
