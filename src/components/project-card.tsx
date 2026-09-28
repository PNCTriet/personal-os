import Link from "next/link";
import { shortDate } from "@/lib/dates";
import { PROJECT_STATUS_LABEL, type Project, type ProjectStats } from "@/modules/projects";

export function ProjectCard({ project, stats, company }: { project: Project; stats: ProjectStats; company?: string }) {
  const pct = Math.round(stats.progress * 100);
  return (
    <Link href={`/projects/${project.code}`} className="card card-link" style={{ display: "flex", flexDirection: "column", gap: 12, height: "100%" }}>
      <div className="t-caption" style={{ color: "var(--text-muted)", display: "flex", justifyContent: "space-between", gap: 8 }}>
        <span className="tabular">{project.code}</span>
        <span>{PROJECT_STATUS_LABEL[project.status]}</span>
      </div>
      <div>
        <div className="t-tagline">{project.name}</div>
        {company && <div className="t-caption" style={{ color: "var(--text-muted)" }}>{company}</div>}
      </div>
      <p className="t-caption" style={{ margin: 0, color: "var(--text-secondary)", flex: 1, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
        {project.description}
      </p>
      <div className="progress" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={`${project.name} progress`}>
        <span style={{ transform: `scaleX(${stats.progress})` }} />
      </div>
      <div className="t-caption tabular" style={{ color: "var(--text-muted)", display: "flex", justifyContent: "space-between", gap: 8 }}>
        <span>{stats.done} of {stats.open + stats.done} done{stats.overdue ? ` · ${stats.overdue} overdue` : ""}</span>
        {project.target_date && <span>{project.status === "completed" ? "Shipped" : "Due"} {shortDate(project.target_date)}</span>}
      </div>
    </Link>
  );
}
