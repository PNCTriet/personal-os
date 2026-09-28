"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import { QuickAdd } from "@/components/quick-add";
import { useI18n } from "@/lib/i18n/client";

export function QuickAddDialog({ onClose, pickers }: {
  onClose: () => void;
  pickers: { projects: { id: string; code: string; name: string }[]; companies: { id: string; name: string }[] };
}) {
  const { t } = useI18n();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={t("shell.newTask")} style={{ maxWidth: 560 }}>
        <div className="panel-head">
          <h2 className="t-h2">{t("shell.newTask")}</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label={t("shell.close")}><X /></button>
        </div>
        <div className="panel-body">
          <QuickAdd id="dialog-add" projects={pickers.projects} companies={pickers.companies} autoFocus onDone={onClose} />
        </div>
      </div>
    </div>
  );
}
