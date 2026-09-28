import { relativeTime } from "@/lib/dates";
import { actorLabel, describeActivity, type ActivityEntry } from "@/modules/activity";

export function ActivityList({ items, empty = "No activity yet." }: { items: ActivityEntry[]; empty?: string }) {
  if (items.length === 0) return <div className="muted t-small" style={{ padding: 14 }}>{empty}</div>;
  return (
    <ol className="rows" style={{ listStyle: "none", margin: 0, padding: 0 }}>
      {items.map((e) => {
        const d = describeActivity(e);
        return (
          <li key={e.id} className="row" style={{ alignItems: "flex-start" }}>
            <span className="dot" data-tone={e.action.endsWith("complete") ? "green" : e.action.endsWith("create") ? "blue" : "gray"} style={{ marginTop: 6 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="truncate-1"><span className="muted">{d.verb}</span> {d.subject}{d.detail && <span className="muted"> · {d.detail}</span>}</div>
              <div className="t-small muted">{d.code ? `${d.code} · ` : ""}{actorLabel(e)}</div>
            </div>
            <time className="t-small muted tabular" dateTime={e.created_at} style={{ whiteSpace: "nowrap" }}>{relativeTime(e.created_at)}</time>
          </li>
        );
      })}
    </ol>
  );
}
