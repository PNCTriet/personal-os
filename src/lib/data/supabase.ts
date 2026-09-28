import "server-only";
import type { Repositories } from "@/lib/context";
import { fromPg, notFound } from "@/lib/errors";
import type { SupabaseServerClient } from "@/lib/supabase/server";
import { UUID_RE, type Task } from "@/modules/tasks";
import type { Project } from "@/modules/projects";
import type { Company } from "@/modules/companies";
import type { ActivityEntry } from "@/modules/activity";

/**
 * Supabase implementation (ADR-003: supabase-js, no ORM). Uses the owner's session client, so RLS applies;
 * user_id is still set/filtered explicitly (defense in depth). Task codes come from the DB trigger.
 * TODO(P1-T06): replace the explicit column lists with generated `Database` types.
 */
const PROJECT_COLS = "id,code,name,description,status,company_id,start_date,target_date,completed_at,created_at,updated_at,archived_at";
const TASK_COLS = "id,code,previous_codes,project_id,title,description,status,priority,kind,due_on,completed_at,company_id,created_at,updated_at";
const COMPANY_COLS = "id,name,domain,website,industry,created_at,updated_at";

function must<T>(res: { data: T | null; error: { code?: string; message?: string } | null }): T {
  if (res.error) throw fromPg(res.error);
  return res.data as T;
}

export function createSupabaseRepositories(db: SupabaseServerClient, userId: string): Repositories {
  return {
    companies: {
      async list() {
        return must(await db.from("companies").select(COMPANY_COLS).eq("user_id", userId).is("deleted_at", null).order("name")) as Company[];
      },
      async get(id) {
        if (!UUID_RE.test(id)) return null;
        return must(await db.from("companies").select(COMPANY_COLS).eq("user_id", userId).eq("id", id).is("deleted_at", null).maybeSingle()) as Company | null;
      },
    },

    projects: {
      async list(opts) {
        let q = db.from("projects").select(PROJECT_COLS).eq("user_id", userId).is("deleted_at", null);
        if (!opts?.includeArchived) q = q.is("archived_at", null);
        return must(await q.order("code")) as Project[];
      },
      async get(ref) {
        const col = UUID_RE.test(ref) ? "id" : "code";
        return must(await db.from("projects").select(PROJECT_COLS).eq("user_id", userId).eq(col, UUID_RE.test(ref) ? ref : ref.toUpperCase()).is("deleted_at", null).maybeSingle()) as Project | null;
      },
      async create(input) {
        return must(await db.from("projects").insert({ ...input, user_id: userId }).select(PROJECT_COLS).single()) as Project;
      },
      async update(id, patch) {
        const row = must(await db.from("projects").update(patch).eq("user_id", userId).eq("id", id).select(PROJECT_COLS).maybeSingle());
        if (!row) throw notFound("Project");
        return row as Project;
      },
      async softDelete(id) {
        must(await db.from("projects").update({ deleted_at: new Date().toISOString() }).eq("user_id", userId).eq("id", id));
      },
    },

    tasks: {
      async list(f) {
        let q = db.from("tasks").select(TASK_COLS).eq("user_id", userId).is("deleted_at", null);
        if (f.project_id) q = q.eq("project_id", f.project_id);
        if (f.statuses?.length) q = q.in("status", f.statuses);
        if (f.priorities?.length) q = q.in("priority", f.priorities);
        if (f.kind) q = q.eq("kind", f.kind);
        if (f.due_before) q = q.lte("due_on", f.due_before);
        if (f.due_after) q = q.gte("due_on", f.due_after);
        if (f.q) q = q.or(`title.ilike.%${f.q.replace(/[%,()]/g, "")}%,code.ilike.%${f.q.replace(/[%,()]/g, "")}%`);
        return must(await q.limit(1000)) as Task[];
      },
      async get(ref) {
        if (UUID_RE.test(ref)) {
          return must(await db.from("tasks").select(TASK_COLS).eq("user_id", userId).eq("id", ref).is("deleted_at", null).maybeSingle()) as Task | null;
        }
        const code = ref.toUpperCase();
        const rows = must(await db.from("tasks").select(TASK_COLS).eq("user_id", userId).is("deleted_at", null)
          .or(`code.eq.${code},previous_codes.cs.{${code}}`).limit(1)) as Task[];
        return rows[0] ?? null;
      },
      async create(input) {
        return must(await db.from("tasks").insert({ ...input, user_id: userId }).select(TASK_COLS).single()) as Task;
      },
      async update(id, patch) {
        const row = must(await db.from("tasks").update(patch).eq("user_id", userId).eq("id", id).select(TASK_COLS).maybeSingle());
        if (!row) throw notFound("Task");
        return row as Task;
      },
      async softDelete(id) {
        must(await db.from("tasks").update({ deleted_at: new Date().toISOString() }).eq("user_id", userId).eq("id", id));
      },
    },

    activity: {
      async record(e) {
        must(await db.from("audit_logs").insert({
          user_id: userId, actor_type: e.actor_type, actor_id: e.actor_type === "user" ? userId : null, source: e.source,
          action: e.action, category: e.action.endsWith(".delete") ? "delete" : "write", entity_type: e.entity_type,
          entity_id: e.entity_id, status: "success", input: e.input,
        }));
      },
      async list({ limit, entityIds }) {
        let q = db.from("audit_logs").select("id,created_at,actor_type,source,action,entity_type,entity_id,input")
          .eq("user_id", userId).eq("status", "success");
        if (entityIds) q = q.in("entity_id", entityIds.length ? entityIds : ["00000000-0000-0000-0000-000000000000"]);
        const rows = must(await q.order("created_at", { ascending: false }).limit(limit)) as (ActivityEntry & { id: number })[];
        return rows.map((r) => ({ ...r, id: String(r.id) }));
      },
    },
  };
}
