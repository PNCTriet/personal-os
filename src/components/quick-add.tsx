"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { quickAddTask, type FormState } from "@/app/actions";

export function QuickAdd({ projects, companies, fixedProjectId, defaultDue, id = "qa", autoFocus, onDone, compact }: {
  projects: { id: string; code: string; name: string }[];
  companies: { id: string; name: string }[];
  fixedProjectId?: string;
  defaultDue?: string;
  id?: string;
  autoFocus?: boolean;
  onDone?: () => void;
  compact?: boolean;
}) {
  const [state, action, pending] = useActionState<FormState, FormData>(quickAddTask, { ok: true });
  const form = useRef<HTMLFormElement>(null);
  const [kind, setKind] = useState("task");

  useEffect(() => {
    if (state.ok && state.nonce) {
      form.current?.reset();
      if (onDone) onDone();
      else form.current?.querySelector<HTMLInputElement>("input[name=title]")?.focus();
    }
  }, [state, onDone]);

  return (
    <form ref={form} action={action} id={id} aria-label="Quick add task" onReset={() => setKind("task")}
      style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
      <label className="sr-only" htmlFor={`${id}-title`}>Task title</label>
      <input id={`${id}-title`} name="title" className="field field-pill" placeholder="Add a task…" autoComplete="off" required maxLength={500}
        autoFocus={autoFocus} style={{ flex: compact ? "1 1 240px" : "1 1 100%", height: 32 }} />
      {fixedProjectId ? (
        <input type="hidden" name="project_id" value={fixedProjectId} />
      ) : (
        <select name="project_id" className="select" aria-label="Project" defaultValue="">
          <option value="">Inbox</option>
          {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      )}
      <select name="priority" className="select" aria-label="Priority" defaultValue="normal">
        <option value="urgent">Urgent</option>
        <option value="high">High</option>
        <option value="normal">Normal</option>
        <option value="low">Low</option>
      </select>
      <input type="date" name="due_on" className="select" aria-label="Due date" defaultValue={defaultDue} style={{ paddingRight: 8 }} />
      <select name="kind" className="select" aria-label="Kind" value={kind} onChange={(e) => setKind(e.target.value)}>
        <option value="task">Task</option>
        <option value="follow_up">Follow-up</option>
        <option value="milestone">Milestone</option>
      </select>
      {kind === "follow_up" && (
        <select name="company_id" className="select" aria-label="Company" required defaultValue="">
          <option value="" disabled>Company…</option>
          {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      )}
      <span style={{ flex: 1 }} />
      <span role="status" aria-live="polite" className="t-small" style={{ color: state.ok ? "var(--muted)" : "var(--red)" }}>
        {state.ok ? (state.nonce && !onDone ? "Added" : "") : state.message}
      </span>
      <button type="submit" className="btn btn-primary" disabled={pending}>{pending ? "Adding…" : "Add task"}</button>
    </form>
  );
}
