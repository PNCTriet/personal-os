import type { ReactNode } from "react";
import { Sparkles, type LucideIcon } from "lucide-react";
import { initials } from "@/lib/format";

export type Tone = "green" | "orange" | "red" | "blue" | "gray" | "none";

export function PageHeader({ title, subtitle, actions, phase }: { title: string; subtitle?: ReactNode; actions?: ReactNode; phase?: string | null }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16, flexWrap: "wrap", marginBottom: 16 }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <h1 className="t-title">{title}</h1>
          {phase && <PhaseHint text={phase} />}
        </div>
        {subtitle && <p className="muted" style={{ margin: "3px 0 0" }}>{subtitle}</p>}
      </div>
      {actions && <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>{actions}</div>}
    </div>
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
