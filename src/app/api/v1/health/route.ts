import { NextResponse } from "next/server";
import { appMode } from "@/lib/env";

export function GET() {
  return NextResponse.json({ data: { status: "ok", mode: appMode(), version: "0.1.0" }, meta: {} });
}
