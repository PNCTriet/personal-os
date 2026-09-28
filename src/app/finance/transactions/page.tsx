import type { Metadata } from "next";
import { ArrowLeftRight } from "lucide-react";
import { requireScope } from "@/lib/session";
import { getI18n } from "@/lib/i18n/server";
import { todayISO } from "@/lib/dates";
import { vnd } from "@/lib/format";
import { getPreview, financeSummary, DOMAIN_PHASE } from "@/modules/preview";
import { DataTable } from "@/components/ui/data-table";
import { PageHeader } from "@/components/ui/page";
import { phaseLabel, previewEmpty } from "@/components/ui/preview";

export const metadata: Metadata = { title: "Transactions" };
export const dynamic = "force-dynamic";

export default async function TransactionsPage() {
  const scope = await requireScope();
  const { t } = await getI18n();
  const pv = getPreview(scope);
  const f = financeSummary(pv, todayISO(scope.ctx.timezone));
  const rows = pv.transactions.map((t) => ({ ...t }));
  const stats = [
    { label: "Income this month", value: vnd(f.income), cls: "tone-green" },
    { label: "Spend this month", value: vnd(f.spend), cls: "" },
    { label: "Net", value: vnd(f.income - f.spend, { sign: true }), cls: f.income - f.spend >= 0 ? "tone-green" : "tone-red" },
    { label: "Transactions", value: String(rows.length), cls: "" },
  ];
  return (
    <>
      <PageHeader title={t("nav.transactions")} subtitle={t("sub.transactions")} phase={phaseLabel(t, scope.ctx.mode === "demo", DOMAIN_PHASE.finance)}
        actions={<button className="btn btn-primary" disabled title="Recording transactions ships in Phase 3">{t("btn.addTransaction")}</button>} />
      <section className="panel kpis" style={{ gridTemplateColumns: "repeat(4, minmax(0, 1fr))", marginBottom: 12 }}>
        {stats.map((s) => <div key={s.label} className="kpi"><span className="label">{s.label}</span><span className={`t-kpi ${s.cls}`} style={{ fontSize: 18 }}>{rows.length ? s.value : "—"}</span></div>)}
      </section>
      <div className="panel">
        <DataTable
          rows={rows}
          noun="transaction"
          searchKeys={["description", "counterparty", "category"]}
          facets={[{ key: "category", label: "Category" }, { key: "account", label: "Account" }, { key: "kind", label: "Type", labels: { income: "Income", expense: "Expense", transfer: "Transfer" } }]}
          defaultSort={{ key: "occurred_on", dir: "desc" }}
          columns={[
            { key: "occurred_on", label: "Date", kind: "date", width: 80 },
            { key: "description", label: "Description", kind: "strong" },
            { key: "category", label: "Category", width: 140 },
            { key: "account", label: "Account", kind: "muted", width: 180 },
            { key: "kind", label: "Type", kind: "pill", labels: { income: "Income", expense: "Expense", transfer: "Transfer" }, tones: { income: "green", expense: "gray", transfer: "blue" }, width: 100 },
            { key: "amount", label: "Amount", kind: "money-signed", align: "right", width: 150 },
          ]}
          empty={previewEmpty(t, ArrowLeftRight, t("noun.transactions"), DOMAIN_PHASE.finance, rows.length > 0)}
        />
      </div>
    </>
  );
}
