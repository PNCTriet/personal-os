import type { Metadata } from "next";
import { KeyRound } from "lucide-react";
import { requireScope } from "@/lib/session";
import { relativeTime } from "@/lib/dates";
import { getPreview, DOMAIN_PHASE } from "@/modules/preview";
import { DataTable } from "@/components/ui/data-table";
import { PageHeader } from "@/components/ui/page";
import { phaseLabel, previewEmpty } from "@/components/ui/preview";

export const metadata: Metadata = { title: "API keys" };
export const dynamic = "force-dynamic";

export default async function ApiKeysPage() {
  const scope = await requireScope();
  const rows = getPreview(scope).apiKeys.map((k) => ({
    id: k.id, name: k.name, prefix: `${k.prefix}…`, kind: k.kind, scopes: k.scopes,
    lastUsed: k.last_used_at ? relativeTime(k.last_used_at) : "Never", lastUsedSort: k.last_used_at ?? "", created_on: k.created_on,
  }));
  return (
    <>
      <PageHeader title="API keys" subtitle="Keys are shown once, stored hashed, scoped and revocable. Every use is audited" phase={phaseLabel(scope.ctx.mode === "demo", DOMAIN_PHASE.apiKeys)}
        actions={<button className="btn btn-primary" disabled title="API keys ship in Phase 1 (HOWL-POS-P1-T13)">Create key</button>} />
      <div className="panel">
        <DataTable
          rows={rows}
          noun="key"
          defaultSort={{ key: "created_on", dir: "desc" }}
          columns={[
            { key: "name", label: "Name", kind: "strong" },
            { key: "prefix", label: "Key", kind: "mono", width: 160 },
            { key: "kind", label: "Type", kind: "pill", labels: { api_key: "API key", oauth_grant: "OAuth grant" }, tones: { api_key: "gray", oauth_grant: "blue" }, width: 120 },
            { key: "scopes", label: "Scopes", kind: "tags", sortable: false },
            { key: "lastUsed", label: "Last used", kind: "muted", sortKey: "lastUsedSort", width: 110 },
            { key: "created_on", label: "Created", kind: "date", width: 90 },
          ]}
          empty={previewEmpty(KeyRound, "API keys", DOMAIN_PHASE.apiKeys, rows.length > 0)}
        />
      </div>
    </>
  );
}
