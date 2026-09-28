import { addDays, todayISO } from "@/lib/dates";
import type { Company } from "@/modules/companies";
import type { Project } from "@/modules/projects";
import type { Task } from "@/modules/tasks";
import type { ActivityEntry } from "@/modules/activity";

export interface DemoData {
  companies: Company[];
  projects: (Project & { next_task_seq: number; deleted_at: string | null })[];
  tasks: (Task & { deleted_at: string | null })[];
  activity: ActivityEntry[];
}

type SeedTask = [title: string, status: Task["status"], priority: Task["priority"], dueOffset: number | null, kind?: Task["kind"]];

/** Realistic HOWL LAB data. Dates are relative to "today" so the demo always looks current. */
export function buildDemoData(tz: string): DemoData {
  const today = todayISO(tz);
  const now = Date.now();
  const ts = (minutesAgo: number) => new Date(now - minutesAgo * 60_000).toISOString();
  const id = () => crypto.randomUUID();

  const howl: Company = { id: id(), name: "HOWL LAB", domain: "howllab.vn", website: null, industry: "Software studio", created_at: ts(90 * 1440), updated_at: ts(90 * 1440) };
  const mekong: Company = { id: id(), name: "Mekong Trails", domain: "mekongtrails.vn", website: null, industry: "Tour operator", created_at: ts(40 * 1440), updated_at: ts(40 * 1440) };
  const lotus: Company = { id: id(), name: "Lotus Print Co.", domain: null, website: null, industry: "Print & merch", created_at: ts(20 * 1440), updated_at: ts(20 * 1440) };

  const project = (code: string, name: string, description: string, status: Project["status"], company: Company | null, start: number, target: number) => ({
    id: id(), code, name, description, status, company_id: company?.id ?? null,
    start_date: addDays(today, start), target_date: addDays(today, target),
    completed_at: status === "completed" ? ts(3 * 1440) : null,
    created_at: ts(-start * 1440), updated_at: ts(120), archived_at: null, next_task_seq: 1, deleted_at: null,
  });

  const pos = project("HOWL-POS-01", "Personal OS", "API-first operating system for work, time, money and relationships. Phase 1: Core OS.", "active", howl, -6, 28);
  const vto = project("HOWL-VTO-01", "Vietnam Tour Ops", "Booking, itinerary and partner operations for the Q4 Mekong Delta tour series.", "active", mekong, -20, 45);
  const web = project("HOWL-WEB-01", "HOWL LAB website", "New studio site: case studies, services, contact. Static, fast, bilingual.", "planned", howl, 10, 60);
  const brand = project("HOWL-BRD-01", "Brand refresh", "Logo lockups, type system and merch run with Lotus Print.", "completed", lotus, -60, -5);
  const projects = [pos, vto, web, brand];

  const tasks: DemoData["tasks"] = [];
  const add = (p: (typeof projects)[number] | null, seed: SeedTask, company: Company | null = null, ageMin = 3000) => {
    const [title, status, priority, due, kind = "task"] = seed;
    const code = p ? `${p.code}-T${String(p.next_task_seq++).padStart(2, "0")}` : null;
    tasks.push({
      id: id(), code, previous_codes: [], project_id: p?.id ?? null, title, description: null, status, priority, kind,
      due_on: due === null ? null : addDays(today, due), completed_at: status === "done" ? ts(ageMin / 3) : null,
      company_id: company?.id ?? null, created_at: ts(ageMin), updated_at: ts(ageMin / 4), deleted_at: null,
    });
  };

  // Personal OS — the real Phase 1 plan (docs/phase-1-plan.md)
  ([
    ["Repo scaffold", "done", "high", -5],
    ["CI base: typecheck, lint, build", "done", "high", -4],
    ["Env & config validation", "done", "normal", -4],
    ["Supabase local + Phase 1 migration", "done", "high", -3],
    ["DB/RLS tests + CI migration job", "in_progress", "high", -1],
    ["Supabase clients + generated types", "in_progress", "normal", 0],
    ["Single-user auth (magic link)", "todo", "urgent", 0],
    ["Deploy walking skeleton to Vercel", "todo", "high", 1],
    ["HTTP foundation: route wrapper, Zod, errors", "todo", "high", 2],
    ["Observability: pino + Sentry", "backlog", "low", 6],
    ["Permission layer (operation registry)", "todo", "high", 4],
    ["Audit writer + redaction", "todo", "normal", 5],
    ["API keys", "todo", "normal", 8],
    ["Tasks module: state machine + codes", "todo", "high", 9],
    ["Approvals (confirmation flow)", "backlog", "normal", 13],
    ["Dashboard v0, projects, tasks UI", "todo", "high", 15],
  ] as SeedTask[]).forEach((s, i) => add(pos, s, null, 7000 - i * 300));

  ([
    ["Confirm homestay allocation for Ben Tre", "done", "high", -6],
    ["Draft day-by-day itinerary v2", "in_progress", "high", 2],
    ["Collect guide licenses", "blocked", "normal", -2],
    ["Price sheet for November departures", "todo", "urgent", 0],
  ] as SeedTask[]).forEach((s, i) => add(vto, s, null, 20000 - i * 900));
  add(vto, ["Follow up with Mekong Trails on Q4 contract", "todo", "high", 1, "follow_up"], mekong, 2500);
  add(vto, ["Partner kickoff call", "done", "normal", -9, "milestone"], null, 18000);

  ([
    ["Site map and content outline", "todo", "normal", 12],
    ["Collect three case studies", "backlog", "normal", 20],
  ] as SeedTask[]).forEach((s) => add(web, s));
  ([
    ["Final logo lockups", "done", "high", -12],
    ["Merch proof sign-off", "done", "normal", -6],
  ] as SeedTask[]).forEach((s) => add(brand, s, null, 30000));
  add(null, ["Renew passport", "todo", "high", 3]);
  add(null, ["Send invoice reminder to Lotus Print", "todo", "normal", -1, "follow_up"], lotus, 4000);

  const t = (code: string) => tasks.find((x) => x.code === code)!;
  const act = (minutesAgo: number, action: string, e: { id: string; code: string | null; title?: string; name?: string }, type: "task" | "project", detail?: string): ActivityEntry => ({
    id: id(), created_at: ts(minutesAgo), actor_type: "user", source: minutesAgo === 95 ? "api" : "web", action,
    entity_type: type, entity_id: e.id, input: { label: e.title ?? e.name ?? "", code: e.code, detail },
  });
  const activity: ActivityEntry[] = [
    act(12, "task.update", t("HOWL-POS-01-T06"), "task"),
    act(38, "task.complete", t("HOWL-POS-01-T04"), "task"),
    act(95, "task.create", t("HOWL-VTO-01-T05"), "task"),
    act(180, "task.complete", t("HOWL-POS-01-T03"), "task"),
    act(260, "task.update", t("HOWL-VTO-01-T02"), "task"),
    act(1440 + 30, "task.complete", t("HOWL-POS-01-T02"), "task"),
    act(1440 * 2, "project.create", { id: pos.id, code: pos.code, name: pos.name }, "project"),
  ];

  return { companies: [howl, mekong, lotus], projects, tasks, activity };
}
