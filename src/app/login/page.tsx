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
    <section className="tile tile-hero" style={{ minHeight: "70vh" }}>
      <div className="container" style={{ maxWidth: 520, textAlign: "center" }}>
        <h1 className="t-hero" style={{ margin: 0 }}>Sign in.</h1>
        <p className="t-lead" style={{ margin: "16px 0 32px", color: "var(--text-secondary)" }}>This workspace has one owner. We’ll email you a link.</p>
        {error && <p className="t-caption" role="alert">That link has expired or was already used. Request a new one.</p>}
        <LoginForm />
      </div>
    </section>
  );
}
