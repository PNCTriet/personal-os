import type { Metadata } from "next";
import { FolderKanban } from "lucide-react";
import { requireScope } from "@/lib/session";
import { getI18n } from "@/lib/i18n/server";
import { listProjectsWithStats, PROJECT_STATUS_LABEL } from "@/modules/projects";
import { listCompanies } from "@/modules/companies";
import { DataTable, type Row } from "@/components/ui/data-table";
import { EmptyState, PageHeader, Panel } from "@/components/ui/page";
import { NewProject } from "@/components/new-project";

export const metadata: Metadata = { title: "Projects" };
export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  const scope = await requireScope();
  const [projects, companies, { t }] = await Promise.all([listProjectsWithStats(scope), listCompanies(scope), getI18n()]);
  const company = new Map(companies.map((c) => [c.id, c.name]));
  const rank = { active: 0, planned: 1, on_hold: 2, completed: 3, cancelled: 4 } as const;
  const rows: Row[] = projects.filter((p) => !p.archived_at).map((p) => ({
    id: p.id, href: `/projects/${p.code}`, name: p.name, code: p.code, company: p.company_id ? company.get(p.company_id) ?? null : null,
    status: p.status, statusRank: rank[p.status], progress: p.stats.progress, open: p.stats.open, overdue: p.stats.overdue || null,
    target: p.target_date,
  }));
  return (
    <>
      <PageHeader title={t("nav.projects")} subtitle={t("proj.subtitle", { n: rows.length, active: projects.filter((p) => p.status === "active").length })}
        actions={<a href="#new" className="btn btn-primary">{t("proj.new")}</a>} />
      <div className="panel" style={{ marginBottom: 12 }}>
        <DataTable
          rows={rows}
          noun="project"
          searchKeys={["name", "code", "company"]}
          facets={[{ key: "status", label: "Status", labels: PROJECT_STATUS_LABEL }, { key: "company", label: "Company" }]}
          defaultSort={{ key: "status", dir: "asc" }}
          columns={[
            { key: "name", label: "Project", kind: "strong" },
            { key: "code", label: "Code", kind: "mono", width: 130 },
            { key: "company", label: "Company", width: 160 },
            { key: "status", label: "Status", kind: "pill", sortKey: "statusRank", labels: PROJECT_STATUS_LABEL, tones: { active: "blue", planned: "gray", on_hold: "orange", completed: "green", cancelled: "none" }, width: 120 },
            { key: "progress", label: "Progress", kind: "progress", width: 180 },
            { key: "open", label: "Open", kind: "number", align: "right", width: 70 },
            { key: "overdue", label: "Overdue", kind: "number", align: "right", width: 80 },
            { key: "target", label: "Target", kind: "date", width: 90 },
          ]}
          empty={<EmptyState icon={FolderKanban} title={t("proj.none")} body={t("proj.noneBody")} />}
        />
      </div>
      <Panel title={t("proj.new")} style={{ maxWidth: 760 }}>
        <div id="new" style={{ scrollMarginTop: 64 }}><NewProject /></div>
      </Panel>
    </>
  );
}
