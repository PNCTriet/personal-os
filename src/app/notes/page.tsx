import type { Metadata } from "next";
import { StickyNote } from "lucide-react";
import { requireScope } from "@/lib/session";
import { relativeTime } from "@/lib/dates";
import { getPreview, DOMAIN_PHASE } from "@/modules/preview";
import { DataTable } from "@/components/ui/data-table";
import { PageHeader } from "@/components/ui/page";
import { phaseLabel, previewEmpty } from "@/components/ui/preview";

export const metadata: Metadata = { title: "Notes" };
export const dynamic = "force-dynamic";
const KIND = { note: "Note", research: "Research", bookmark: "Bookmark", document: "Document" };

export default async function NotesPage() {
  const scope = await requireScope();
  const rows = getPreview(scope).notes.map((n) => ({ id: n.id, title: n.title, excerpt: n.excerpt, kind: n.kind, tags: n.tags, updated: relativeTime(n.updated_at), updatedSort: n.updated_at }));
  return (
    <>
      <PageHeader title="Notes" subtitle="Markdown notes with full-text search (Vietnamese + English)" phase={phaseLabel(scope.ctx.mode === "demo", DOMAIN_PHASE.notes)}
        actions={<button className="btn btn-primary" disabled title="Notes ship in Phase 5">New note</button>} />
      <div className="panel">
        <DataTable
          rows={rows}
          noun="note"
          searchKeys={["title", "excerpt"]}
          facets={[{ key: "kind", label: "Kind", labels: KIND }, { key: "tags", label: "Tag" }]}
          defaultSort={{ key: "updated", dir: "desc" }}
          columns={[
            { key: "title", label: "Title", kind: "strong", width: 300 },
            { key: "excerpt", label: "Excerpt", kind: "muted" },
            { key: "kind", label: "Kind", kind: "pill", labels: KIND, tones: { note: "gray", research: "blue", bookmark: "none", document: "none" }, width: 110 },
            { key: "tags", label: "Tags", kind: "tags", sortable: false, width: 200 },
            { key: "updated", label: "Updated", kind: "muted", sortKey: "updatedSort", width: 110 },
          ]}
          empty={previewEmpty(StickyNote, "notes", DOMAIN_PHASE.notes, rows.length > 0)}
        />
      </div>
    </>
  );
}
