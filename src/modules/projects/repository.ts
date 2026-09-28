import type { NewProject, Project, ProjectPatch } from "./domain";

export interface ProjectRepository {
  list(opts?: { includeArchived?: boolean }): Promise<Project[]>;
  /** UUID or project code. */
  get(ref: string): Promise<Project | null>;
  create(input: NewProject): Promise<Project>;
  update(id: string, patch: ProjectPatch): Promise<Project>;
  softDelete(id: string): Promise<void>;
}
