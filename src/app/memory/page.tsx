import type { Metadata } from "next";
import { Brain } from "lucide-react";
import { requireScope } from "@/lib/session";
import { getPreview, DOMAIN_PHASE } from "@/modules/preview";
import { DataTable } from "@/components/ui/data-table";
import { PageHeader } from "@/components/ui/page";
import { phaseLabel, previewEmpty } from "@/components/ui/preview";

export const metadata: Metadata = { title: "Memory" };
export const dynamic = "force-dynamic";
const KIND = { preference: "Preference", fact: "Fact", context: "Context", decision: "Decision" };
const SOURCE = { manual: "Manual", ai_command: "AI command", email: "Email", note: "Note" };

export default async function MemoryPage() {
  const scope = await requireScope();
  const rows = getPreview(scope).memories.map((m) => ({ ...m }));
  return (
    <>
      <PageHeader title="Memory" subtitle="What the OS knows about you and your world. AI reads it only through scoped tools" phase={phaseLabel(scope.ctx.mode === "demo", DOMAIN_PHASE.memory)} />
      <div className="panel">
        <DataTable
          rows={rows}
          noun="memory"
          searchKeys={["content", "subject"]}
          facets={[{ key: "kind", label: "Kind", labels: KIND }, { key: "source", label: "Source", labels: SOURCE }]}
          defaultSort={{ key: "valid_from", dir: "desc" }}
          columns={[
            { key: "content", label: "Memory" },
            { key: "subject", label: "About", kind: "strong", width: 160 },
            { key: "kind", label: "Kind", kind: "pill", labels: KIND, tones: { preference: "blue", fact: "gray", context: "gray", decision: "green" }, width: 110 },
            { key: "source", label: "Source", labels: SOURCE, kind: "muted", width: 110 },
            { key: "confidence", label: "Confidence", kind: "percent", align: "right", width: 100 },
            { key: "valid_from", label: "Since", kind: "date", width: 90 },
          ]}
          empty={previewEmpty(Brain, "memories", DOMAIN_PHASE.memory, rows.length > 0)}
        />
      </div>
    </>
  );
}
