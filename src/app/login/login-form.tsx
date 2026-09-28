"use client";

import { useActionState } from "react";
import { sendMagicLink, type FormState } from "@/app/actions";

export function LoginForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(sendMagicLink, { ok: true });
  return (
    <form action={action} style={{ display: "grid", gap: 10 }}>
      <input type="email" name="email" className="field" placeholder="Email address" aria-label="Email address" autoComplete="email" required style={{ height: 34 }} />
      <button type="submit" className="btn btn-primary" disabled={pending} style={{ height: 34 }}>{pending ? "Sending…" : "Email me a sign-in link"}</button>
      <p role="status" aria-live="polite" className="t-small muted" style={{ minHeight: 18, margin: 0 }}>{state.message}</p>
    </form>
  );
}
