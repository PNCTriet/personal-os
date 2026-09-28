import type { Metadata } from "next";
import { PieChart } from "lucide-react";
import { requireScope } from "@/lib/session";
import { getI18n } from "@/lib/i18n/server";
import { vnd } from "@/lib/format";
import { getPreview, DOMAIN_PHASE } from "@/modules/preview";
import { DataTable } from "@/components/ui/data-table";
import { PageHeader, Progress } from "@/components/ui/page";
import { phaseLabel, previewEmpty } from "@/components/ui/preview";

export const metadata: Metadata = { title: "Budgets" };
export const dynamic = "force-dynamic";

export default async function BudgetsPage() {
  const scope = await requireScope();
  const { t } = await getI18n();
  const pv = getPreview(scope);
  const rows = pv.budgets.map((b) => {
    const used = b.limit ? b.spent / b.limit : 0;
    return { id: b.id, category: b.category, limit: b.limit, spent: b.spent, remaining: b.limit - b.spent, used, state: used > 1 ? "over" : used >= 0.85 ? "near" : "ok" };
  });
  const limit = rows.reduce((s, r) => s + r.limit, 0);
  const spent = rows.reduce((s, r) => s + r.spent, 0);
  return (
    <>
      <PageHeader title={t("nav.budgets")} subtitle={t("sub.budgets")} phase={phaseLabel(t, scope.ctx.mode === "demo", DOMAIN_PHASE.finance)} />
      {rows.length > 0 && (
        <div className="panel" style={{ padding: 14, marginBottom: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, gap: 12, flexWrap: "wrap" }}>
            <span><span className="t-kpi" style={{ fontSize: 18 }}>{vnd(spent)}</span> <span className="muted">of {vnd(limit)}</span></span>
            <span className="muted tabular">{vnd(limit - spent)} left · {Math.round((spent / limit) * 100)}% used</span>
          </div>
          <Progress value={spent / limit} tone={spent > limit ? "red" : undefined} label="Monthly budget used" />
        </div>
      )}
      <div className="panel">
        <DataTable
          rows={rows}
          noun="budget"
          facets={[{ key: "state", label: "State", labels: { ok: "On track", near: "Near limit", over: "Over budget" } }]}
          defaultSort={{ key: "used", dir: "desc" }}
          columns={[
            { key: "category", label: "Category", kind: "strong" },
            { key: "used", label: "Used", kind: "progress", width: 220 },
            { key: "state", label: "State", kind: "pill", labels: { ok: "On track", near: "Near limit", over: "Over budget" }, tones: { ok: "green", near: "orange", over: "red" }, width: 120 },
            { key: "spent", label: "Spent", kind: "money", align: "right", width: 140 },
            { key: "limit", label: "Budget", kind: "money", align: "right", width: 140 },
            { key: "remaining", label: "Remaining", kind: "money", align: "right", width: 140 },
          ]}
          empty={previewEmpty(t, PieChart, t("noun.budgets"), DOMAIN_PHASE.finance, rows.length > 0)}
        />
      </div>
    </>
  );
}
