import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import { ZodError } from "zod";
import { AppError } from "@/lib/errors";
import { appMode, env } from "@/lib/env";
import type { Scope } from "@/lib/context";
import { requireApiScope } from "@/lib/session";

/** api.md §1 envelopes: { data, meta } on success, { error: { code, message, details?, request_id } } on failure. */
export function ok<T>(data: T, init: { status?: number; meta?: Record<string, unknown>; requestId: string }) {
  return NextResponse.json({ data, meta: { request_id: init.requestId, ...init.meta } }, { status: init.status ?? 200 });
}

function fail(err: unknown, requestId: string) {
  let e: AppError;
  if (err instanceof AppError) e = err;
  else if (err instanceof ZodError) {
    e = new AppError("validation_error", "Request validation failed", err.issues.map((i) => ({ path: i.path.join("."), message: i.message })));
  } else if (err instanceof SyntaxError) e = new AppError("validation_error", "Body must be valid JSON");
  else {
    console.error("unhandled", { requestId, err });
    e = new AppError("internal_error", "Something went wrong");
  }
  return NextResponse.json(
    { error: { code: e.code, message: e.message, ...(e.details !== undefined ? { details: e.details } : {}), request_id: requestId } },
    { status: e.status },
  );
}

type Handler<P> = (args: { req: NextRequest; scope: Scope; params: P; requestId: string }) => Promise<Response>;

/** Route wrapper: request id → CSRF Origin check for cookie mutations → owner auth → handler → error mapping. */
export function route<P = Record<string, never>>(handler: Handler<P>) {
  return async (req: NextRequest, ctx: { params: Promise<P> }) => {
    const requestId = req.headers.get("x-request-id") ?? crypto.randomUUID();
    try {
      if (req.method !== "GET" && appMode() === "supabase") {
        const origin = req.headers.get("origin");
        if (origin && origin !== new URL(env.appUrl).origin) throw new AppError("forbidden", "Cross-origin request rejected");
      }
      const scope = await requireApiScope();
      return await handler({ req, scope, params: await ctx.params, requestId });
    } catch (err) {
      return fail(err, requestId);
    }
  };
}

export async function jsonBody(req: NextRequest): Promise<unknown> {
  const text = await req.text();
  return text ? JSON.parse(text) : {};
}

export function queryObject(req: NextRequest): Record<string, string | string[]> {
  const out: Record<string, string | string[]> = {};
  for (const key of new Set(req.nextUrl.searchParams.keys())) {
    const all = req.nextUrl.searchParams.getAll(key);
    out[key] = all.length > 1 ? all : all[0]!;
  }
  return out;
}

/** Opaque cursor over a stable, already-sorted list. */
export function paginate<T>(items: T[], limit: number, cursor?: string) {
  const offset = cursor ? Number(Buffer.from(cursor, "base64url").toString()) || 0 : 0;
  const page = items.slice(offset, offset + limit);
  const next = offset + limit < items.length ? Buffer.from(String(offset + limit)).toString("base64url") : null;
  return { page, meta: { next_cursor: next, count: page.length, total: items.length } };
}
