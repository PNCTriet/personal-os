"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import { QuickAdd } from "@/components/quick-add";

export function QuickAddDialog({ onClose, pickers }: {
  onClose: () => void;
  pickers: { projects: { id: string; code: string; name: string }[]; companies: { id: string; name: string }[] };
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal" role="dialog" aria-modal="true" aria-label="New task" style={{ maxWidth: 560 }}>
        <div className="panel-head">
          <h2 className="t-h2">New task</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close"><X /></button>
        </div>
        <div className="panel-body">
          <QuickAdd id="dialog-add" projects={pickers.projects} companies={pickers.companies} autoFocus onDone={onClose} />
        </div>
      </div>
    </div>
  );
}
