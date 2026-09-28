import type { Scope } from "@/lib/context";
import { addDays, todayISO } from "@/lib/dates";
import { byPriority, compareTasks, isOpen, type Task } from "@/modules/tasks";

export interface TodayView {
  today: string;
  overdue: Task[];
  dueToday: Task[];
  inProgress: Task[];
  upcoming: Task[];
  /** Up to 3 tasks to focus on: overdue, then due today, then in-progress, by priority. */
  focus: Task[];
  counts: { open: number; dueToday: number; overdue: number; doneThisWeek: number };
}

export async function getToday(scope: Scope): Promise<TodayView> {
  const today = todayISO(scope.ctx.timezone);
  const all = await scope.repos.tasks.list({});
  const open = all.filter(isOpen);
  const overdue = open.filter((t) => t.due_on !== null && t.due_on < today).sort(compareTasks);
  const dueToday = open.filter((t) => t.due_on === today).sort(byPriority);
  const inProgress = open.filter((t) => t.status === "in_progress" && (t.due_on === null || t.due_on > today)).sort(byPriority);
  const weekEnd = addDays(today, 7);
  const upcoming = open
    .filter((t) => t.due_on !== null && t.due_on > today && t.due_on <= weekEnd && t.status !== "in_progress")
    .sort(compareTasks);
  const weekAgo = new Date(Date.now() - 7 * 86_400_000).toISOString();
  const focus = [...overdue.sort(byPriority), ...dueToday, ...inProgress].slice(0, 3);
  return {
    today,
    overdue,
    dueToday,
    inProgress,
    upcoming,
    focus,
    counts: {
      open: open.length,
      dueToday: dueToday.length,
      overdue: overdue.length,
      doneThisWeek: all.filter((t) => t.status === "done" && (t.completed_at ?? "") >= weekAgo).length,
    },
  };
}
