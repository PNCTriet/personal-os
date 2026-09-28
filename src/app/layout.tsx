import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { appMode } from "@/lib/env";
import { resolveScope } from "@/lib/session";
import { GlobalNav } from "@/components/global-nav";
import { Footer } from "@/components/footer";
import { themeScript } from "@/components/theme-toggle";

// Fallback for non-Apple platforms (DESIGN.md: SF Pro → system-ui → Inter).
const inter = Inter({ subsets: ["latin", "vietnamese"], variable: "--font-inter", display: "swap" });

export const metadata: Metadata = {
  title: { default: "Personal OS", template: "%s · Personal OS" },
  description: "API-first personal operating system for work, time, money and relationships.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: [{ media: "(prefers-color-scheme: light)", color: "#000000" }, { media: "(prefers-color-scheme: dark)", color: "#000000" }],
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const demo = appMode() === "demo";
  const scope = demo ? null : await resolveScope("web");
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <a href="#main" className="sr-only focus:not-sr-only">Skip to content</a>
        <GlobalNav demo={demo} signedIn={demo || !!scope} />
        <main id="main">{children}</main>
        <Footer demo={demo} />
      </body>
    </html>
  );
}
