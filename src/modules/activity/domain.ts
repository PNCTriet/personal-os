export type ActivityAction =
  | "project.create" | "project.update" | "project.delete"
  | "task.create" | "task.update" | "task.complete" | "task.reopen" | "task.move" | "task.delete";

export interface ActivityEntry {
  id: string;
  created_at: string;
  actor_type: "user" | "api_key" | "ai" | "system" | "integration";
  source: "web" | "api" | "mcp" | "ai_command" | "webhook" | "system";
  action: ActivityAction | string;
  entity_type: "company" | "project" | "task" | null;
  entity_id: string | null;
  /** Redacted, display-only fields (audit_logs.input). Never secrets. */
  input: { label?: string; code?: string | null; detail?: string } | null;
}

export type NewActivity = Omit<ActivityEntry, "id" | "created_at">;

const VERBS: Record<string, string> = {
  "project.create": "Created project",
  "project.update": "Updated project",
  "project.delete": "Deleted project",
  "task.create": "Added",
  "task.update": "Updated",
  "task.complete": "Completed",
  "task.reopen": "Reopened",
  "task.move": "Moved",
  "task.delete": "Deleted",
};

export function describe(e: ActivityEntry): { verb: string; subject: string; code: string | null; detail?: string } {
  return {
    verb: VERBS[e.action] ?? e.action,
    subject: e.input?.label ?? "",
    code: e.input?.code ?? null,
    detail: e.input?.detail,
  };
}

export function actorLabel(e: ActivityEntry): string {
  if (e.actor_type === "user") return e.source === "api" ? "You · API" : "You";
  if (e.actor_type === "api_key") return "API key";
  if (e.actor_type === "ai") return "AI";
  return "System";
}
