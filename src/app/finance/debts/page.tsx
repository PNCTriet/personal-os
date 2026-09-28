import type { Metadata } from "next";
import { HandCoins } from "lucide-react";
import { requireScope } from "@/lib/session";
import { getI18n } from "@/lib/i18n/server";
import { todayISO } from "@/lib/dates";
import { vnd } from "@/lib/format";
import { getPreview, financeSummary, DOMAIN_PHASE } from "@/modules/preview";
import { DataTable } from "@/components/ui/data-table";
import { PageHeader } from "@/components/ui/page";
import { phaseLabel, previewEmpty } from "@/components/ui/preview";

export const metadata: Metadata = { title: "Debts" };
export const dynamic = "force-dynamic";
const DIR = { receivable: "Owed to you", payable: "You owe" };

export default async function DebtsPage() {
  const scope = await requireScope();
  const { t } = await getI18n();
  const pv = getPreview(scope);
  const today = todayISO(scope.ctx.timezone);
  const f = financeSummary(pv, today);
  const rows = pv.debts.map((d) => ({ ...d, overdue: d.due_on !== null && d.due_on < today ? "Overdue" : null, paid: d.principal ? 1 - d.outstanding / d.principal : 0 }));
  return (
    <>
      <PageHeader title={t("title.debts")} subtitle={rows.length ? t("sub.debtsN", { r: vnd(f.receivable), p: vnd(f.payable) }) : t("sub.debts")} phase={phaseLabel(t, scope.ctx.mode === "demo", DOMAIN_PHASE.finance)} />
      <div className="panel">
        <DataTable
          rows={rows}
          noun="record"
          searchKeys={["counterparty", "note"]}
          facets={[{ key: "direction", label: "Direction", labels: DIR }]}
          defaultSort={{ key: "due_on", dir: "asc" }}
          columns={[
            { key: "counterparty", label: "Counterparty", kind: "person" },
            { key: "direction", label: "Direction", kind: "pill", labels: DIR, tones: { receivable: "green", payable: "orange" }, width: 130 },
            { key: "note", label: "Note", kind: "muted" },
            { key: "paid", label: "Paid", kind: "progress", width: 150 },
            { key: "due_on", label: "Due", kind: "date", width: 80 },
            { key: "overdue", label: "", kind: "pill", tones: { Overdue: "red" }, width: 90, sortable: false },
            { key: "outstanding", label: "Outstanding", kind: "money", align: "right", width: 140 },
          ]}
          empty={previewEmpty(t, HandCoins, t("noun.debts"), DOMAIN_PHASE.finance, rows.length > 0)}
        />
      </div>
    </>
  );
}
