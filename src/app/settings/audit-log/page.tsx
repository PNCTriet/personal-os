import type { Metadata } from "next";
import { ScrollText } from "lucide-react";
import { requireScope } from "@/lib/session";
import { getI18n } from "@/lib/i18n/server";
import { relativeTime } from "@/lib/dates";
import { actorLabel, describeActivity, listActivity } from "@/modules/activity";
import { DataTable } from "@/components/ui/data-table";
import { EmptyState, PageHeader } from "@/components/ui/page";

export const metadata: Metadata = { title: "Audit log" };
export const dynamic = "force-dynamic";

export default async function AuditLogPage() {
  const scope = await requireScope();
  const { t, locale } = await getI18n();
  const entries = await listActivity(scope, { limit: 200 });
  const rows = entries.map((e) => {
    const d = describeActivity(e);
    return { id: e.id, when: relativeTime(e.created_at, locale), whenSort: e.created_at, action: e.action, subject: d.subject, code: d.code, actor: actorLabel(e), source: e.source, entity: e.entity_type };
  });
  return (
    <>
      <PageHeader title={t("nav.auditLog")} subtitle={t("sub.audit")} />
      <div className="panel">
        <DataTable
          rows={rows}
          noun="entry"
          searchKeys={["subject", "code", "action"]}
          facets={[{ key: "entity", label: "Entity" }, { key: "action", label: "Action" }, { key: "source", label: "Source" }]}
          defaultSort={{ key: "when", dir: "desc" }}
          columns={[
            { key: "when", label: "When", kind: "muted", sortKey: "whenSort", width: 110 },
            { key: "action", label: "Action", kind: "mono", width: 150 },
            { key: "subject", label: "Subject", kind: "strong" },
            { key: "code", label: "Code", kind: "mono", width: 160 },
            { key: "actor", label: "Actor", width: 110 },
            { key: "source", label: "Source", kind: "pill", tones: { web: "gray", api: "blue", mcp: "orange", ai_command: "orange", webhook: "gray", system: "none" }, width: 100 },
          ]}
          empty={<EmptyState icon={ScrollText} title={t("empty.audit")} body={t("empty.auditBody")} />}
        />
      </div>
    </>
  );
}
