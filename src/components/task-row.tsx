import Link from "next/link";
import type { TaskItem } from "./task-items";
import { StatusCheck } from "./task-status";

const PRIORITY_TONE = { urgent: "red", high: "orange", normal: "none", low: "none" } as const;

/** Compact list row (dashboard, today, project detail). */
export function TaskRow({ t, showProject = true }: { t: TaskItem; showProject?: boolean }) {
  const done = t.status === "done" || t.status === "cancelled";
  return (
    <div className={`row ${done ? "task-done" : ""}`}>
      <StatusCheck id={t.id} status={t.status} title={t.title} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="task-title truncate-1">{t.title}</div>
        <div className="t-small muted truncate-1">
          {[
            t.code,
            showProject ? (t.projectCode ? <Link key="p" href={`/projects/${t.projectCode}`} className="hover:underline">{t.project}</Link> : "Inbox") : null,
            t.kind === "follow_up" ? `Follow-up${t.company ? `: ${t.company}` : ""}` : t.kind === "milestone" ? "Milestone" : null,
            t.status === "blocked" ? "Blocked" : null,
          ].filter(Boolean).map((part, i) => <span key={i}>{i > 0 ? " · " : ""}{part}</span>)}
        </div>
      </div>
      {(t.priority === "urgent" || t.priority === "high") && !done && (
        <span className="dot hide-mobile" data-tone={PRIORITY_TONE[t.priority]} title={t.priority === "urgent" ? "Urgent" : "High priority"} />
      )}
      {t.dueText && !done && (
        <span className={`t-small tabular ${t.dueTone === "overdue" ? "tone-red" : t.dueTone === "today" ? "" : "muted"}`} style={{ fontWeight: t.dueTone === "overdue" || t.dueTone === "today" ? 600 : 400, whiteSpace: "nowrap" }}>
          {t.dueText}
        </span>
      )}
    </div>
  );
}

export function TaskList({ items, showProject, empty }: { items: TaskItem[]; showProject?: boolean; empty: string }) {
  if (items.length === 0) return <div className="muted t-small" style={{ padding: "14px" }}>{empty}</div>;
  return <div className="rows">{items.map((t) => <TaskRow key={t.id} t={t} showProject={showProject} />)}</div>;
}
