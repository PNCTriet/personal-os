/** Deterministic formatters (same output on server and client; no locale/timezone drift). */
const vndFmt = new Intl.NumberFormat("vi-VN");

export function vnd(n: number, opts: { sign?: boolean } = {}): string {
  const s = `${vndFmt.format(Math.abs(n))} ₫`;
  if (n < 0) return `−${s}`;
  return opts.sign && n > 0 ? `+${s}` : s;
}

/** 264,5 tr ₫ / 1,2 tỷ ₫ style compact amounts for KPI tiles. */
export function vndCompact(n: number): string {
  const a = Math.abs(n);
  const sign = n < 0 ? "−" : "";
  const f = (x: number) => x.toLocaleString("en-US", { maximumFractionDigits: x >= 100 ? 0 : 1 });
  if (a >= 1e9) return `${sign}${f(a / 1e9)}B ₫`;
  if (a >= 1e6) return `${sign}${f(a / 1e6)}M ₫`;
  if (a >= 1e3) return `${sign}${f(a / 1e3)}K ₫`;
  return `${sign}${a} ₫`;
}

export function clock(iso: string, tz: string): string {
  return new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: tz }).format(new Date(iso));
}

export function dayKey(iso: string, tz: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(new Date(iso));
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0] ?? "?";
  const last = parts[parts.length - 1] ?? "";
  return (parts.length > 1 ? `${first[0]}${last[0]}` : first.slice(0, 2)).toUpperCase();
}

export const pct = (n: number, d: number) => (d > 0 ? Math.min(1, Math.max(0, n / d)) : 0);
