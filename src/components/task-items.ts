import { dueLabel } from "@/lib/dates";
import type { Task } from "@/modules/tasks";

/** Serializable task view-model shared by lists, the tasks table and the kanban board. */
export interface TaskItem {
  id: string;
  code: string | null;
  title: string;
  status: Task["status"];
  priority: Task["priority"];
  kind: Task["kind"];
  due_on: string | null;
  dueText: string | null;
  dueTone: "overdue" | "today" | "soon" | "later" | null;
  project: string | null;
  projectCode: string | null;
  company: string | null;
}

export interface TaskLookups {
  today: string;
  projects: Map<string, { code: string; name: string }>;
  companies: Map<string, string>;
}

export function toTaskItems(tasks: Task[], lk: TaskLookups): TaskItem[] {
  return tasks.map((t) => {
    const p = t.project_id ? lk.projects.get(t.project_id) : undefined;
    const due = t.due_on ? dueLabel(t.due_on, lk.today) : null;
    return {
      id: t.id, code: t.code, title: t.title, status: t.status, priority: t.priority, kind: t.kind, due_on: t.due_on,
      dueText: due?.text ?? null, dueTone: due?.tone ?? null,
      project: p?.name ?? null, projectCode: p?.code ?? null,
      company: t.company_id ? (lk.companies.get(t.company_id) ?? null) : null,
    };
  });
}
