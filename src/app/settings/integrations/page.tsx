import type { Metadata } from "next";
import { requireScope } from "@/lib/session";
import { PageHeader, Panel, PhaseHint } from "@/components/ui/page";

export const metadata: Metadata = { title: "Integrations" };
export const dynamic = "force-dynamic";

const INTEGRATIONS = [
  { name: "Google Calendar", purpose: "Two-way event sync, task → time block", phase: "Phase 2", note: "OAuth in Testing mode: reconnect weekly (ADR-013)" },
  { name: "Gmail", purpose: "Search, read, draft and send (send needs confirmation)", phase: "Phase 4", note: "Personal @gmail.com account" },
  { name: "Resend", purpose: "Campaign delivery and email events webhook", phase: "Phase 4", note: "Suppression list enforced" },
  { name: "Notion", purpose: "Link pages to tasks and projects", phase: "Phase 5", note: "Internal token entered here" },
  { name: "GitHub", purpose: "Issues and PRs as external references", phase: "Phase 5", note: "PAT stored encrypted" },
  { name: "Cursor (MCP)", purpose: "Task tools over MCP with an API key", phase: "Phase 1.5a", note: "Uses a Personal OS API key" },
  { name: "ChatGPT (MCP)", purpose: "Task tools over MCP with OAuth 2.1", phase: "Phase 1.5b", note: "Supabase OAuth server, revocable grants" },
];

export default async function IntegrationsPage() {
  await requireScope();
  return (
    <>
      <PageHeader title="Integrations" subtitle="External services are replaceable adapters, never the source of truth" />
      <Panel flush>
        <div className="rows">
          {INTEGRATIONS.map((i) => (
            <div key={i.name} className="row" style={{ minHeight: 56 }}>
              <span className="avatar" style={{ borderRadius: 7 }}>{i.name.slice(0, 1)}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600 }}>{i.name}</div>
                <div className="t-small muted truncate-1">{i.purpose} · {i.note}</div>
              </div>
              <span className="pill" data-tone="gray">Not connected</span>
              <PhaseHint text={i.phase} />
              <button className="btn btn-plain hide-mobile" disabled>Connect</button>
            </div>
          ))}
        </div>
      </Panel>
    </>
  );
}
