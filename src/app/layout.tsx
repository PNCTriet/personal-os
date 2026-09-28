import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { appMode } from "@/lib/env";
import { resolveScope } from "@/lib/session";
import { themeScript } from "@/components/theme-toggle";
import { AppShell } from "@/components/shell/app-shell";
import { loadShellData } from "@/components/shell/shell-data";

// Fallback for non-Apple platforms (DESIGN.md: SF Pro → system-ui → Inter).
const inter = Inter({ subsets: ["latin", "vietnamese"], variable: "--font-inter", display: "swap" });

export const metadata: Metadata = {
  title: { default: "Personal OS", template: "%s · Personal OS" },
  description: "API-first personal operating system for work, time, money and relationships.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: [{ media: "(prefers-color-scheme: light)", color: "#f5f5f7" }, { media: "(prefers-color-scheme: dark)", color: "#000000" }],
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const demo = appMode() === "demo";
  const scope = await resolveScope("web");
  const shell = scope ? await loadShellData(scope) : null;
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <a href="#main" className="sr-only focus:not-sr-only">Skip to content</a>
        {shell ? (
          <AppShell demo={demo} signedIn={!!scope} counts={shell.counts} index={shell.index} pickers={shell.pickers}>{children}</AppShell>
        ) : (
          <main id="main">{children}</main>
        )}
      </body>
    </html>
  );
}
