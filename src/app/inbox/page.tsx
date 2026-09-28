import type { Metadata } from "next";
import { Inbox } from "lucide-react";
import { requireScope } from "@/lib/session";
import { getI18n } from "@/lib/i18n/server";
import { relativeTime } from "@/lib/dates";
import { getPreview, DOMAIN_PHASE } from "@/modules/preview";
import { DataTable } from "@/components/ui/data-table";
import { PageHeader } from "@/components/ui/page";
import { phaseLabel, previewEmpty } from "@/components/ui/preview";

export const metadata: Metadata = { title: "Inbox" };
export const dynamic = "force-dynamic";

export default async function InboxPage() {
  const scope = await requireScope();
  const { t, locale } = await getI18n();
  const pv = getPreview(scope);
  const rows = pv.inbox.map((m) => ({ id: m.id, from: m.from, subject: m.subject, snippet: m.snippet, label: m.label, state: m.unread ? "Unread" : "Read", received: relativeTime(m.received_at, locale), receivedSort: m.received_at }));
  return (
    <>
      <PageHeader title={t("nav.inbox")} subtitle={rows.length ? t("sub.inboxN", { n: rows.filter((r) => r.state === "Unread").length }) : t("sub.inbox")} phase={phaseLabel(t, scope.ctx.mode === "demo", DOMAIN_PHASE.inbox)} />
      <div className="panel">
        <DataTable
          rows={rows}
          noun="thread"
          searchKeys={["from", "subject", "snippet"]}
          facets={[{ key: "label", label: "Label" }, { key: "state", label: "State" }]}
          defaultSort={{ key: "received", dir: "desc" }}
          columns={[
            { key: "state", label: "", kind: "pill", tones: { Unread: "blue", Read: "none" }, width: 90, sortable: false },
            { key: "from", label: "From", kind: "strong", width: 190 },
            { key: "subject", label: "Subject", width: 300 },
            { key: "snippet", label: "Preview", kind: "muted" },
            { key: "label", label: "Label", kind: "pill", tones: { Clients: "blue", Partners: "gray", Personal: "green", Receipts: "none", Newsletters: "none" }, width: 110 },
            { key: "received", label: "Received", kind: "muted", sortKey: "receivedSort", width: 110 },
          ]}
          empty={previewEmpty(t, Inbox, t("noun.threads"), DOMAIN_PHASE.inbox, rows.length > 0)}
        />
      </div>
    </>
  );
}
