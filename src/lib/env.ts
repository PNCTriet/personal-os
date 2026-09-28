import "server-only";

/**
 * Mode selection: Supabase mode when the three Supabase/owner vars are present,
 * otherwise zero-secret demo mode (in-memory store with seed data, no auth).
 */
export type AppMode = "demo" | "supabase";

export const env = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "",
  ownerEmail: (process.env.OWNER_EMAIL ?? "").trim().toLowerCase(),
  appUrl: process.env.APP_URL ?? "http://localhost:3000",
  timezone: process.env.OWNER_TIMEZONE ?? "Asia/Ho_Chi_Minh",
};

export function appMode(): AppMode {
  if (process.env.DEMO_MODE === "1") return "demo";
  return env.supabaseUrl && env.supabaseKey && env.ownerEmail ? "supabase" : "demo";
}
