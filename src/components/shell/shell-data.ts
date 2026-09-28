import "server-only";
import type { Scope } from "@/lib/context";
import { todayISO } from "@/lib/dates";
import { listCompanies } from "@/modules/companies";
import { listProjects } from "@/modules/projects";
import { isOpen, listTasks } from "@/modules/tasks";
import { getPreview } from "@/modules/preview";
import type { SearchIndex } from "./command-palette";

/** Small, serializable data for the shell: sidebar counts, ⌘K index, quick-add pickers. */
export async function loadShellData(scope: Scope) {
  const [tasks, projects, companies] = await Promise.all([listTasks(scope), listProjects(scope), listCompanies(scope)]);
  const preview = getPreview(scope);
  const today = todayISO(scope.ctx.timezone);
  const open = tasks.filter(isOpen);
  const index: SearchIndex = {
    tasks: tasks.slice(0, 300).map((t) => ({
      id: t.id, code: t.code, title: t.title, status: t.status,
      href: t.project_id ? `/projects/${projects.find((p) => p.id === t.project_id)?.code ?? ""}` : "/tasks?view=inbox",
    })),
    projects: projects.map((p) => ({ code: p.code, name: p.name })),
    people: preview.people.map((p) => ({ id: p.id, name: p.name, company: p.company })),
  };
  return {
    index,
    counts: {
      tasks: open.length,
      today: open.filter((t) => t.due_on !== null && t.due_on <= today).length,
      inbox: preview.inbox.filter((m) => m.unread).length,
    },
    pickers: {
      projects: projects.filter((p) => p.status !== "completed" && p.status !== "cancelled").map((p) => ({ id: p.id, code: p.code, name: p.name })),
      companies: companies.map((c) => ({ id: c.id, name: c.name })),
    },
  };
}
