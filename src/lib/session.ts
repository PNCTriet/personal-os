import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { appMode, env } from "@/lib/env";
import { AppError } from "@/lib/errors";
import type { RequestContext, Scope } from "@/lib/context";
import { createMemoryRepositories } from "@/lib/data/memory";
import { createSupabaseRepositories } from "@/lib/data/supabase";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const DEMO_USER = "00000000-0000-4000-8000-000000000001";

/**
 * Resolves the caller and picks the data implementation:
 *  - demo mode: no auth, in-memory store with seed data
 *  - supabase mode: owner-only session (getUser() is server-verified), RLS-enforced client
 * Returns null when a Supabase session is missing or not the owner.
 */
export const resolveScope = cache(async (source: RequestContext["source"] = "web"): Promise<Scope | null> => {
  if (appMode() === "demo") {
    return {
      ctx: { userId: DEMO_USER, actor: { type: "user", id: DEMO_USER }, source, mode: "demo", timezone: env.timezone, displayName: "Howls", email: null },
      repos: createMemoryRepositories(env.timezone),
    };
  }
  const db = await createSupabaseServerClient();
  const { data } = await db.auth.getUser();
  const user = data.user;
  if (!user || (user.email ?? "").toLowerCase() !== env.ownerEmail) return null;
  const { data: profile } = await db.from("profiles").select("display_name,timezone").eq("id", user.id).maybeSingle();
  const rawName = (profile?.display_name as string | undefined) || user.email || "there";
  return {
    ctx: {
      userId: user.id, actor: { type: "user", id: user.id }, source, mode: "supabase",
      timezone: (profile?.timezone as string | undefined) || env.timezone,
      displayName: rawName.includes("@") ? rawName.split("@")[0]! : rawName, email: user.email ?? null,
    },
    repos: createSupabaseRepositories(db, user.id),
  };
});

/** For pages/actions: redirects to /login when not signed in as the owner. */
export async function requireScope(): Promise<Scope> {
  const scope = await resolveScope("web");
  if (!scope) redirect("/login");
  return scope;
}

/** For /api/v1: 401 instead of a redirect. */
export async function requireApiScope(): Promise<Scope> {
  const scope = await resolveScope("api");
  if (!scope) throw new AppError("unauthenticated", "Sign in as the owner to use the API");
  return scope;
}
