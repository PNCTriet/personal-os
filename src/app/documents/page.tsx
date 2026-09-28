import type { Metadata } from "next";
import { FileText } from "lucide-react";
import { requireScope } from "@/lib/session";
import { getI18n } from "@/lib/i18n/server";
import { getPreview, DOMAIN_PHASE } from "@/modules/preview";
import { DataTable } from "@/components/ui/data-table";
import { PageHeader } from "@/components/ui/page";
import { phaseLabel, previewEmpty } from "@/components/ui/preview";

export const metadata: Metadata = { title: "Documents" };
export const dynamic = "force-dynamic";

export default async function DocumentsPage() {
  const scope = await requireScope();
  const { t } = await getI18n();
  const rows = getPreview(scope).documents.map((d) => ({ ...d }));
  return (
    <>
      <PageHeader title={t("nav.documents")} subtitle={t("sub.documents")} phase={phaseLabel(t, scope.ctx.mode === "demo", DOMAIN_PHASE.documents)} />
      <div className="panel">
        <DataTable
          rows={rows}
          noun="document"
          searchKeys={["title", "linked_to"]}
          facets={[{ key: "source", label: "Source" }, { key: "linked_to", label: "Linked to" }]}
          defaultSort={{ key: "updated_on", dir: "desc" }}
          columns={[
            { key: "title", label: "Title", kind: "strong" },
            { key: "source", label: "Source", kind: "pill", tones: { Notion: "gray", "Google Drive": "blue", GitHub: "gray", Link: "none" }, width: 140 },
            { key: "linked_to", label: "Linked to", kind: "mono", width: 150 },
            { key: "updated_on", label: "Updated", kind: "date", width: 100 },
          ]}
          empty={previewEmpty(t, FileText, t("noun.documents"), DOMAIN_PHASE.documents, rows.length > 0)}
        />
      </div>
    </>
  );
}
