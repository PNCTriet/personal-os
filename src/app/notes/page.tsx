import type { Metadata } from "next";
import { StickyNote } from "lucide-react";
import { requireScope } from "@/lib/session";
import { getI18n } from "@/lib/i18n/server";
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
  const { t, locale } = await getI18n();
  const rows = getPreview(scope).notes.map((n) => ({ id: n.id, title: n.title, excerpt: n.excerpt, kind: n.kind, tags: n.tags, updated: relativeTime(n.updated_at, locale), updatedSort: n.updated_at }));
  return (
    <>
      <PageHeader title={t("nav.notes")} subtitle={t("sub.notes")} phase={phaseLabel(t, scope.ctx.mode === "demo", DOMAIN_PHASE.notes)}
        actions={<button className="btn btn-primary" disabled title="Notes ship in Phase 5">{t("btn.newNote")}</button>} />
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
          empty={previewEmpty(t, StickyNote, t("noun.notes"), DOMAIN_PHASE.notes, rows.length > 0)}
        />
      </div>
    </>
  );
}
