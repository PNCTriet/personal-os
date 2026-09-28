"use client";

import { useActionState, useEffect, useRef } from "react";
import { createProjectAction, type FormState } from "@/app/actions";
import { useI18n } from "@/lib/i18n/client";

export function NewProject() {
  const [state, action, pending] = useActionState<FormState, FormData>(createProjectAction, { ok: true });
  const form = useRef<HTMLFormElement>(null);
  const { t } = useI18n();
  useEffect(() => { if (state.ok && state.nonce) form.current?.reset(); }, [state]);
  return (
    <form ref={form} action={action} style={{ display: "grid", gap: 8 }}>
      <div className="grid sm:grid-cols-[170px_1fr]" style={{ gap: 8 }}>
        <input name="code" className="field tabular" placeholder="HOWL-APP-01" aria-label={t("task.col.code")} required maxLength={32} style={{ textTransform: "uppercase" }} />
        <input name="name" className="field" placeholder={t("proj.name")} aria-label={t("proj.name")} required maxLength={200} />
      </div>
      <input name="description" className="field" placeholder={t("proj.description")} aria-label={t("proj.description")} maxLength={5000} />
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <label className="t-small muted" style={{ display: "flex", gap: 6, alignItems: "center" }}>{t("proj.target")} <input type="date" name="target_date" className="select" style={{ paddingRight: 8 }} /></label>
        <span className="t-small muted hide-mobile">{t("proj.codeHint")}</span>
        <span style={{ flex: 1 }} />
        <span role="status" aria-live="polite" className="t-small" style={{ color: state.ok ? "var(--muted)" : "var(--red)" }}>{state.ok ? (state.nonce ? t("proj.created") : "") : state.message}</span>
        <button type="submit" className="btn btn-primary" disabled={pending}>{pending ? t("proj.creating") : t("proj.create")}</button>
      </div>
    </form>
  );
}
