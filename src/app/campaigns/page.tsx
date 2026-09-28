import type { Metadata } from "next";
import { Send } from "lucide-react";
import { requireScope } from "@/lib/session";
import { getPreview, DOMAIN_PHASE } from "@/modules/preview";
import { DataTable } from "@/components/ui/data-table";
import { PageHeader } from "@/components/ui/page";
import { phaseLabel, previewEmpty } from "@/components/ui/preview";

export const metadata: Metadata = { title: "Campaigns" };
export const dynamic = "force-dynamic";
const STATUS = { draft: "Draft", active: "Active", paused: "Paused", completed: "Completed" };

export default async function CampaignsPage() {
  const scope = await requireScope();
  const rows = getPreview(scope).campaigns.map((c) => ({ ...c, openRate: c.sent ? c.opened / c.sent : null, replyRate: c.sent ? c.replied / c.sent : null }));
  return (
    <>
      <PageHeader title="Campaigns" subtitle="Cold email sequences via Resend with suppression and audit" phase={phaseLabel(scope.ctx.mode === "demo", DOMAIN_PHASE.campaigns)}
        actions={<button className="btn btn-primary" disabled title="Campaigns ship in Phase 4">New campaign</button>} />
      <div className="panel">
        <DataTable
          rows={rows}
          noun="campaign"
          searchKeys={["name"]}
          facets={[{ key: "status", label: "Status", labels: STATUS }]}
          defaultSort={{ key: "updated_on", dir: "desc" }}
          columns={[
            { key: "name", label: "Campaign", kind: "strong" },
            { key: "status", label: "Status", kind: "pill", labels: STATUS, tones: { draft: "gray", active: "blue", paused: "orange", completed: "green" }, width: 110 },
            { key: "steps", label: "Steps", kind: "number", align: "right", width: 70 },
            { key: "enrolled", label: "Enrolled", kind: "number", align: "right", width: 90 },
            { key: "sent", label: "Sent", kind: "number", align: "right", width: 70 },
            { key: "openRate", label: "Open rate", kind: "percent", align: "right", width: 100 },
            { key: "replyRate", label: "Reply rate", kind: "percent", align: "right", width: 100 },
            { key: "updated_on", label: "Updated", kind: "date", width: 90 },
          ]}
          empty={previewEmpty(Send, "campaigns", DOMAIN_PHASE.campaigns, rows.length > 0)}
        />
      </div>
    </>
  );
}
