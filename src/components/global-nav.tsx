"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { ThemeToggle } from "./theme-toggle";

const LINKS = [
  { href: "/", label: "Overview" },
  { href: "/today", label: "Today" },
  { href: "/tasks", label: "Tasks" },
  { href: "/projects", label: "Projects" },
];

function isActive(path: string, href: string) {
  return href === "/" ? path === "/" : path === href || path.startsWith(`${href}/`);
}

export function GlobalNav({ demo, signedIn }: { demo: boolean; signedIn: boolean }) {
  const path = usePathname();
  const menu = useRef<HTMLDetailsElement>(null);
  useEffect(() => { if (menu.current) menu.current.open = false; }, [path]);

  return (
    <header className="global-nav">
      <nav className="inner" aria-label="Global">
        <details className="nav-menu" ref={menu}>
          <summary aria-label="Menu">
            <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><path d="M2 6h14M2 12h14" stroke="#fff" strokeWidth="1.3" strokeLinecap="round" /></svg>
          </summary>
          <div className="sheet">
            {LINKS.map((l) => <Link key={l.href} href={l.href}>{l.label}</Link>)}
          </div>
        </details>
        <Link href="/" className="brand" aria-label="Personal OS home">
          <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><rect x="1" y="1" width="14" height="14" rx="4" fill="none" stroke="#fff" strokeWidth="1.5" /><circle cx="8" cy="8" r="2.25" fill="#fff" /></svg>
          <span>Personal OS</span>
        </Link>
        <div className="links">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} aria-current={isActive(path, l.href) ? "page" : undefined}>{l.label}</Link>
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {demo && <span className="badge-demo" title="Demo mode: in-memory sample data, no sign-in. Changes reset on restart.">Demo</span>}
          <ThemeToggle />
          {signedIn && !demo && (
            <form action="/auth/signout" method="post"><button type="submit" style={{ background: "none", border: 0, cursor: "pointer" }}>Sign out</button></form>
          )}
        </div>
      </nav>
    </header>
  );
}
