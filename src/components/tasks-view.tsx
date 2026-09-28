"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { ArrowDown, ArrowUp, Columns3, ListChecks, Search, Table2 } from "lucide-react";
import { changeTaskStatus } from "@/app/actions";
import type { TaskItem } from "./task-items";
import { StatusCheck } from "./task-status";

type Status = TaskItem["status"];
const STATUS_LABEL: Record<Status, string> = { backlog: "Backlog", todo: "To do", in_progress: "In progress", blocked: "Blocked", done: "Done", cancelled: "Cancelled" };
const STATUS_TONE: Record<Status, string> = { backlog: "gray", todo: "gray", in_progress: "blue", blocked: "red", done: "green", cancelled: "none" };
const PRIORITY_LABEL = { urgent: "Urgent", high: "High", normal: "Normal", low: "Low" } as const;
const PRIORITY_TONE = { urgent: "red", high: "orange", normal: "gray", low: "none" } as const;
const PRIORITY_RANK = { urgent: 0, high: 1, normal: 2, low: 3 } as const;
const STATUS_RANK: Record<Status, number> = { in_progress: 0, blocked: 1, todo: 2, backlog: 3, done: 4, cancelled: 5 };
const BOARD: Status[] = ["backlog", "todo", "in_progress", "blocked", "done"];
const VIEWS = [
  { key: "open", label: "Open", test: (t: TaskItem) => t.status !== "done" && t.status !== "cancelled" },
  { key: "due", label: "Due ≤ 7d", test: (t: TaskItem) => t.status !== "done" && t.status !== "cancelled" && (t.dueTone === "overdue" || t.dueTone === "today" || t.dueTone === "soon") },
  { key: "follow_up", label: "Follow-ups", test: (t: TaskItem) => t.kind === "follow_up" && t.status !== "done" && t.status !== "cancelled" },
  { key: "inbox", label: "Inbox", test: (t: TaskItem) => t.projectCode === null && t.status !== "done" && t.status !== "cancelled" },
  { key: "done", label: "Done", test: (t: TaskItem) => t.status === "done" },
  { key: "all", label: "All", test: () => true },
] as const;
type SortKey = "title" | "project" | "status" | "priority" | "due";

export function TasksView({ items, showProject = true, initialView = "open", initialLayout = "table" }: {
  items: TaskItem[]; showProject?: boolean; initialView?: string; initialLayout?: "table" | "board";
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [layout, setLayout] = useState<"table" | "board">(initialLayout);
  const [view, setView] = useState(VIEWS.some((v) => v.key === initialView) ? initialView : "open");
  const [q, setQ] = useState("");
  const [priority, setPriority] = useState("");
  const [project, setProject] = useState("");
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "due", dir: 1 });
  const [overrides, setOverrides] = useState<Record<string, Status>>({});
  const [dragId, setDragId] = useState<string | null>(null);
  const [over, setOver] = useState<Status | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, start] = useTransition();

  const all = useMemo(() => items.map((t) => (overrides[t.id] ? { ...t, status: overrides[t.id]! } : t)), [items, overrides]);
  const projects = useMemo(() => [...new Map(all.filter((t) => t.projectCode).map((t) => [t.projectCode!, t.project!])).entries()], [all]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const vtest = layout === "board" ? () => true : (VIEWS.find((v) => v.key === view)?.test ?? (() => true));
    return all.filter((t) =>
      vtest(t) && (!needle || `${t.title} ${t.code ?? ""} ${t.project ?? ""} ${t.company ?? ""}`.toLowerCase().includes(needle)) &&
      (!priority || t.priority === priority) && (!project || (project === "inbox" ? t.projectCode === null : t.projectCode === project)),
    );
  }, [all, q, view, priority, project, layout]);

  const sorted = useMemo(() => {
    const cmp: Record<SortKey, (a: TaskItem, b: TaskItem) => number> = {
      title: (a, b) => a.title.localeCompare(b.title),
      project: (a, b) => (a.project ?? "~").localeCompare(b.project ?? "~"),
      status: (a, b) => STATUS_RANK[a.status] - STATUS_RANK[b.status],
      priority: (a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority],
      due: (a, b) => (a.due_on ?? "9999").localeCompare(b.due_on ?? "9999") || PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority],
    };
    return [...filtered].sort((a, b) => cmp[sort.key](a, b) * sort.dir);
  }, [filtered, sort]);

  function setStatus(id: string, status: Status) {
    setOverrides((o) => ({ ...o, [id]: status }));
    setError(null);
    start(async () => {
      const res = await changeTaskStatus(id, status);
      if (!res.ok) {
        setError(res.message ?? "Could not update the task");
        setOverrides((o) => { const n = { ...o }; delete n[id]; return n; });
      }
    });
  }

  function switchLayout(l: "table" | "board") {
    setLayout(l);
    const sp = new URLSearchParams(params.toString());
    if (l === "board") sp.set("layout", "board"); else sp.delete("layout");
    router.replace(`${pathname}${sp.size ? `?${sp}` : ""}`, { scroll: false });
  }

  const th = (key: SortKey, label: string, style?: React.CSSProperties) => (
    <th style={style} aria-sort={sort.key === key ? (sort.dir === 1 ? "ascending" : "descending") : undefined}>
      <button type="button" onClick={() => setSort((s) => ({ key, dir: s.key === key ? (s.dir === 1 ? -1 : 1) : 1 }))}>
        {label}{sort.key === key && (sort.dir === 1 ? <ArrowUp size={12} /> : <ArrowDown size={12} />)}
      </button>
    </th>
  );

  return (
    <div className="panel">
      <div className="toolbar">
        <div className="segmented" role="group" aria-label="Layout">
          <button type="button" aria-pressed={layout === "table"} onClick={() => switchLayout("table")}><Table2 aria-hidden="true" />Table</button>
          <button type="button" aria-pressed={layout === "board"} onClick={() => switchLayout("board")}><Columns3 aria-hidden="true" />Board</button>
        </div>
        <div className="search">
          <Search aria-hidden="true" />
          <input className="field" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter tasks…" aria-label="Filter tasks" />
        </div>
        {layout === "table" && VIEWS.map((v) => (
          <button key={v.key} type="button" className="chip" aria-pressed={view === v.key} onClick={() => setView(v.key)}>
            {v.label} <span className="n">{all.filter(v.test).length}</span>
          </button>
        ))}
        <select className="select" aria-label="Priority" value={priority} onChange={(e) => setPriority(e.target.value)}>
          <option value="">Priority: All</option>
          {Object.entries(PRIORITY_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </select>
        {showProject && (
          <select className="select" aria-label="Project" value={project} onChange={(e) => setProject(e.target.value)}>
            <option value="">Project: All</option>
            <option value="inbox">Inbox</option>
            {projects.map(([code, name]) => <option key={code} value={code}>{name}</option>)}
          </select>
        )}
        <span className="muted t-small tabular" style={{ marginLeft: "auto" }}>{error ? <span className="tone-red">{error}</span> : `${filtered.length} tasks`}</span>
      </div>

      {layout === "table" ? (
        sorted.length === 0 ? (
          <div className="empty"><ListChecks aria-hidden="true" /><div className="t-h2">No tasks match</div><div>Try another view or clear the filters.</div></div>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th style={{ width: 36 }} aria-label="Done" />
                  {th("title", "Task")}
                  <th style={{ width: 150 }}>Code</th>
                  {showProject && th("project", "Project", { width: 170 })}
                  {th("status", "Status", { width: 140 })}
                  {th("priority", "Priority", { width: 100 })}
                  {th("due", "Due", { width: 120 })}
                </tr>
              </thead>
              <tbody>
                {sorted.map((t) => {
                  const done = t.status === "done" || t.status === "cancelled";
                  return (
                    <tr key={t.id} className={done ? "task-done" : undefined}>
                      <td style={{ paddingRight: 0 }}><StatusCheck key={t.status} id={t.id} status={t.status} title={t.title} /></td>
                      <td style={{ maxWidth: 520 }}>
                        <span className="task-title">{t.title}</span>
                        {t.kind === "follow_up" && <span className="pill" data-tone="none" style={{ marginLeft: 8 }}>Follow-up{t.company ? ` · ${t.company}` : ""}</span>}
                        {t.kind === "milestone" && <span className="pill" data-tone="none" style={{ marginLeft: 8 }}>Milestone</span>}
                      </td>
                      <td className="tabular muted">{t.code ?? "—"}</td>
                      {showProject && <td>{t.projectCode ? <Link href={`/projects/${t.projectCode}`} className="hover:underline">{t.project}</Link> : <span className="muted">Inbox</span>}</td>}
                      <td>
                        <span className="pill" data-tone={STATUS_TONE[t.status]} style={{ position: "relative", paddingRight: 20 }}>
                          {STATUS_LABEL[t.status]}
                          <select aria-label={`Status of ${t.title}`} value={t.status} onChange={(e) => setStatus(t.id, e.target.value as Status)}
                            style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer" }}>
                            {Object.entries(STATUS_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                          </select>
                          <svg width="8" height="5" viewBox="0 0 10 6" style={{ position: "absolute", right: 8 }} aria-hidden="true"><path d="M1 1l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.6" /></svg>
                        </span>
                      </td>
                      <td><span className="pill" data-tone={PRIORITY_TONE[t.priority]}>{PRIORITY_LABEL[t.priority]}</span></td>
                      <td className={`tabular ${t.dueTone === "overdue" && !done ? "tone-red" : t.dueTone === "later" || done ? "muted" : ""}`} style={{ fontWeight: t.dueTone === "overdue" || t.dueTone === "today" ? 600 : 400 }}>
                        {t.dueText ?? <span className="muted">—</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )
      ) : (
        <div className="board" style={{ padding: 12 }}>
          {BOARD.map((status) => {
            const cards = sorted.filter((t) => t.status === status);
            return (
              <div key={status} className="board-col" data-over={over === status}
                onDragOver={(e) => { e.preventDefault(); setOver(status); }}
                onDragLeave={() => setOver((o) => (o === status ? null : o))}
                onDrop={(e) => { e.preventDefault(); const id = e.dataTransfer.getData("text/plain"); setOver(null); setDragId(null); if (id) setStatus(id, status); }}>
                <div className="board-col-head">
                  <span className="dot" data-tone={STATUS_TONE[status]} />{STATUS_LABEL[status]}
                  <span className="muted tabular" style={{ fontWeight: 400 }}>{cards.length}</span>
                </div>
                <div className="board-cards">
                  {cards.map((t) => (
                    <article key={t.id} className="card-task" draggable data-dragging={dragId === t.id}
                      onDragStart={(e) => { e.dataTransfer.setData("text/plain", t.id); e.dataTransfer.effectAllowed = "move"; setDragId(t.id); }}
                      onDragEnd={() => { setDragId(null); setOver(null); }}>
                      <div style={{ fontWeight: 600, lineHeight: 1.35 }}>{t.title}</div>
                      <div className="t-small muted" style={{ marginTop: 3 }}>{t.code ?? "Inbox"}{showProject && t.project ? ` · ${t.project}` : ""}</div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 8 }}>
                        {t.priority !== "normal" && <span className="pill" data-tone={PRIORITY_TONE[t.priority]}>{PRIORITY_LABEL[t.priority]}</span>}
                        {t.kind !== "task" && <span className="pill" data-tone="none">{t.kind === "follow_up" ? "Follow-up" : "Milestone"}</span>}
                        {t.dueText && status !== "done" && (
                          <span className={`t-small tabular ${t.dueTone === "overdue" ? "tone-red" : "muted"}`} style={{ marginLeft: "auto" }}>{t.dueText}</span>
                        )}
                      </div>
                      <label className="sr-only" htmlFor={`mv-${t.id}`}>Move {t.title}</label>
                      <select id={`mv-${t.id}`} className="sr-only" value={t.status} onChange={(e) => setStatus(t.id, e.target.value as Status)}>
                        {BOARD.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
                      </select>
                    </article>
                  ))}
                  {cards.length === 0 && <div className="t-small muted" style={{ padding: "8px 4px" }}>Drop tasks here</div>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
