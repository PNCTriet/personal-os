import { relativeTime } from "@/lib/dates";
import { actorLabel, describeActivity, type ActivityEntry } from "@/modules/activity";

export function ActivityList({ items, empty = "No activity yet." }: { items: ActivityEntry[]; empty?: string }) {
  if (items.length === 0) return <p className="t-caption" style={{ color: "var(--text-muted)" }}>{empty}</p>;
  return (
    <ol className="list" style={{ listStyle: "none", margin: 0, padding: 0 }}>
      {items.map((e) => {
        const d = describeActivity(e);
        return (
          <li key={e.id} className="row" style={{ display: "flex", gap: 16, alignItems: "baseline", padding: "14px 24px" }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <span style={{ color: "var(--text-muted)" }}>{d.verb} </span>
              <span>{d.subject}</span>
              {d.detail && <span style={{ color: "var(--text-muted)" }}> · {d.detail}</span>}
              <div className="t-caption" style={{ color: "var(--text-muted)" }}>
                {d.code ? `${d.code} · ` : ""}{actorLabel(e)}
              </div>
            </div>
            <time className="t-caption tabular" dateTime={e.created_at} style={{ color: "var(--text-muted)", whiteSpace: "nowrap" }}>
              {relativeTime(e.created_at)}
            </time>
          </li>
        );
      })}
    </ol>
  );
}
