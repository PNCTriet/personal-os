"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, type ReactNode } from "react";
import { ArrowDown, ArrowUp, Search } from "lucide-react";
import { initials, vnd } from "@/lib/format";
import { shortDate } from "@/lib/dates";
import { useI18n } from "@/lib/i18n/client";

export type Cell = string | number | boolean | null | string[];
export type Row = { id: string; href?: string } & Record<string, Cell | undefined>;
type Tone = "green" | "orange" | "red" | "blue" | "gray" | "none";

export interface Column {
  key: string;
  label: string;
  kind?: "text" | "strong" | "muted" | "mono" | "money" | "money-signed" | "date" | "number" | "pill" | "progress" | "person" | "tags" | "percent";
  align?: "right";
  sortKey?: string;
  tones?: Record<string, Tone>;
  labels?: Record<string, string>;
  width?: number | string;
  sortable?: boolean;
}

export interface Facet { key: string; label: string; labels?: Record<string, string> }

/**
 * Shared, generic table: text search, facet filters, sortable headers, row links.
 * Cells are formatted by `kind`, so pages pass plain serializable rows (no render functions).
 */
export function DataTable({ rows, columns, searchKeys = [], facets = [], defaultSort, empty, initialQuery = "", toolbar, noun = "item" }: {
  rows: Row[];
  columns: Column[];
  searchKeys?: string[];
  facets?: Facet[];
  defaultSort?: { key: string; dir: "asc" | "desc" };
  empty: ReactNode;
  initialQuery?: string;
  toolbar?: ReactNode;
  noun?: string;
}) {
  const router = useRouter();
  const { t, term, locale } = useI18n();
  const [q, setQ] = useState(initialQuery);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [sort, setSort] = useState(defaultSort ?? null);

  const facetValues = useMemo(() => Object.fromEntries(facets.map((f) => {
    const vals = new Set<string>();
    rows.forEach((r) => { const v = r[f.key]; (Array.isArray(v) ? v : [v]).forEach((x) => x != null && x !== "" && vals.add(String(x))); });
    return [f.key, [...vals].sort()];
  })), [rows, facets]);

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    let out = rows.filter((r) => {
      if (needle && !searchKeys.some((k) => String(r[k] ?? "").toLowerCase().includes(needle))) return false;
      return Object.entries(filters).every(([k, v]) => {
        if (!v) return true;
        const cell = r[k];
        return Array.isArray(cell) ? cell.includes(v) : String(cell) === v;
      });
    });
    if (sort) {
      const col = columns.find((c) => c.key === sort.key);
      const sk = col?.sortKey ?? sort.key;
      out = [...out].sort((a, b) => {
        const x = a[sk], y = b[sk];
        if (x == null && y == null) return 0;
        if (x == null) return 1;
        if (y == null) return -1;
        const c = typeof x === "number" && typeof y === "number" ? x - y : String(x).localeCompare(String(y), "vi", { numeric: true });
        return sort.dir === "asc" ? c : -c;
      });
    }
    return out;
  }, [rows, q, filters, sort, searchKeys, columns]);

  const hasToolbar = searchKeys.length > 0 || facets.length > 0 || toolbar;

  return (
    <div>
      {hasToolbar && (
        <div className="toolbar">
          {searchKeys.length > 0 && (
            <div className="search">
              <Search aria-hidden="true" />
              <input className="field" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("common.filter")} aria-label={t("common.filter")} />
            </div>
          )}
          {facets.map((f) => (
            <select key={f.key} className="select" aria-label={term(f.label)} value={filters[f.key] ?? ""} onChange={(e) => setFilters((s) => ({ ...s, [f.key]: e.target.value }))}>
              <option value="">{term(f.label)}: {t("common.all")}</option>
              {(facetValues[f.key] ?? []).map((v) => <option key={v} value={v}>{term(f.labels?.[v] ?? v)}</option>)}
            </select>
          ))}
          {toolbar}
          <span className="muted t-small tabular" style={{ marginLeft: "auto" }}>{locale === "en" ? `${shown.length} ${shown.length === 1 ? noun : `${noun}s`}` : t("common.rows", { n: shown.length })}</span>
        </div>
      )}
      {shown.length === 0 ? empty : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                {columns.map((c) => {
                  const active = sort?.key === c.key;
                  return (
                    <th key={c.key} className={c.align === "right" ? "num" : undefined} style={{ width: c.width }} aria-sort={active ? (sort!.dir === "asc" ? "ascending" : "descending") : undefined}>
                      {c.sortable === false ? term(c.label) : (
                        <button type="button" onClick={() => setSort((s) => s?.key === c.key ? { key: c.key, dir: s.dir === "asc" ? "desc" : "asc" } : { key: c.key, dir: c.kind === "date" || c.kind?.startsWith("money") || c.kind === "number" ? "desc" : "asc" })}>
                          {term(c.label)}
                          {active && (sort!.dir === "asc" ? <ArrowUp size={12} /> : <ArrowDown size={12} />)}
                        </button>
                      )}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {shown.map((r) => (
                <tr key={r.id} data-href={r.href} onClick={r.href ? (e) => { if (!(e.target as HTMLElement).closest("a,button,select,input")) router.push(r.href!); } : undefined}>
                  {columns.map((c, i) => (
                    <td key={c.key} className={c.align === "right" ? "num" : undefined}>
                      <CellView col={c} row={r} first={i === 0} term={term} locale={locale} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function CellView({ col, row, first, term, locale }: { col: Column; row: Row; first: boolean; term: (s: string) => string; locale: "vi" | "en" }) {
  const v = row[col.key];
  if (v == null || v === "") return <span className="muted">—</span>;
  // Translate only vocabulary (label maps, status pills), never free-text data.
  const label = (x: string) => (col.labels ? term(col.labels[x] ?? x) : col.kind === "pill" ? term(x) : x);
  let node: ReactNode;
  switch (col.kind) {
    case "strong": node = <span style={{ fontWeight: 600 }}>{label(String(v))}</span>; break;
    case "muted": node = <span className="muted">{label(String(v))}</span>; break;
    case "mono": node = <span className="tabular muted">{String(v)}</span>; break;
    case "money": node = <span className="tabular">{vnd(Number(v))}</span>; break;
    case "money-signed": { const n = Number(v); node = <span className={`tabular ${n > 0 ? "tone-green" : ""}`}>{vnd(n, { sign: true })}</span>; break; }
    case "date": node = <span className="tabular">{shortDate(String(v), locale)}</span>; break;
    case "number": node = <span className="tabular">{Number(v).toLocaleString("en-US")}</span>; break;
    case "percent": node = <span className="tabular">{Math.round(Number(v) * 100)}%</span>; break;
    case "pill": node = <span className="pill" data-tone={col.tones?.[String(v)] ?? "gray"}>{label(String(v))}</span>; break;
    case "progress": {
      const raw = Number(v);
      const n = Math.min(1, Math.max(0, raw));
      node = <span style={{ display: "inline-flex", alignItems: "center", gap: 8, width: "100%" }}><span className="progress" data-tone={raw > 1 ? "red" : undefined} style={{ flex: 1 }}><span style={{ transform: `scaleX(${n})` }} /></span><span className="tabular muted t-small" style={{ width: 32, textAlign: "right" }}>{Math.round(raw * 100)}%</span></span>;
      break;
    }
    case "person": node = <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}><span className="avatar">{initials(String(v))}</span><span style={{ fontWeight: 600 }}>{String(v)}</span></span>; break;
    case "tags": node = <span style={{ display: "inline-flex", gap: 4 }}>{(v as string[]).map((t) => <span key={t} className="pill" data-tone="none">{t}</span>)}</span>; break;
    default: node = String(label(String(v)));
  }
  if (first && row.href) return <Link href={row.href}>{node}</Link>;
  return node;
}
