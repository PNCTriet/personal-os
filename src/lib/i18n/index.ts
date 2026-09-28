import { en, type MessageKey } from "./en";
import { vi, viTerms } from "./vi";

export type Locale = "vi" | "en";
export type { MessageKey };
export const LOCALES: Locale[] = ["vi", "en"];
export const DEFAULT_LOCALE: Locale = "vi";
export const LOCALE_COOKIE = "locale";

export const isLocale = (v: unknown): v is Locale => v === "vi" || v === "en";

export type Vars = Record<string, string | number>;
export type T = (key: MessageKey, vars?: Vars) => string;

export function translator(locale: Locale): T {
  const dict = locale === "vi" ? vi : en;
  return (key, vars) => {
    const s: string = dict[key] ?? en[key] ?? key;
    return vars ? s.replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? `{${k}}`)) : s;
  };
}

/** Loose lookup for English table vocabulary (column headers, status labels). Missing terms pass through. */
export function term(locale: Locale, s: string): string {
  return locale === "vi" ? (viTerms[s] ?? s) : s;
}

/** BCP 47 tag for Intl formatters. */
export const intlLocale = (l: Locale) => (l === "vi" ? "vi-VN" : "en-US");
