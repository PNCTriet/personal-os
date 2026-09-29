import type { ReactNode } from "react";
import Link from "next/link";
import { Sparkles, type LucideIcon } from "lucide-react";
import { initials } from "@/lib/format";

export type Tone = "green" | "orange" | "red" | "blue" | "gray" | "none";
export type Crumb = { label: string; href?: string };

export function PageHeader({ title, subtitle, actions, phase, crumbs }: {
  title: string; subtitle?: ReactNode; actions?: ReactNode; phase?: string | null; crumbs?: Crumb[];
}) {
  const items: Crumb[] = crumbs ?? [{ label: title }];
  const isDetail = Boolean(crumbs?.length);
  const showToolbar = Boolean(actions || (!isDetail && (phase || subtitle)));
  return (
    <>
      <header className="page-header">
        <nav className="breadcrumb" aria-label="Breadcrumb">
          {items.map((c, i) => (
            <span key={`${c.label}-${i}`}>
              {i > 0 && <span className="breadcrumb-sep" aria-hidden="true">/</span>}
              {c.href ? <Link href={c.href} className="breadcrumb-link">{c.label}</Link> : <span className="breadcrumb-current">{c.label}</span>}
            </span>
          ))}
        </nav>
        {showToolbar && (
          <div className="page-toolbar">
            {!isDetail && subtitle && <span className="page-header-sub muted">{subtitle}</span>}
            {!isDetail && phase && <PhaseHint text={phase} />}
            <span className="page-toolbar-spacer" />
            {actions}
          </div>
        )}
      </header>
      {isDetail && (
        <div className="page-detail">
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <h1 className="t-title">{title}</h1>
            {phase && <PhaseHint text={phase} />}
          </div>
          {subtitle && <div className="muted" style={{ marginTop: 6 }}>{subtitle}</div>}
        </div>
      )}
    </>
  );
}

export function Panel({ title, action, children, className = "", footer, flush, style }: {
  title?: ReactNode; action?: ReactNode; children: ReactNode; className?: string; footer?: ReactNode; flush?: boolean; style?: React.CSSProperties;
}) {
  return (
    <section className={`panel ${className}`} style={{ display: "flex", flexDirection: "column", ...style }}>
      {(title || action) && (
        <div className="panel-head">
          {typeof title === "string" ? <h2 className="t-h2">{title}</h2> : title}
          {action}
        </div>
      )}
      <div className={flush ? "" : "panel-body"} style={{ flex: 1, minHeight: 0 }}>{children}</div>
      {footer && <div className="panel-foot">{footer}</div>}
    </section>
  );
}

/** "Connected in Phase N" hint for domains whose backend isn't built yet. */
export function PhaseHint({ text }: { text: string }) {
  return <span className="phase" title="Read-only preview. The backend for this domain ships in the phase shown (docs/roadmap.md)."><Sparkles aria-hidden="true" />{text}</span>;
}

export function EmptyState({ icon: Icon, title, body, phase, action }: { icon?: LucideIcon; title: string; body?: ReactNode; phase?: string; action?: ReactNode }) {
  return (
    <div className="empty">
      {Icon && <Icon aria-hidden="true" />}
      <div className="t-h2">{title}</div>
      {body && <div style={{ maxWidth: 380 }}>{body}</div>}
      {phase && <div style={{ marginTop: 6 }}><PhaseHint text={phase} /></div>}
      {action && <div style={{ marginTop: 8 }}>{action}</div>}
    </div>
  );
}

export function Pill({ tone = "gray", children }: { tone?: Tone; children: ReactNode }) {
  return <span className="pill" data-tone={tone}>{children}</span>;
}

export function Progress({ value, tone, label }: { value: number; tone?: Tone; label?: string }) {
  const v = Math.min(1, Math.max(0, value));
  return (
    <div className="progress" data-tone={tone} role="progressbar" aria-valuenow={Math.round(v * 100)} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
      <span style={{ transform: `scaleX(${v})` }} />
    </div>
  );
}

export function Avatar({ name }: { name: string }) {
  return <span className="avatar" aria-hidden="true">{initials(name)}</span>;
}
