"use client";

import { useActionState, useEffect, useRef } from "react";
import { createProjectAction, type FormState } from "@/app/actions";

export function NewProject() {
  const [state, action, pending] = useActionState<FormState, FormData>(createProjectAction, { ok: true });
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => { if (state.ok && state.nonce) form.current?.reset(); }, [state]);
  return (
    <form ref={form} action={action} style={{ display: "grid", gap: 8 }}>
      <div className="grid sm:grid-cols-[170px_1fr]" style={{ gap: 8 }}>
        <input name="code" className="field tabular" placeholder="HOWL-APP-01" aria-label="Project code" required maxLength={32} style={{ textTransform: "uppercase" }} />
        <input name="name" className="field" placeholder="Project name" aria-label="Project name" required maxLength={200} />
      </div>
      <input name="description" className="field" placeholder="What does done look like? (optional)" aria-label="Description" maxLength={5000} />
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <label className="t-small muted" style={{ display: "flex", gap: 6, alignItems: "center" }}>Target <input type="date" name="target_date" className="select" style={{ paddingRight: 8 }} /></label>
        <span className="t-small muted">Codes follow ADR-006 (COMPANY-PROJECT-NN) and never change.</span>
        <span style={{ flex: 1 }} />
        <span role="status" aria-live="polite" className="t-small" style={{ color: state.ok ? "var(--muted)" : "var(--red)" }}>{state.ok ? (state.nonce ? "Project created" : "") : state.message}</span>
        <button type="submit" className="btn btn-primary" disabled={pending}>{pending ? "Creating…" : "Create project"}</button>
      </div>
    </form>
  );
}
