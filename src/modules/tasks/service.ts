import type { Scope } from "@/lib/context";
import { AppError, notFound } from "@/lib/errors";
import { recordActivity, type ActivityAction } from "@/modules/activity";
import { compareTasks, type NewTask, type Task, type TaskFilter, type TaskPatch } from "./domain";
import { TaskCreateSchema, TaskUpdateSchema } from "./schemas";

export async function listTasks(scope: Scope, filter: TaskFilter = {}) {
  return (await scope.repos.tasks.list(filter)).sort(compareTasks);
}

export async function getTask(scope: Scope, ref: string): Promise<Task> {
  const t = await scope.repos.tasks.get(ref);
  if (!t) throw notFound("Task");
  return t;
}

async function assertRefs(scope: Scope, v: { project_id?: string | null; company_id?: string | null }) {
  if (v.project_id) {
    const p = await scope.repos.projects.get(v.project_id);
    if (!p) throw new AppError("validation_error", "Project does not exist", { field: "project_id" });
  }
  if (v.company_id && !(await scope.repos.companies.get(v.company_id))) {
    throw new AppError("validation_error", "Company does not exist", { field: "company_id" });
  }
}

export async function createTask(scope: Scope, raw: unknown) {
  const input = TaskCreateSchema.parse(raw) as NewTask;
  await assertRefs(scope, input);
  if (input.status === "done") input.completed_at = new Date().toISOString();
  const t = await scope.repos.tasks.create(input);
  await recordActivity(scope, "task.create", { type: "task", id: t.id }, { label: t.title, code: t.code });
  return t;
}

export async function updateTask(scope: Scope, ref: string, raw: unknown) {
  const current = await getTask(scope, ref);
  const patch = TaskUpdateSchema.parse(raw) as TaskPatch;
  await assertRefs(scope, patch);

  const kind = patch.kind ?? current.kind;
  const company = patch.company_id !== undefined ? patch.company_id : current.company_id;
  if (kind === "follow_up" && !company) {
    throw new AppError("validation_error", "A follow-up needs a company", { field: "company_id" });
  }
  if (patch.project_id === null && current.project_id) {
    throw new AppError("conflict", "A task with a code cannot be moved back to the inbox");
  }

  let action: ActivityAction = "task.update";
  let detail: string | undefined;
  if (patch.status && patch.status !== current.status) {
    if (patch.status === "done") {
      patch.completed_at = new Date().toISOString();
      action = "task.complete";
    } else if (current.status === "done") {
      patch.completed_at = null;
      action = "task.reopen";
    }
  }
  const moved = patch.project_id !== undefined && patch.project_id !== current.project_id;
  const t = await scope.repos.tasks.update(current.id, patch);
  if (moved) {
    action = "task.move";
    detail = current.code ? `was ${current.code}` : undefined;
  }
  await recordActivity(scope, action, { type: "task", id: t.id }, { label: t.title, code: t.code, detail });
  return t;
}

export async function setTaskStatus(scope: Scope, ref: string, status: Task["status"]) {
  return updateTask(scope, ref, { status });
}

export async function deleteTask(scope: Scope, ref: string) {
  const current = await getTask(scope, ref);
  await scope.repos.tasks.softDelete(current.id);
  await recordActivity(scope, "task.delete", { type: "task", id: current.id }, { label: current.title, code: current.code });
}
