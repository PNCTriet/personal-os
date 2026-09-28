import type { LucideIcon } from "lucide-react";
import type { T } from "@/lib/i18n";
import { EmptyState } from "./page";

/** Empty state for preview tables: "no data yet, connected in Phase N" vs "filters match nothing". */
export function previewEmpty(t: T, icon: LucideIcon, noun: string, phase: number | string, hasRows: boolean) {
  return hasRows
    ? <EmptyState icon={icon} title={t("common.noMatches")} body={t("common.tryFilter")} />
    : <EmptyState icon={icon} title={t("common.noneYet", { noun })} body={t("common.readOnly")} phase={t("common.connectedIn", { p: phase })} />;
}

export function phaseLabel(t: T, demo: boolean, phase: number | string) {
  return demo ? t("common.preview", { p: phase }) : t("common.phase", { p: phase });
}
