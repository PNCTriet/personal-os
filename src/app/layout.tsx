import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { appMode } from "@/lib/env";
import { resolveScope } from "@/lib/session";
import { themeScript } from "@/components/theme-toggle";
import { AppShell } from "@/components/shell/app-shell";
import { loadShellData } from "@/components/shell/shell-data";
import { getI18n } from "@/lib/i18n/server";
import { I18nProvider } from "@/lib/i18n/client";

// Fallback for non-Apple platforms (DESIGN.md: SF Pro → system-ui → Inter).
const inter = Inter({ subsets: ["latin", "vietnamese"], variable: "--font-inter", display: "swap" });

export const metadata: Metadata = {
  title: { default: "Personal OS", template: "%s · Personal OS" },
  description: "API-first personal operating system for work, time, money and relationships.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [{ media: "(prefers-color-scheme: light)", color: "#f5f5f7" }, { media: "(prefers-color-scheme: dark)", color: "#000000" }],
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const demo = appMode() === "demo";
  const scope = await resolveScope("web");
  const shell = scope ? await loadShellData(scope) : null;
  const { locale, t } = await getI18n();
  return (
    <html lang={locale} className={inter.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <I18nProvider locale={locale}>
        <a href="#main" className="sr-only focus:not-sr-only">{t("shell.skip")}</a>
        {shell ? (
          <AppShell demo={demo} signedIn={!!scope} counts={shell.counts} index={shell.index} pickers={shell.pickers}>{children}</AppShell>
        ) : (
          <main id="main">{children}</main>
        )}
        </I18nProvider>
      </body>
    </html>
  );
}
