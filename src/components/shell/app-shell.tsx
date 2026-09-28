"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Menu, PanelLeft, Plus, Search } from "lucide-react";
import { NAV, isActive } from "./nav";
import { ICONS } from "./icons";
import { ThemeToggle } from "@/components/theme-toggle";
import { CommandPalette, type SearchIndex } from "./command-palette";
import { QuickAddDialog } from "./quick-add-dialog";

export interface ShellProps {
  demo: boolean;
  signedIn: boolean;
  counts: Partial<Record<"tasks" | "today" | "inbox" | "approvals", number>>;
  index: SearchIndex;
  pickers: { projects: { id: string; code: string; name: string }[]; companies: { id: string; name: string }[] };
  children: ReactNode;
}

export function AppShell({ demo, signedIn, counts, index, pickers, children }: ShellProps) {
  const path = usePathname();
  const [drawer, setDrawer] = useState(false);
  const [palette, setPalette] = useState(false);
  const [quickAdd, setQuickAdd] = useState(false);

  // Close the mobile drawer on navigation (render-time sync instead of an effect).
  const [lastPath, setLastPath] = useState(path);
  if (lastPath !== path) { setLastPath(path); setDrawer(false); }

  const toggleSidebar = useCallback(() => {
    if (window.matchMedia("(max-width: 900px)").matches) { setDrawer((v) => !v); return; }
    const root = document.documentElement;
    const collapsed = root.dataset.sidebar === "collapsed";
    if (collapsed) delete root.dataset.sidebar; else root.dataset.sidebar = "collapsed";
    try { localStorage.setItem("sidebar", collapsed ? "expanded" : "collapsed"); } catch {}
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setPalette((v) => !v); }
      if (e.key === "Escape") { setDrawer(false); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="shell" data-drawer={drawer ? "open" : "closed"}>
      <aside className="sidebar" aria-label="Sidebar">
        <Link href="/" className="sidebar-brand" title="Personal OS">
          <span className="brand-mark" aria-hidden="true">
            <svg width="12" height="12" viewBox="0 0 12 12"><rect x="1" y="1" width="10" height="10" rx="3" fill="none" stroke="currentColor" strokeWidth="1.6" /><circle cx="6" cy="6" r="1.6" fill="currentColor" /></svg>
          </span>
          <span className="label">Personal OS</span>
        </Link>
        <nav aria-label="Primary">
          {NAV.map((g, gi) => (
            <div key={gi} className={g.label ? "nav-group" : undefined}>
              {g.label && <div className="nav-group-label">{g.label}</div>}
              {g.items.map((item) => {
                const Icon = ICONS[item.icon];
                const count = item.countKey ? counts[item.countKey] : undefined;
                return (
                  <Link key={item.href} href={item.href} className="nav-item" aria-current={isActive(path, item.href) ? "page" : undefined} title={item.label}>
                    <Icon aria-hidden="true" />
                    <span className="label">{item.label}</span>
                    {count ? <span className="count">{count}</span> : item.phase && !demo ? <span className="soon">{item.phase}</span> : null}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>
      </aside>
      <div className="drawer-backdrop" onClick={() => setDrawer(false)} aria-hidden="true" />

      <div className="main">
        <header className="topbar">
          <button type="button" className="icon-btn show-mobile" onClick={() => setDrawer(true)} aria-label="Open navigation"><Menu /></button>
          <button type="button" className="icon-btn hide-mobile" onClick={toggleSidebar} aria-label="Toggle sidebar" title="Toggle sidebar"><PanelLeft /></button>
          <button type="button" className="search-trigger" onClick={() => setPalette(true)} aria-label="Search and commands (⌘K)">
            <Search size={14} aria-hidden="true" />
            <span className="truncate-1">Search tasks, projects, people…</span>
            <span className="kbd hide-mobile">⌘K</span>
          </button>
          <div style={{ flex: 1 }} />
          {demo && <span className="badge-demo" title="Demo mode: sample data in server memory, no sign-in. Resets on restart.">Demo</span>}
          <ThemeToggle />
          {signedIn && !demo && (
            <form action="/auth/signout" method="post" className="hide-mobile"><button className="btn btn-plain" type="submit">Sign out</button></form>
          )}
          <button type="button" className="btn btn-primary" onClick={() => setQuickAdd(true)} aria-label="Quick add task">
            <Plus aria-hidden="true" /><span className="hide-mobile">New task</span>
          </button>
        </header>
        <main id="main" className="content" key={path}>{children}</main>
      </div>

      <CommandPalette open={palette} onOpenChange={setPalette} index={index} onQuickAdd={() => { setPalette(false); setQuickAdd(true); }} onToggleSidebar={toggleSidebar} />
      {quickAdd && <QuickAddDialog onClose={() => setQuickAdd(false)} pickers={pickers} />}
    </div>
  );
}
