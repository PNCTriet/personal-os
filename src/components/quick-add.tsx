"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { quickAddTask, type FormState } from "@/app/actions";
import { useI18n } from "@/lib/i18n/client";

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
  const { t } = useI18n();

  useEffect(() => {
    if (state.ok && state.nonce) {
      form.current?.reset();
      if (onDone) onDone();
      else form.current?.querySelector<HTMLInputElement>("input[name=title]")?.focus();
    }
  }, [state, onDone]);

  return (
    <form ref={form} action={action} id={id} aria-label={t("shell.newTask")} onReset={() => setKind("task")}
      style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
      <label className="sr-only" htmlFor={`${id}-title`}>{t("qa.placeholder")}</label>
      <input id={`${id}-title`} name="title" className="field field-pill" placeholder={t("qa.placeholder")} autoComplete="off" required maxLength={500}
        autoFocus={autoFocus} style={{ flex: compact ? "1 1 240px" : "1 1 100%", height: 32 }} />
      {fixedProjectId ? (
        <input type="hidden" name="project_id" value={fixedProjectId} />
      ) : (
        <select name="project_id" className="select" aria-label={t("task.col.project")} defaultValue="">
          <option value="">{t("common.inbox")}</option>
          {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      )}
      <select name="priority" className="select" aria-label={t("task.col.priority")} defaultValue="normal">
        {(["urgent", "high", "normal", "low"] as const).map((p) => <option key={p} value={p}>{t(`task.priority.${p}`)}</option>)}
      </select>
      <input type="date" name="due_on" className="select" aria-label={t("qa.due")} defaultValue={defaultDue} style={{ paddingRight: 8 }} />
      <select name="kind" className="select" aria-label={t("task.col.task")} value={kind} onChange={(e) => setKind(e.target.value)}>
        {(["task", "follow_up", "milestone"] as const).map((k) => <option key={k} value={k}>{t(`task.kind.${k}`)}</option>)}
      </select>
      {kind === "follow_up" && (
        <select name="company_id" className="select" aria-label={t("qa.company")} required defaultValue="">
          <option value="" disabled>{t("qa.company")}</option>
          {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      )}
      <span style={{ flex: 1 }} />
      <span role="status" aria-live="polite" className="t-small" style={{ color: state.ok ? "var(--muted)" : "var(--red)" }}>
        {state.ok ? (state.nonce && !onDone ? t("qa.added") : "") : state.message}
      </span>
      <button type="submit" className="btn btn-primary" disabled={pending}>{pending ? t("qa.adding") : t("qa.add")}</button>
    </form>
  );
}
