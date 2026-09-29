import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { appMode } from "@/lib/env";
import { getI18n } from "@/lib/i18n/server";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in" };
export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if (appMode() === "demo") redirect("/");
  const { error } = await searchParams;
  const { t } = await getI18n();
  return (
    <div className="auth-screen">
      <div className="auth-card">
        <h1 className="auth-title">{t("login.title")}</h1>
        <p className="auth-sub">{t("login.subtitle")}</p>
        {error && <div className="auth-alert" role="alert">{t("login.expired")}</div>}
        <LoginForm />
      </div>
    </div>
  );
}
