"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { quickAddTask, type FormState } from "@/app/actions";

export function QuickAdd({ projects, companies, fixedProjectId, defaultDue, id }: {
  projects: { id: string; code: string; name: string }[];
  companies: { id: string; name: string }[];
  fixedProjectId?: string;
  defaultDue?: string;
  id?: string;
}) {
  const [state, action, pending] = useActionState<FormState, FormData>(quickAddTask, { ok: true });
  const form = useRef<HTMLFormElement>(null);
  const [kind, setKind] = useState("task");

  useEffect(() => {
    if (state.ok && state.nonce) {
      form.current?.reset();
      form.current?.querySelector<HTMLInputElement>("input[name=title]")?.focus();
    }
  }, [state]);

  return (
    <form ref={form} action={action} id={id} aria-label="Quick add task" onReset={() => setKind("task")}>
      <div style={{ display: "flex", gap: 12 }}>
        <label className="sr-only" htmlFor={`${id ?? "qa"}-title`}>Task title</label>
        <input id={`${id ?? "qa"}-title`} name="title" className="field" placeholder="Add a task…" autoComplete="off" required maxLength={500} />
        <button type="submit" className="btn btn-primary" disabled={pending} style={{ padding: "0 22px", height: 44 }}>
          {pending ? "Adding…" : "Add"}
        </button>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
        {fixedProjectId ? (
          <input type="hidden" name="project_id" value={fixedProjectId} />
        ) : (
          <select name="project_id" className="chip" aria-label="Project" defaultValue="">
            <option value="">Inbox</option>
            {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        )}
        <select name="priority" className="chip" aria-label="Priority" defaultValue="normal">
          <option value="urgent">Urgent</option>
          <option value="high">High</option>
          <option value="normal">Normal priority</option>
          <option value="low">Low</option>
        </select>
        <input type="date" name="due_on" className="chip" aria-label="Due date" defaultValue={defaultDue} />
        <select name="kind" className="chip" aria-label="Kind" value={kind} onChange={(e) => setKind(e.target.value)}>
          <option value="task">Task</option>
          <option value="follow_up">Follow-up</option>
          <option value="milestone">Milestone</option>
        </select>
        {kind === "follow_up" && (
          <select name="company_id" className="chip" aria-label="Company" required defaultValue="">
            <option value="" disabled>Company…</option>
            {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        )}
      </div>
      <p role="status" aria-live="polite" className="t-caption" style={{ margin: "8px 0 0 20px", minHeight: 20, color: state.ok ? "var(--text-muted)" : "var(--text)" }}>
        {state.ok ? (state.nonce ? "Added." : "") : state.message}
      </p>
    </form>
  );
}
