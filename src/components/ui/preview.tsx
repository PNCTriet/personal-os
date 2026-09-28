import type { LucideIcon } from "lucide-react";
import { EmptyState } from "./page";

/** Empty state for preview tables: "no data yet, connected in Phase N" vs "filters match nothing". */
export function previewEmpty(icon: LucideIcon, noun: string, phase: number | string, hasRows: boolean) {
  return hasRows
    ? <EmptyState icon={icon} title="No matches" body="Try a different filter." />
    : <EmptyState icon={icon} title={`No ${noun} yet`} body={`This area is read-only until its backend ships.`} phase={`Connected in Phase ${phase}`} />;
}

export function phaseLabel(demo: boolean, phase: number | string) {
  return demo ? `Preview · Phase ${phase}` : `Phase ${phase}`;
}
