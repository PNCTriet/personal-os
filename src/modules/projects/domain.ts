export const PROJECT_STATUSES = ["planned", "active", "on_hold", "completed", "cancelled"] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export const PROJECT_STATUS_LABEL: Record<ProjectStatus, string> = {
  planned: "Planned",
  active: "Active",
  on_hold: "On hold",
  completed: "Completed",
  cancelled: "Cancelled",
};

/** ADR-006: owner-chosen, immutable, never reused. e.g. HOWL-POS-01 */
export const PROJECT_CODE_RE = /^[A-Z][A-Z0-9]*(-[A-Z0-9]+)+$/;

export interface Project {
  id: string;
  code: string;
  name: string;
  description: string | null;
  status: ProjectStatus;
  company_id: string | null;
  start_date: string | null;
  target_date: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
}

export interface ProjectStats {
  total: number;
  open: number;
  done: number;
  overdue: number;
  in_progress: number;
  /** 0..1, done / (total - cancelled) */
  progress: number;
}

export type NewProject = Pick<Project, "code" | "name"> &
  Partial<Pick<Project, "description" | "status" | "company_id" | "start_date" | "target_date">>;
export type ProjectPatch = Partial<Omit<NewProject, "code">> & { completed_at?: string | null; archived_at?: string | null };
