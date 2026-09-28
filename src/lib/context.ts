import type { AppMode } from "./env";
import type { CompanyRepository } from "@/modules/companies/repository";
import type { ProjectRepository } from "@/modules/projects/repository";
import type { TaskRepository } from "@/modules/tasks/repository";
import type { ActivityRepository } from "@/modules/activity/repository";

/** Who is acting, from where (architecture.md: RequestContext). */
export interface RequestContext {
  userId: string;
  actor: { type: "user" | "api_key" | "system"; id: string | null };
  source: "web" | "api";
  mode: AppMode;
  timezone: string;
  displayName: string;
  email: string | null;
}

export interface Repositories {
  companies: CompanyRepository;
  projects: ProjectRepository;
  tasks: TaskRepository;
  activity: ActivityRepository;
}

/** Everything a service call needs: the caller and the data access for this request. */
export interface Scope {
  ctx: RequestContext;
  repos: Repositories;
}
