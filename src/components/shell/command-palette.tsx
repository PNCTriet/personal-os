"use client";

import { Command } from "cmdk";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { CheckCircle2, FolderKanban, Moon, PanelLeft, Plus, User } from "lucide-react";
import { ALL_NAV_ITEMS } from "./nav";
import { ICONS } from "./icons";
import { toggleTheme } from "@/components/theme-toggle";

export interface SearchIndex {
  tasks: { id: string; code: string | null; title: string; href: string; status: string }[];
  projects: { code: string; name: string }[];
  people: { id: string; name: string; company: string | null }[];
}

export function CommandPalette({ open, onOpenChange, index, onQuickAdd, onToggleSidebar }: {
  open: boolean; onOpenChange: (v: boolean) => void; index: SearchIndex; onQuickAdd: () => void; onToggleSidebar: () => void;
}) {
  const router = useRouter();
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onOpenChange(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);
  if (!open) return null;

  const go = (href: string) => { onOpenChange(false); router.push(href); };

  return (
    <div className="overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onOpenChange(false); }}>
      <div className="modal" role="dialog" aria-modal="true" aria-label="Command palette">
        <Command label="Command palette" loop filter={(value, search) => {
          const v = value.toLowerCase();
          return search.toLowerCase().split(/\s+/).filter(Boolean).every((w) => v.includes(w)) ? 1 : 0;
        }}>
          <Command.Input autoFocus placeholder="Search or jump to…" />
          <Command.List>
            <Command.Empty>No results.</Command.Empty>
            <Command.Group heading="Actions">
              <Command.Item onSelect={onQuickAdd} value="new task add create"><Plus />New task</Command.Item>
              <Command.Item onSelect={() => go("/projects#new")} value="new project create"><FolderKanban />New project</Command.Item>
              <Command.Item onSelect={() => { toggleTheme(); onOpenChange(false); }} value="toggle theme dark light mode"><Moon />Toggle dark mode</Command.Item>
              <Command.Item onSelect={() => { onToggleSidebar(); onOpenChange(false); }} value="toggle sidebar collapse"><PanelLeft />Toggle sidebar</Command.Item>
            </Command.Group>
            <Command.Group heading="Go to">
              {ALL_NAV_ITEMS.map((n) => {
                const Icon = ICONS[n.icon];
                return <Command.Item key={n.href} value={`go ${n.label} ${n.group}`} onSelect={() => go(n.href)}><Icon />{n.label}<span className="muted" style={{ marginLeft: "auto", fontSize: 11 }}>{n.group}</span></Command.Item>;
              })}
            </Command.Group>
            {index.projects.length > 0 && (
              <Command.Group heading="Projects">
                {index.projects.map((p) => (
                  <Command.Item key={p.code} value={`project ${p.code} ${p.name}`} onSelect={() => go(`/projects/${p.code}`)}>
                    <FolderKanban />{p.name}<span className="muted tabular" style={{ marginLeft: "auto", fontSize: 11 }}>{p.code}</span>
                  </Command.Item>
                ))}
              </Command.Group>
            )}
            {index.tasks.length > 0 && (
              <Command.Group heading="Tasks">
                {index.tasks.map((t) => (
                  <Command.Item key={t.id} value={`task ${t.code ?? ""} ${t.title}`} onSelect={() => go(t.href)}>
                    <CheckCircle2 /><span className="truncate-1">{t.title}</span><span className="muted tabular" style={{ marginLeft: "auto", fontSize: 11 }}>{t.code ?? "Inbox"}</span>
                  </Command.Item>
                ))}
              </Command.Group>
            )}
            {index.people.length > 0 && (
              <Command.Group heading="People">
                {index.people.map((p) => (
                  <Command.Item key={p.id} value={`person ${p.name} ${p.company ?? ""}`} onSelect={() => go(`/people?q=${encodeURIComponent(p.name)}`)}>
                    <User />{p.name}<span className="muted" style={{ marginLeft: "auto", fontSize: 11 }}>{p.company}</span>
                  </Command.Item>
                ))}
              </Command.Group>
            )}
          </Command.List>
        </Command>
      </div>
    </div>
  );
}
