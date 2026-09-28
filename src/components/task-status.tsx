"use client";

import { useOptimistic, useTransition } from "react";
import { changeTaskStatus } from "@/app/actions";

type Status = "backlog" | "todo" | "in_progress" | "blocked" | "done" | "cancelled";

/** Round check: toggles done ⇄ todo. Optimistic; the server action revalidates the page. */
export function StatusCheck({ id, status, title }: { id: string; status: Status; title: string }) {
  const [pending, start] = useTransition();
  const [optimistic, set] = useOptimistic(status);
  const done = optimistic === "done";
  return (
    <button
      type="button"
      className="check"
      data-state={optimistic}
      aria-pressed={done}
      aria-label={done ? `Mark “${title}” as not done` : `Mark “${title}” as done`}
      disabled={pending}
      onClick={() => start(async () => {
        const next: Status = done ? "todo" : "done";
        set(next);
        await changeTaskStatus(id, next);
      })}
    >
      <span>
        <svg width="10" height="10" viewBox="0 0 12 12" aria-hidden="true"><path d="M2.5 6.2l2.3 2.3 4.7-5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </span>
    </button>
  );
}

export function StatusSelect({ id, status, options }: { id: string; status: Status; options: { value: string; label: string }[] }) {
  const [pending, start] = useTransition();
  const [optimistic, set] = useOptimistic(status);
  return (
    <select
      className="select"
      aria-label="Status"
      value={optimistic}
      disabled={pending}
      onChange={(e) => {
        const next = e.target.value as Status;
        start(async () => { set(next); await changeTaskStatus(id, next); });
      }}
    >
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}
