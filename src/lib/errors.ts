export type ErrorCode =
  | "validation_error"
  | "unauthenticated"
  | "forbidden"
  | "not_found"
  | "conflict"
  | "internal_error";

const STATUS: Record<ErrorCode, number> = {
  validation_error: 422,
  unauthenticated: 401,
  forbidden: 403,
  not_found: 404,
  conflict: 409,
  internal_error: 500,
};

export class AppError extends Error {
  constructor(
    public readonly code: ErrorCode,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
  }
  get status() {
    return STATUS[this.code];
  }
}

export const notFound = (what: string) => new AppError("not_found", `${what} not found`);
export const conflict = (message: string) => new AppError("conflict", message);

/** Maps Postgres error codes surfaced by supabase-js to AppErrors (api.md §1). */
export function fromPg(e: { code?: string; message?: string }): AppError {
  if (e.code === "23505") return conflict(e.message ?? "Already exists");
  if (e.code === "23514" || e.code === "P0001") return conflict(e.message ?? "Constraint violated");
  if (e.code === "23503") return new AppError("validation_error", "Referenced record does not exist");
  if (e.code === "42501") return new AppError("forbidden", "Not allowed");
  return new AppError("internal_error", "Database error");
}
