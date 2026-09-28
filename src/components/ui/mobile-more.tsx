"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";

/**
 * Progressive disclosure for phones: children render inline (display: contents) on wider screens,
 * and collapse behind a single "Show more" row below 760px.
 */
export function MobileMore({ more, less, hint, children }: { more: string; less: string; hint?: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className="more-toggle" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
        <span>{open ? less : more}</span>
        {!open && hint && <span className="muted truncate-1">{hint}</span>}
        <ChevronDown aria-hidden="true" style={{ transform: open ? "rotate(180deg)" : undefined }} />
      </button>
      <div className="more-body" data-open={open}>{children}</div>
    </>
  );
}
