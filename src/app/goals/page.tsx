import type { Metadata } from "next";
import { Target } from "lucide-react";
import { requireScope } from "@/lib/session";
import { getI18n } from "@/lib/i18n/server";
import { vnd } from "@/lib/format";
import { getPreview, DOMAIN_PHASE } from "@/modules/preview";
import { DataTable } from "@/components/ui/data-table";
import { PageHeader } from "@/components/ui/page";
import { phaseLabel, previewEmpty } from "@/components/ui/preview";

export const metadata: Metadata = { title: "Goals" };
export const dynamic = "force-dynamic";

export default async function GoalsPage() {
  const scope = await requireScope();
  const { t } = await getI18n();
  const rows = getPreview(scope).goals.map((g) => ({
    id: g.id, title: g.title, area: g.area, progress: g.target ? g.current / g.target : 0, due_on: g.due_on,
    amount: g.unit === "VND" ? `${vnd(g.current)} / ${vnd(g.target)}` : `${g.current} / ${g.target} ${g.unit}`,
  }));
  return (
    <>
      <PageHeader title={t("nav.goals")} subtitle={t("sub.goals")} phase={phaseLabel(t, scope.ctx.mode === "demo", DOMAIN_PHASE.goals)} />
      <div className="panel">
        <DataTable
          rows={rows}
          noun="goal"
          searchKeys={["title"]}
          facets={[{ key: "area", label: "Area" }]}
          defaultSort={{ key: "due_on", dir: "asc" }}
          columns={[
            { key: "title", label: "Goal", kind: "strong" },
            { key: "area", label: "Area", kind: "pill", tones: { Finance: "green", Fitness: "orange", Learning: "blue", Career: "gray", Personal: "gray" }, width: 110 },
            { key: "progress", label: "Progress", kind: "progress", width: 220 },
            { key: "amount", label: "Current / target", kind: "muted", sortable: false, width: 280 },
            { key: "due_on", label: "Due", kind: "date", width: 90 },
          ]}
          empty={previewEmpty(t, Target, t("noun.goals"), DOMAIN_PHASE.goals, rows.length > 0)}
        />
      </div>
    </>
  );
}
