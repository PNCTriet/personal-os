import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { appMode } from "@/lib/env";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in" };
export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if (appMode() === "demo") redirect("/");
  const { error } = await searchParams;
  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 16 }}>
      <div className="panel" style={{ width: "100%", maxWidth: 380, padding: 24 }}>
        <h1 className="t-title">Sign in</h1>
        <p className="muted" style={{ margin: "4px 0 16px" }}>This workspace has one owner. We’ll email you a sign-in link.</p>
        {error && <p className="t-small tone-red" role="alert">That link has expired or was already used. Request a new one.</p>}
        <LoginForm />
      </div>
    </div>
  );
}
