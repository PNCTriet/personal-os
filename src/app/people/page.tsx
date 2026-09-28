import type { Metadata } from "next";
import { Users } from "lucide-react";
import { requireScope } from "@/lib/session";
import { getI18n } from "@/lib/i18n/server";
import { todayISO } from "@/lib/dates";
import { getPreview, reconnectDue, DOMAIN_PHASE } from "@/modules/preview";
import { DataTable } from "@/components/ui/data-table";
import { PageHeader } from "@/components/ui/page";
import { phaseLabel, previewEmpty } from "@/components/ui/preview";

export const metadata: Metadata = { title: "People" };
export const dynamic = "force-dynamic";
const REL = { client: "Client", partner: "Partner", friend: "Friend", family: "Family", lead: "Lead", vendor: "Vendor" };

export default async function PeoplePage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const scope = await requireScope();
  const { t } = await getI18n();
  const pv = getPreview(scope);
  const today = todayISO(scope.ctx.timezone);
  const rows = pv.people.map((p) => {
    const due = reconnectDue(p, today);
    const cadence = due === null ? null : !p.last_contacted_on ? "never" : due > 0 ? "late" : due > -3 ? "soon" : "ok";
    return {
      id: p.id, name: p.name, company: p.company, role: p.role, email: p.email, relationship: p.relationship, tags: p.tags,
      last: p.last_contacted_on, cadence, cadenceRank: due ?? -999,
      every: p.reconnect_every_days ? `Every ${p.reconnect_every_days}d` : null,
    };
  });
  const late = rows.filter((r) => r.cadence === "late" || r.cadence === "never").length;
  return (
    <>
      <PageHeader title={t("nav.people")} subtitle={rows.length ? t("sub.peopleN", { n: rows.length, late }) : t("sub.people")} phase={phaseLabel(t, scope.ctx.mode === "demo", DOMAIN_PHASE.people)}
        actions={<button className="btn btn-primary" disabled title="Editing people ships in Phase 4">{t("btn.addPerson")}</button>} />
      <div className="panel">
        <DataTable
          rows={rows}
          noun="person"
          initialQuery={q ?? ""}
          searchKeys={["name", "company", "role", "email"]}
          facets={[{ key: "relationship", label: "Relationship", labels: REL }, { key: "company", label: "Company" }, { key: "tags", label: "Tag" }]}
          defaultSort={{ key: "cadence", dir: "desc" }}
          columns={[
            { key: "name", label: "Name", kind: "person" },
            { key: "company", label: "Company", width: 170 },
            { key: "role", label: "Role", kind: "muted", width: 180 },
            { key: "relationship", label: "Relationship", kind: "pill", labels: REL, tones: { client: "blue", partner: "gray", friend: "green", family: "green", lead: "orange", vendor: "gray" }, width: 120 },
            { key: "tags", label: "Tags", kind: "tags", sortable: false },
            { key: "last", label: "Last contact", kind: "date", width: 110 },
            { key: "cadence", label: "Reconnect", kind: "pill", sortKey: "cadenceRank", labels: { late: "Overdue", never: "Never contacted", soon: "Due soon", ok: "On track" }, tones: { late: "red", never: "orange", soon: "orange", ok: "green" }, width: 140 },
          ]}
          empty={previewEmpty(t, Users, t("noun.people"), DOMAIN_PHASE.people, rows.length > 0)}
        />
      </div>
    </>
  );
}
