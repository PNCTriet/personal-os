"use client";

import { useActionState } from "react";
import { Mail } from "lucide-react";
import { sendMagicLink, type FormState } from "@/app/actions";
import { useI18n } from "@/lib/i18n/client";

export function LoginForm() {
  const { t } = useI18n();
  const [state, action, pending] = useActionState<FormState, FormData>(sendMagicLink, { ok: true });
  return (
    <form action={action} style={{ display: "grid", gap: 12 }}>
      <p className="t-small muted" style={{ margin: 0, textAlign: "center" }}>{t("login.emailHint")}</p>
      <label className="sr-only" htmlFor="login-email">{t("login.email")}</label>
      <div style={{ position: "relative" }}>
        <Mail size={16} aria-hidden="true" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--placeholder)" }} />
        <input id="login-email" type="email" name="email" className="field" placeholder={t("login.email")} autoComplete="email" required style={{ paddingLeft: 36 }} />
      </div>
      <button type="submit" className="btn btn-primary btn-lg btn-block" disabled={pending}>{pending ? t("login.sending") : t("login.submit")}</button>
      <p role="status" aria-live="polite" className="t-small muted" style={{ minHeight: 18, margin: 0, textAlign: "center" }}>{state.message}</p>
    </form>
  );
}
