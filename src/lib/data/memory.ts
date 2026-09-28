import "server-only";
import type { Repositories } from "@/lib/context";
import { conflict, notFound } from "@/lib/errors";
import { UUID_RE, type Task, type TaskFilter } from "@/modules/tasks";
import type { Project } from "@/modules/projects";
import { buildDemoData, type DemoData } from "./demo-seed";

/**
 * Zero-secret demo store. Lives in process memory (per server instance) and resets on restart —
 * the same repository contracts as the Supabase implementation, so services don't know the difference.
 */
const g = globalThis as unknown as { __posDemo?: DemoData };
function store(tz: string): DemoData {
  g.__posDemo ??= buildDemoData(tz);
  return g.__posDemo;
}

const now = () => new Date().toISOString();
const clone = <T>(v: T): T => structuredClone(v);
function strip<T extends { deleted_at?: unknown; next_task_seq?: unknown }>(row: T) {
  const { deleted_at: _d, next_task_seq: _n, ...rest } = row;
  void _d; void _n;
  return clone(rest);
}

export function createMemoryRepositories(tz: string): Repositories {
  const db = store(tz);
  const liveProjects = () => db.projects.filter((p) => !p.deleted_at);
  const liveTasks = () => db.tasks.filter((t) => !t.deleted_at);

  const nextCode = (projectId: string) => {
    const p = db.projects.find((x) => x.id === projectId);
    if (!p) throw notFound("Project");
    return `${p.code}-T${String(p.next_task_seq++).padStart(2, "0")}`;
  };

  return {
    companies: {
      async list() {
        return clone([...db.companies].sort((a, b) => a.name.localeCompare(b.name)));
      },
      async get(id) {
        return clone(db.companies.find((c) => c.id === id) ?? null);
      },
    },

    projects: {
      async list(opts) {
        return liveProjects()
          .filter((p) => opts?.includeArchived || !p.archived_at)
          .sort((a, b) => a.code.localeCompare(b.code))
          .map((p) => strip(p) as Project);
      },
      async get(ref) {
        const p = UUID_RE.test(ref) ? liveProjects().find((x) => x.id === ref) : liveProjects().find((x) => x.code === ref.toUpperCase());
        return p ? (strip(p) as Project) : null;
      },
      async create(input) {
        if (db.projects.some((p) => p.code === input.code)) throw conflict(`Project code ${input.code} is taken`);
        const row = {
          id: crypto.randomUUID(), code: input.code, name: input.name, description: input.description ?? null,
          status: input.status ?? "active", company_id: input.company_id ?? null, start_date: input.start_date ?? null,
          target_date: input.target_date ?? null, completed_at: input.status === "completed" ? now() : null,
          created_at: now(), updated_at: now(), archived_at: null, next_task_seq: 1, deleted_at: null,
        } satisfies DemoData["projects"][number];
        db.projects.push(row);
        return strip(row) as Project;
      },
      async update(id, patch) {
        const p = liveProjects().find((x) => x.id === id);
        if (!p) throw notFound("Project");
        Object.assign(p, patch, { updated_at: now() });
        return strip(p) as Project;
      },
      async softDelete(id) {
        const p = liveProjects().find((x) => x.id === id);
        if (p) p.deleted_at = now();
      },
    },

    tasks: {
      async list(f: TaskFilter) {
        const q = f.q?.toLowerCase();
        return liveTasks()
          .filter((t) =>
            (!f.project_id || t.project_id === f.project_id) &&
            (!f.statuses?.length || f.statuses.includes(t.status)) &&
            (!f.priorities?.length || f.priorities.includes(t.priority)) &&
            (!f.kind || t.kind === f.kind) &&
            (!f.due_before || (t.due_on !== null && t.due_on <= f.due_before)) &&
            (!f.due_after || (t.due_on !== null && t.due_on >= f.due_after)) &&
            (!q || t.title.toLowerCase().includes(q) || (t.code ?? "").toLowerCase().includes(q)))
          .map((t) => strip(t) as Task);
      },
      async get(ref) {
        const r = ref.toUpperCase();
        const t = UUID_RE.test(ref)
          ? liveTasks().find((x) => x.id === ref)
          : liveTasks().find((x) => x.code === r) ?? liveTasks().find((x) => x.previous_codes.includes(r));
        return t ? (strip(t) as Task) : null;
      },
      async create(input) {
        const row: DemoData["tasks"][number] = {
          id: crypto.randomUUID(), code: input.project_id ? nextCode(input.project_id) : null, previous_codes: [],
          project_id: input.project_id ?? null, title: input.title, description: input.description ?? null,
          status: input.status ?? "todo", priority: input.priority ?? "normal", kind: input.kind ?? "task",
          due_on: input.due_on ?? null, completed_at: input.completed_at ?? null, company_id: input.company_id ?? null,
          created_at: now(), updated_at: now(), deleted_at: null,
        };
        db.tasks.push(row);
        return strip(row) as Task;
      },
      async update(id, patch) {
        const t = liveTasks().find((x) => x.id === id);
        if (!t) throw notFound("Task");
        if (patch.project_id && patch.project_id !== t.project_id) {
          // ADR-006: re-code on move, keep the old code resolvable
          if (t.code) t.previous_codes = [...t.previous_codes, t.code];
          t.code = nextCode(patch.project_id);
        }
        Object.assign(t, patch, { updated_at: now() });
        return strip(t) as Task;
      },
      async softDelete(id) {
        const t = liveTasks().find((x) => x.id === id);
        if (t) t.deleted_at = now();
      },
    },

    activity: {
      async record(e) {
        db.activity.unshift({ ...clone(e), id: crypto.randomUUID(), created_at: now() });
        db.activity.length = Math.min(db.activity.length, 500);
      },
      async list({ limit, entityIds }) {
        return clone(db.activity.filter((a) => !entityIds || (a.entity_id && entityIds.includes(a.entity_id))).slice(0, limit));
      },
    },
  };
}
