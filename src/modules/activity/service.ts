import type { Scope } from "@/lib/context";
import type { ActivityAction, NewActivity } from "./domain";

/** Audit writer (ADR-011): written by the app so actor + source are captured. Never throws into the caller. */
export async function recordActivity(
  { ctx, repos }: Scope,
  action: ActivityAction,
  entity: { type: NonNullable<NewActivity["entity_type"]>; id: string },
  input: NewActivity["input"],
) {
  try {
    await repos.activity.record({
      actor_type: ctx.actor.type,
      source: ctx.source,
      action,
      entity_type: entity.type,
      entity_id: entity.id,
      input,
    });
  } catch (err) {
    console.error("audit write failed", { action, entityId: entity.id, err }); // R-07: log, don't fail the mutation
  }
}

export function listActivity({ repos }: Scope, opts: { limit?: number; entityIds?: string[] } = {}) {
  return repos.activity.list({ limit: Math.min(opts.limit ?? 20, 100), entityIds: opts.entityIds });
}
