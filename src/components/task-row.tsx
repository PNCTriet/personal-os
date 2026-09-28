import Link from "next/link";
import { dueLabel } from "@/lib/dates";
import { TASK_KIND_LABEL, TASK_PRIORITY_LABEL, TASK_STATUSES, TASK_STATUS_LABEL, type Task } from "@/modules/tasks";
import { StatusCheck, StatusSelect } from "./task-status";

const STATUS_OPTIONS = TASK_STATUSES.map((s) => ({ value: s, label: TASK_STATUS_LABEL[s] }));

export interface TaskLookups {
  today: string;
  projects: Map<string, { code: string; name: string }>;
  companies: Map<string, string>;
}

export function TaskRow({ task, lk, showProject = true, compact = false, dark = false }: {
  task: Task; lk: TaskLookups; showProject?: boolean; compact?: boolean; dark?: boolean;
}) {
  const project = task.project_id ? lk.projects.get(task.project_id) : undefined;
  const due = task.due_on ? dueLabel(task.due_on, lk.today) : null;
  const done = task.status === "done" || task.status === "cancelled";
  const meta: string[] = [];
  if (task.code) meta.push(task.code);
  if (showProject) meta.push(project ? project.name : "Inbox");
  if (task.kind !== "task") meta.push(task.kind === "follow_up" && task.company_id ? `Follow-up · ${lk.companies.get(task.company_id) ?? "Company"}` : TASK_KIND_LABEL[task.kind]);
  if (task.status === "blocked") meta.push("Blocked");

  return (
    <div className={`row ${done ? "task-done" : ""}`} style={{ display: "flex", alignItems: "center", gap: 16, padding: compact ? "14px 0" : "16px 24px" }}>
      <StatusCheck id={task.id} status={task.status} title={task.title} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className={`task-title ${dark ? "focus-title" : ""}`} style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: dark ? "normal" : "nowrap" }}>
          {task.title}
        </div>
        <div className="t-caption" style={{ color: "var(--text-muted)", marginTop: dark ? 4 : 0, display: "flex", gap: 6, flexWrap: "wrap" }}>
          {meta.map((m, i) => (
            <span key={i}>
              {i > 0 && <span aria-hidden="true">·&nbsp;</span>}
              {i === 1 && project && showProject ? <Link href={`/projects/${project.code}`} className="hover:underline">{m}</Link> : m}
            </span>
          ))}
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 16, flex: "none" }}>
        {(task.priority === "urgent" || task.priority === "high") && !done && (
          <span className="t-caption hidden sm:inline-flex" style={{ alignItems: "center", gap: 6, color: "var(--text-secondary)" }}>
            <span className="dot" style={{ opacity: task.priority === "urgent" ? 1 : 0.45 }} />
            {TASK_PRIORITY_LABEL[task.priority]}
          </span>
        )}
        {due && !done && (
          <span className={`due-label ${due.tone === "overdue" || due.tone === "today" ? "t-caption-strong" : "t-caption"}`} style={{ color: due.tone === "overdue" || due.tone === "today" ? "var(--text)" : "var(--text-muted)", minWidth: 72, textAlign: "right" }}>
            {due.text}
          </span>
        )}
        {!dark && <span className="hidden md:inline-flex"><StatusSelect id={task.id} status={task.status} options={STATUS_OPTIONS} /></span>}
      </div>
    </div>
  );
}

export function TaskList({ tasks, lk, showProject, empty }: { tasks: Task[]; lk: TaskLookups; showProject?: boolean; empty: string }) {
  if (tasks.length === 0) return <div className="list t-caption" style={{ padding: "20px 24px", color: "var(--text-muted)" }}>{empty}</div>;
  return (
    <div className="list">
      {tasks.map((t) => <TaskRow key={t.id} task={t} lk={lk} showProject={showProject} />)}
    </div>
  );
}
