"use client";

import { useActionState, useEffect, useRef } from "react";
import { createProjectAction, type FormState } from "@/app/actions";

export function NewProject() {
  const [state, action, pending] = useActionState<FormState, FormData>(createProjectAction, { ok: true });
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => { if (state.ok && state.nonce) form.current?.reset(); }, [state]);
  return (
    <form ref={form} action={action} className="card" style={{ display: "grid", gap: 12 }}>
      <div className="grid sm:grid-cols-[200px_1fr]" style={{ gap: 12 }}>
        <input name="code" className="field tabular" placeholder="HOWL-APP-01" aria-label="Project code" required maxLength={32} style={{ textTransform: "uppercase" }} />
        <input name="name" className="field" placeholder="Project name" aria-label="Project name" required maxLength={200} />
      </div>
      <input name="description" className="field" placeholder="One line on what done looks like (optional)" aria-label="Description" maxLength={5000} />
      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <label className="t-caption" style={{ color: "var(--text-muted)", display: "flex", gap: 8, alignItems: "center" }}>
          Target <input type="date" name="target_date" className="chip" />
        </label>
        <span style={{ flex: 1 }} />
        <button type="submit" className="btn btn-primary" disabled={pending}>{pending ? "Creating…" : "Create project"}</button>
      </div>
      <p role="status" aria-live="polite" className="t-caption" style={{ margin: 0, minHeight: 20, color: state.ok ? "var(--text-muted)" : "var(--text)" }}>
        {state.ok ? (state.nonce ? "Project created." : "") : state.message}
      </p>
    </form>
  );
}
