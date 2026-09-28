"use client";

import { Command } from "cmdk";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { CheckCircle2, FolderKanban, Languages, Moon, PanelLeft, Plus, User } from "lucide-react";
import { useI18n } from "@/lib/i18n/client";
import { ALL_NAV_ITEMS } from "./nav";
import { ICONS } from "./icons";
import { toggleTheme } from "@/components/theme-toggle";

export interface SearchIndex {
  tasks: { id: string; code: string | null; title: string; href: string; status: string }[];
  projects: { code: string; name: string }[];
  people: { id: string; name: string; company: string | null }[];
}

export function CommandPalette({ open, onOpenChange, index, onQuickAdd, onToggleSidebar, onToggleLocale }: {
  open: boolean; onOpenChange: (v: boolean) => void; index: SearchIndex; onQuickAdd: () => void; onToggleSidebar: () => void; onToggleLocale: () => void;
}) {
  const router = useRouter();
  const { t } = useI18n();
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
          <Command.Input autoFocus placeholder={t("cmd.placeholder")} />
          <Command.List>
            <Command.Empty>{t("cmd.empty")}</Command.Empty>
            <Command.Group heading={t("cmd.actions")}>
              <Command.Item onSelect={onQuickAdd} value="new task add create"><Plus />{t("shell.newTask")}</Command.Item>
              <Command.Item onSelect={() => go("/projects#new")} value="new project create"><FolderKanban />{t("cmd.newProject")}</Command.Item>
              <Command.Item onSelect={() => { toggleTheme(); onOpenChange(false); }} value="toggle theme dark light mode"><Moon />{t("shell.toggleTheme")}</Command.Item>
              <Command.Item onSelect={() => { onToggleSidebar(); onOpenChange(false); }} value="toggle sidebar collapse"><PanelLeft />{t("shell.toggleSidebar")}</Command.Item>
              <Command.Item onSelect={() => { onToggleLocale(); onOpenChange(false); }} value="language ngôn ngữ vietnamese english tiếng việt"><Languages />{t("cmd.switchLang")}</Command.Item>
            </Command.Group>
            <Command.Group heading={t("cmd.goto")}>
              {ALL_NAV_ITEMS.map((n) => {
                const Icon = ICONS[n.icon];
                return <Command.Item key={n.href} value={`go ${t(n.label)} ${t(n.group)} ${n.href}`} onSelect={() => go(n.href)}><Icon />{t(n.label)}<span className="muted" style={{ marginLeft: "auto", fontSize: 11 }}>{t(n.group)}</span></Command.Item>;
              })}
            </Command.Group>
            {index.projects.length > 0 && (
              <Command.Group heading={t("nav.projects")}>
                {index.projects.map((p) => (
                  <Command.Item key={p.code} value={`project ${p.code} ${p.name}`} onSelect={() => go(`/projects/${p.code}`)}>
                    <FolderKanban />{p.name}<span className="muted tabular" style={{ marginLeft: "auto", fontSize: 11 }}>{p.code}</span>
                  </Command.Item>
                ))}
              </Command.Group>
            )}
            {index.tasks.length > 0 && (
              <Command.Group heading={t("nav.tasks")}>
                {index.tasks.map((task) => (
                  <Command.Item key={task.id} value={`task ${task.code ?? ""} ${task.title}`} onSelect={() => go(task.href)}>
                    <CheckCircle2 /><span className="truncate-1">{task.title}</span><span className="muted tabular" style={{ marginLeft: "auto", fontSize: 11 }}>{task.code ?? "—"}</span>
                  </Command.Item>
                ))}
              </Command.Group>
            )}
            {index.people.length > 0 && (
              <Command.Group heading={t("nav.people")}>
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
