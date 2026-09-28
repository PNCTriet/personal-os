import { NextResponse, type NextRequest } from "next/server";
import { appMode } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  if (appMode() === "supabase") {
    const db = await createSupabaseServerClient();
    await db.auth.signOut();
  }
  return NextResponse.redirect(new URL("/login", req.url), { status: 303 });
}
