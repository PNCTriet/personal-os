import type { Metadata } from "next";
import { requireScope } from "@/lib/session";
import { listTasks } from "@/modules/tasks";
import { loadLookups } from "@/components/lookups";
import { toTaskItems } from "@/components/task-items";
import { TasksView } from "@/components/tasks-view";
import { QuickAdd } from "@/components/quick-add";
import { PageHeader } from "@/components/ui/page";

export const metadata: Metadata = { title: "Tasks" };
export const dynamic = "force-dynamic";

export default async function TasksPage({ searchParams }: { searchParams: Promise<{ view?: string; layout?: string }> }) {
  const sp = await searchParams;
  const scope = await requireScope();
  const [tasks, { lk, pickers }] = await Promise.all([listTasks(scope), loadLookups(scope)]);
  const items = toTaskItems(tasks, lk);
  const open = items.filter((t) => t.status !== "done" && t.status !== "cancelled").length;
  return (
    <>
      <PageHeader title="Tasks" subtitle={`${open} open · ${items.filter((t) => t.dueTone === "overdue" && t.status !== "done" && t.status !== "cancelled").length} overdue`} />
      <div className="panel" style={{ padding: 12, marginBottom: 12 }}>
        <QuickAdd id="tasks-add" projects={pickers.projects} companies={pickers.companies} compact />
      </div>
      <TasksView items={items} initialView={sp.view} initialLayout={sp.layout === "board" ? "board" : "table"} />
    </>
  );
}
