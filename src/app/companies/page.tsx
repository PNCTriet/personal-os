import type { Metadata } from "next";
import { Building2 } from "lucide-react";
import { requireScope } from "@/lib/session";
import { listCompanies } from "@/modules/companies";
import { listProjects } from "@/modules/projects";
import { isOpen, listTasks } from "@/modules/tasks";
import { getPreview } from "@/modules/preview";
import { DataTable } from "@/components/ui/data-table";
import { EmptyState, PageHeader } from "@/components/ui/page";

export const metadata: Metadata = { title: "Companies" };
export const dynamic = "force-dynamic";

export default async function CompaniesPage() {
  const scope = await requireScope();
  const [companies, projects, tasks] = await Promise.all([listCompanies(scope), listProjects(scope), listTasks(scope)]);
  const people = getPreview(scope).people;
  const rows = companies.map((c) => ({
    id: c.id, name: c.name, domain: c.domain, industry: c.industry,
    projects: projects.filter((p) => p.company_id === c.id).length,
    followUps: tasks.filter((t) => t.company_id === c.id && t.kind === "follow_up" && isOpen(t)).length,
    people: people.filter((p) => p.company === c.name).length,
  }));
  return (
    <>
      <PageHeader title="Companies" subtitle={`${rows.length} companies · linked to projects and follow-ups`} />
      <div className="panel">
        <DataTable
          rows={rows}
          noun="company"
          searchKeys={["name", "domain", "industry"]}
          facets={[{ key: "industry", label: "Industry" }]}
          defaultSort={{ key: "name", dir: "asc" }}
          columns={[
            { key: "name", label: "Company", kind: "strong" },
            { key: "domain", label: "Domain", kind: "mono", width: 180 },
            { key: "industry", label: "Industry", width: 180 },
            { key: "projects", label: "Projects", kind: "number", align: "right", width: 90 },
            { key: "people", label: "People", kind: "number", align: "right", width: 90 },
            { key: "followUps", label: "Open follow-ups", kind: "number", align: "right", width: 130 },
          ]}
          empty={<EmptyState icon={Building2} title="No companies yet" body="Companies are created with projects and follow-ups. Editing ships in Phase 4." />}
        />
      </div>
    </>
  );
}
