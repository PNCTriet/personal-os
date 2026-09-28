"use client";

import { useActionState } from "react";
import { sendMagicLink, type FormState } from "@/app/actions";

export function LoginForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(sendMagicLink, { ok: true });
  return (
    <form action={action} style={{ display: "grid", gap: 16 }}>
      <input type="email" name="email" className="field" placeholder="Email address" aria-label="Email address" autoComplete="email" required />
      <button type="submit" className="btn btn-primary" disabled={pending}>{pending ? "Sending…" : "Email me a sign-in link"}</button>
      <p role="status" aria-live="polite" className="t-caption" style={{ minHeight: 20, color: "var(--text-muted)", margin: 0 }}>{state.message}</p>
    </form>
  );
}
