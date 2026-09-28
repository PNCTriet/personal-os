import "server-only";
import type { Scope } from "@/lib/context";
import { todayISO } from "@/lib/dates";
import { getLocale } from "@/lib/i18n/server";
import { listCompanies } from "@/modules/companies";
import { listProjects } from "@/modules/projects";
import type { TaskLookups } from "./task-items";

export async function loadLookups(scope: Scope) {
  const [projects, companies, locale] = await Promise.all([listProjects(scope), listCompanies(scope), getLocale()]);
  const lk: TaskLookups = {
    today: todayISO(scope.ctx.timezone),
    locale,
    projects: new Map(projects.map((p) => [p.id, { code: p.code, name: p.name }])),
    companies: new Map(companies.map((c) => [c.id, c.name])),
  };
  const pickers = {
    projects: projects.filter((p) => p.status !== "completed" && p.status !== "cancelled").map((p) => ({ id: p.id, code: p.code, name: p.name })),
    companies: companies.map((c) => ({ id: c.id, name: c.name })),
  };
  return { lk, pickers, projects, companies };
}
