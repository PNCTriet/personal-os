"use client";

import { useEffect, useRef, useState } from "react";
import { initials } from "@/lib/format";
import { useI18n } from "@/lib/i18n/client";

export function UserMenu({ name, signedIn, demo }: { name: string; signedIn: boolean; demo: boolean }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (root.current && !root.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("pointerdown", onPointer);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", onPointer);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="user-menu" ref={root}>
      <button type="button" className="user-chip" onClick={() => setOpen((v) => !v)} aria-expanded={open} aria-haspopup="menu">
        <span className="avatar" aria-hidden="true">{initials(name)}</span>
        <span className="user-name truncate-1 hide-mobile">{name}</span>
      </button>
      {open && (
        <div className="user-dropdown" role="menu">
          <div className="t-small muted" style={{ padding: "6px 10px 8px" }}>{name}</div>
          {signedIn && !demo ? (
            <>
              <div className="user-dropdown-divider" />
              <form action="/auth/signout" method="post">
                <button className="user-dropdown-item danger" type="submit" role="menuitem">{t("shell.signOut")}</button>
              </form>
            </>
          ) : (
            <div className="t-small muted" style={{ padding: "4px 10px 8px" }}>{t("shell.demoHint")}</div>
          )}
        </div>
      )}
    </div>
  );
}
