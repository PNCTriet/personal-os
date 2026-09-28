export const TASK_STATUSES = ["backlog", "todo", "in_progress", "blocked", "done", "cancelled"] as const;
export const TASK_PRIORITIES = ["urgent", "high", "normal", "low"] as const;
export const TASK_KINDS = ["task", "follow_up", "milestone"] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];
export type TaskPriority = (typeof TASK_PRIORITIES)[number];
export type TaskKind = (typeof TASK_KINDS)[number];

export const TASK_STATUS_LABEL: Record<TaskStatus, string> = {
  backlog: "Backlog",
  todo: "To do",
  in_progress: "In progress",
  blocked: "Blocked",
  done: "Done",
  cancelled: "Cancelled",
};
export const TASK_PRIORITY_LABEL: Record<TaskPriority, string> = { urgent: "Urgent", high: "High", normal: "Normal", low: "Low" };
export const TASK_KIND_LABEL: Record<TaskKind, string> = { task: "Task", follow_up: "Follow-up", milestone: "Milestone" };

export interface Task {
  id: string;
  /** {project}-T{NN}; null while in the inbox (ADR-006). */
  code: string | null;
  previous_codes: string[];
  project_id: string | null;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  kind: TaskKind;
  due_on: string | null;
  completed_at: string | null;
  company_id: string | null;
  created_at: string;
  updated_at: string;
}

export type NewTask = Pick<Task, "title"> &
  Partial<Pick<Task, "description" | "project_id" | "status" | "priority" | "kind" | "due_on" | "company_id" | "completed_at">>;
export type TaskPatch = Partial<Omit<NewTask, never>>;

export interface TaskFilter {
  project_id?: string;
  statuses?: TaskStatus[];
  priorities?: TaskPriority[];
  kind?: TaskKind;
  due_before?: string;
  due_after?: string;
  q?: string;
}

export const isOpen = (t: Pick<Task, "status">) => t.status !== "done" && t.status !== "cancelled";

const PRIORITY_RANK: Record<TaskPriority, number> = { urgent: 0, high: 1, normal: 2, low: 3 };

/** Due date first (nulls last), then priority, then code. */
export function compareTasks(a: Task, b: Task): number {
  if (a.due_on !== b.due_on) {
    if (a.due_on === null) return 1;
    if (b.due_on === null) return -1;
    return a.due_on < b.due_on ? -1 : 1;
  }
  const p = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
  if (p) return p;
  return (a.code ?? "~").localeCompare(b.code ?? "~", "en", { numeric: true });
}

export const byPriority = (a: Task, b: Task) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] || compareTasks(a, b);

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
