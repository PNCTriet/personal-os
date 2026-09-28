"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { LOCALE_COOKIE, term, translator, type Locale } from "./index";

const Ctx = createContext<Locale>("vi");

export function I18nProvider({ locale, children }: { locale: Locale; children: ReactNode }) {
  return <Ctx.Provider value={locale}>{children}</Ctx.Provider>;
}

export function useI18n() {
  const locale = useContext(Ctx);
  return useMemo(() => ({ locale, t: translator(locale), term: (s: string) => term(locale, s) }), [locale]);
}

/** Persist for a year; the server reads it on the next render (router.refresh()). */
export function saveLocale(l: Locale) {
  document.cookie = `${LOCALE_COOKIE}=${l}; path=/; max-age=31536000; samesite=lax`;
  document.documentElement.lang = l;
}
