import { intlLocale, translator, type Locale } from "@/lib/i18n";

/** "Today" is defined by the owner's timezone (schema.md conventions). Dates are ISO yyyy-mm-dd. */
export function todayISO(tz: string, now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

export function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function daysBetween(fromIso: string, toIso: string): number {
  return Math.round((Date.parse(`${toIso}T00:00:00Z`) - Date.parse(`${fromIso}T00:00:00Z`)) / 86_400_000);
}

export function hourIn(tz: string, now = new Date()): number {
  return Number(new Intl.DateTimeFormat("en-GB", { timeZone: tz, hour: "2-digit", hourCycle: "h23" }).format(now));
}

export function longDate(iso: string, locale: Locale = "en"): string {
  return new Intl.DateTimeFormat(intlLocale(locale), { weekday: "long", month: "long", day: "numeric", timeZone: "UTC" })
    .format(new Date(`${iso}T00:00:00Z`));
}

export function shortDate(iso: string, locale: Locale = "en"): string {
  return new Intl.DateTimeFormat(intlLocale(locale), { month: "short", day: "numeric", timeZone: "UTC" })
    .format(new Date(`${iso}T00:00:00Z`));
}

/** Human due label relative to today: Today, Tomorrow, Yesterday, 3 days overdue, Mon, Oct 3. */
export function dueLabel(due: string, today: string, locale: Locale = "en"): { text: string; tone: "overdue" | "today" | "soon" | "later" } {
  const t = translator(locale);
  const diff = daysBetween(today, due);
  if (diff < -1) return { text: t("due.overdueDays", { n: -diff }), tone: "overdue" };
  if (diff === -1) return { text: t("due.yesterday"), tone: "overdue" };
  if (diff === 0) return { text: t("due.today"), tone: "today" };
  if (diff === 1) return { text: t("due.tomorrow"), tone: "soon" };
  if (diff < 7) {
    const wd = new Intl.DateTimeFormat(intlLocale(locale), { weekday: "short", timeZone: "UTC" }).format(new Date(`${due}T00:00:00Z`));
    return { text: wd, tone: "soon" };
  }
  return { text: shortDate(due, locale), tone: "later" };
}

export function relativeTime(isoTs: string, locale: Locale = "en", now = new Date()): string {
  const t = translator(locale);
  const s = Math.max(0, Math.round((now.getTime() - Date.parse(isoTs)) / 1000));
  if (s < 45) return t("rel.now");
  const m = Math.round(s / 60);
  if (m < 60) return t("rel.min", { n: m });
  const h = Math.round(m / 60);
  if (h < 24) return t("rel.hour", { n: h });
  const d = Math.round(h / 24);
  return d === 1 ? t("due.yesterday") : t("rel.days", { n: d });
}
