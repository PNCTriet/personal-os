import type { Metadata } from "next";
import { Landmark } from "lucide-react";
import { requireScope } from "@/lib/session";
import { getI18n } from "@/lib/i18n/server";
import { vnd } from "@/lib/format";
import { getPreview, DOMAIN_PHASE } from "@/modules/preview";
import { DataTable } from "@/components/ui/data-table";
import { PageHeader } from "@/components/ui/page";
import { phaseLabel, previewEmpty } from "@/components/ui/preview";

export const metadata: Metadata = { title: "Accounts" };
export const dynamic = "force-dynamic";
const KIND = { bank: "Bank", savings: "Savings", cash: "Cash", ewallet: "E-wallet", credit: "Credit card" };

export default async function AccountsPage() {
  const scope = await requireScope();
  const { t } = await getI18n();
  const pv = getPreview(scope);
  const rows = pv.accounts.map((a) => ({ ...a }));
  const total = rows.reduce((s, a) => s + a.balance, 0);
  return (
    <>
      <PageHeader title={t("nav.accounts")} subtitle={rows.length ? t("sub.accountsN", { total: vnd(total), n: rows.length }) : t("sub.accounts")} phase={phaseLabel(t, scope.ctx.mode === "demo", DOMAIN_PHASE.finance)} />
      <div className="panel">
        <DataTable
          rows={rows}
          noun="account"
          facets={[{ key: "kind", label: "Type", labels: KIND }]}
          defaultSort={{ key: "balance", dir: "desc" }}
          columns={[
            { key: "name", label: "Account", kind: "strong" },
            { key: "kind", label: "Type", kind: "pill", labels: KIND, tones: { bank: "blue", savings: "green", cash: "gray", ewallet: "gray", credit: "orange" }, width: 130 },
            { key: "institution", label: "Institution", width: 180 },
            { key: "currency", label: "Currency", kind: "mono", width: 90 },
            { key: "balance", label: "Balance", kind: "money", align: "right", width: 170 },
          ]}
          empty={previewEmpty(t, Landmark, t("noun.accounts"), DOMAIN_PHASE.finance, rows.length > 0)}
        />
      </div>
    </>
  );
}
