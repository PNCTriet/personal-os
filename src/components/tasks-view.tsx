"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { ArrowDown, ArrowUp, Columns3, ListChecks, Search, Table2 } from "lucide-react";
import { changeTaskStatus } from "@/app/actions";
import type { TaskItem } from "./task-items";
import { StatusCheck } from "./task-status";
import { useI18n } from "@/lib/i18n/client";

type Status = TaskItem["status"];
const STATUSES: Status[] = ["backlog", "todo", "in_progress", "blocked", "done", "cancelled"];
const STATUS_TONE: Record<Status, string> = { backlog: "gray", todo: "gray", in_progress: "blue", blocked: "red", done: "green", cancelled: "none" };
const PRIORITIES = ["urgent", "high", "normal", "low"] as const;
const PRIORITY_TONE = { urgent: "red", high: "orange", normal: "gray", low: "none" } as const;
const PRIORITY_RANK = { urgent: 0, high: 1, normal: 2, low: 3 } as const;
const STATUS_RANK: Record<Status, number> = { in_progress: 0, blocked: 1, todo: 2, backlog: 3, done: 4, cancelled: 5 };
const BOARD: Status[] = ["backlog", "todo", "in_progress", "blocked", "done"];
const VIEWS = [
  { key: "open", test: (t: TaskItem) => t.status !== "done" && t.status !== "cancelled" },
  { key: "due", test: (t: TaskItem) => t.status !== "done" && t.status !== "cancelled" && (t.dueTone === "overdue" || t.dueTone === "today" || t.dueTone === "soon") },
  { key: "follow_up", test: (t: TaskItem) => t.kind === "follow_up" && t.status !== "done" && t.status !== "cancelled" },
  { key: "inbox", test: (t: TaskItem) => t.projectCode === null && t.status !== "done" && t.status !== "cancelled" },
  { key: "done", test: (t: TaskItem) => t.status === "done" },
  { key: "all", test: () => true },
] as const;
type SortKey = "title" | "project" | "status" | "priority" | "due";

export function TasksView({ items, showProject = true, initialView = "open", initialLayout = "table" }: {
  items: TaskItem[]; showProject?: boolean; initialView?: string; initialLayout?: "table" | "board";
}) {
  const router = useRouter();
  const { t: tr } = useI18n();
  const STATUS_LABEL = (st: Status) => tr(`task.status.${st}`);
  const PRIORITY_LABEL = (p: TaskItem["priority"]) => tr(`task.priority.${p}`);
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
        setError(res.message ?? tr("task.updateFailed"));
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

  const th = (key: SortKey, label: string, style?: React.CSSProperties, className?: string) => (
    <th style={style} className={className} aria-sort={sort.key === key ? (sort.dir === 1 ? "ascending" : "descending") : undefined}>
      <button type="button" onClick={() => setSort((s) => ({ key, dir: s.key === key ? (s.dir === 1 ? -1 : 1) : 1 }))}>
        {label}{sort.key === key && (sort.dir === 1 ? <ArrowUp size={12} /> : <ArrowDown size={12} />)}
      </button>
    </th>
  );

  return (
    <div className="panel">
      <div className="toolbar toolbar-tasks">
        <div className="segmented" role="group" aria-label="Layout">
          <button type="button" aria-pressed={layout === "table"} onClick={() => switchLayout("table")} aria-label={tr("task.table")}><Table2 aria-hidden="true" /><span className="hide-mobile">{tr("task.table")}</span></button>
          <button type="button" aria-pressed={layout === "board"} onClick={() => switchLayout("board")} aria-label={tr("task.board")}><Columns3 aria-hidden="true" /><span className="hide-mobile">{tr("task.board")}</span></button>
        </div>
        <div className="search">
          <Search aria-hidden="true" />
          <input className="field" value={q} onChange={(e) => setQ(e.target.value)} placeholder={tr("task.filter")} aria-label={tr("task.filter")} />
        </div>
        <div className="chip-row">
        {layout === "table" && VIEWS.map((v) => (
          <button key={v.key} type="button" className="chip" aria-pressed={view === v.key} onClick={() => setView(v.key)}>
            {tr(`task.view.${v.key}`)} <span className="n">{all.filter(v.test).length}</span>
          </button>
        ))}
        <select className="select" aria-label="Priority" value={priority} onChange={(e) => setPriority(e.target.value)}>
          <option value="">{tr("task.priorityAll")}</option>
          {PRIORITIES.map((k) => <option key={k} value={k}>{PRIORITY_LABEL(k)}</option>)}
        </select>
        {showProject && (
          <select className="select" aria-label="Project" value={project} onChange={(e) => setProject(e.target.value)}>
            <option value="">{tr("task.projectAll")}</option>
            <option value="inbox">{tr("common.inbox")}</option>
            {projects.map(([code, name]) => <option key={code} value={code}>{name}</option>)}
          </select>
        )}
        <span className="muted t-small tabular" style={{ marginLeft: "auto" }}>{error ? <span className="tone-red">{error}</span> : tr("task.count", { n: filtered.length })}</span>
        </div>
      </div>

      {layout === "table" ? (
        sorted.length === 0 ? (
          <div className="empty"><ListChecks aria-hidden="true" /><div className="t-h2">{tr("task.noMatch")}</div><div>{tr("task.noMatchBody")}</div></div>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th style={{ width: 36 }} aria-label="Done" />
                  {th("title", tr("task.col.task"))}
                  <th style={{ width: 150 }} className="hide-mobile">{tr("task.col.code")}</th>
                  {showProject && th("project", tr("task.col.project"), { width: 170 }, "hide-mobile")}
                  {th("status", tr("task.col.status"), { width: 140 }, "hide-mobile")}
                  {th("priority", tr("task.col.priority"), { width: 100 }, "hide-mobile")}
                  {th("due", tr("task.col.due"), { width: 120 })}
                </tr>
              </thead>
              <tbody>
                {sorted.map((t) => {
                  const done = t.status === "done" || t.status === "cancelled";
                  return (
                    <tr key={t.id} className={done ? "task-done" : undefined}>
                      <td style={{ paddingRight: 0 }}><StatusCheck key={t.status} id={t.id} status={t.status} title={t.title} /></td>
                      <td className="task-cell">
                        <span className="task-title">{t.title}</span>
                        {t.kind === "follow_up" && <span className="pill" data-tone="none" style={{ marginLeft: 8 }}>{tr("task.kind.follow_up")}{t.company ? ` · ${t.company}` : ""}</span>}
                        {t.kind === "milestone" && <span className="pill" data-tone="none" style={{ marginLeft: 8 }}>{tr("task.kind.milestone")}</span>}
                      </td>
                      <td className="tabular muted hide-mobile">{t.code ?? "—"}</td>
                      {showProject && <td className="hide-mobile">{t.projectCode ? <Link href={`/projects/${t.projectCode}`} className="hover:underline">{t.project}</Link> : <span className="muted">{tr("common.inbox")}</span>}</td>}
                      <td className="hide-mobile">
                        <span className="pill" data-tone={STATUS_TONE[t.status]} style={{ position: "relative", paddingRight: 20 }}>
                          {STATUS_LABEL(t.status)}
                          <select aria-label={`Status of ${t.title}`} value={t.status} onChange={(e) => setStatus(t.id, e.target.value as Status)}
                            style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer" }}>
                            {STATUSES.map((k) => <option key={k} value={k}>{STATUS_LABEL(k)}</option>)}
                          </select>
                          <svg width="8" height="5" viewBox="0 0 10 6" style={{ position: "absolute", right: 8 }} aria-hidden="true"><path d="M1 1l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.6" /></svg>
                        </span>
                      </td>
                      <td className="hide-mobile"><span className="pill" data-tone={PRIORITY_TONE[t.priority]}>{PRIORITY_LABEL(t.priority)}</span></td>
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
                  <span className="dot" data-tone={STATUS_TONE[status]} />{STATUS_LABEL(status)}
                  <span className="muted tabular" style={{ fontWeight: 400 }}>{cards.length}</span>
                </div>
                <div className="board-cards">
                  {cards.map((t) => (
                    <article key={t.id} className="card-task" draggable data-dragging={dragId === t.id}
                      onDragStart={(e) => { e.dataTransfer.setData("text/plain", t.id); e.dataTransfer.effectAllowed = "move"; setDragId(t.id); }}
                      onDragEnd={() => { setDragId(null); setOver(null); }}>
                      <div style={{ fontWeight: 600, lineHeight: 1.35 }}>{t.title}</div>
                      <div className="t-small muted" style={{ marginTop: 3 }}>{t.code ?? tr("common.inbox")}{showProject && t.project ? ` · ${t.project}` : ""}</div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 8 }}>
                        {t.priority !== "normal" && <span className="pill" data-tone={PRIORITY_TONE[t.priority]}>{PRIORITY_LABEL(t.priority)}</span>}
                        {t.kind !== "task" && <span className="pill" data-tone="none">{tr(`task.kind.${t.kind}`)}</span>}
                        {t.dueText && status !== "done" && (
                          <span className={`t-small tabular ${t.dueTone === "overdue" ? "tone-red" : "muted"}`} style={{ marginLeft: "auto" }}>{t.dueText}</span>
                        )}
                      </div>
                      <label className="sr-only" htmlFor={`mv-${t.id}`}>{t.title}</label>
                      <select id={`mv-${t.id}`} className="sr-only" value={t.status} onChange={(e) => setStatus(t.id, e.target.value as Status)}>
                        {BOARD.map((s) => <option key={s} value={s}>{STATUS_LABEL(s)}</option>)}
                      </select>
                    </article>
                  ))}
                  {cards.length === 0 && <div className="t-small muted" style={{ padding: "8px 4px" }}>{tr("task.dropHere")}</div>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
