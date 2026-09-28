import type { Metadata } from "next";
import { requireScope } from "@/lib/session";
import { listProjectsWithStats } from "@/modules/projects";
import { listCompanies } from "@/modules/companies";
import { Reveal } from "@/components/reveal";
import { SubNav } from "@/components/sub-nav";
import { ProjectCard } from "@/components/project-card";
import { NewProject } from "@/components/new-project";

export const metadata: Metadata = { title: "Projects" };
export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  const scope = await requireScope();
  const [projects, companies] = await Promise.all([listProjectsWithStats(scope), listCompanies(scope)]);
  const companyName = new Map(companies.map((c) => [c.id, c.name]));
  const visible = projects.filter((p) => !p.archived_at);
  const rank = { active: 0, planned: 1, on_hold: 2, completed: 3, cancelled: 4 } as const;
  visible.sort((a, b) => rank[a.status] - rank[b.status] || a.code.localeCompare(b.code));
  const active = visible.filter((p) => p.status === "active").length;

  return (
    <>
      <SubNav title="Projects" cta={<a href="#new" className="btn btn-primary btn-sm">New project</a>} />
      <section className="tile tile-hero" style={{ paddingBottom: 56 }}>
        <div className="container">
          <Reveal>
            <h1 className="t-hero" style={{ margin: 0 }}>Projects.</h1>
            <p className="t-lead" style={{ margin: "16px 0 0", color: "var(--text-secondary)" }}>
              {visible.length} projects, {active} active. Every task gets a code you can say out loud.
            </p>
          </Reveal>
        </div>
      </section>
      <section className="tile tile-parchment" style={{ paddingTop: 56 }}>
        <div className="container">
          <div className="grid md:grid-cols-2 lg:grid-cols-3" style={{ gap: 20 }}>
            {visible.map((p, i) => (
              <Reveal key={p.id} delay={(i % 3) * 80}>
                <ProjectCard project={p} stats={p.stats} company={p.company_id ? companyName.get(p.company_id) : undefined} />
              </Reveal>
            ))}
          </div>
        </div>
      </section>
      <section className="tile" id="new" style={{ scrollMarginTop: 52 }}>
        <div className="container" style={{ maxWidth: 820 }}>
          <Reveal>
            <h2 className="t-display-md" style={{ margin: "0 0 8px" }}>New project.</h2>
            <p className="t-caption" style={{ color: "var(--text-muted)", margin: "0 0 24px" }}>
              Codes follow ADR-006: <span className="tabular">COMPANY-PROJECT-NN</span>, uppercase, and never change.
            </p>
            <NewProject />
          </Reveal>
        </div>
      </section>
    </>
  );
}
