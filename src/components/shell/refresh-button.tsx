"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { useI18n } from "@/lib/i18n/client";

export function RefreshButton() {
  const router = useRouter();
  const { t } = useI18n();
  const [pending, start] = useTransition();
  const [spin, setSpin] = useState(false);

  return (
    <button
      type="button"
      className={`icon-btn${pending || spin ? " spinning" : ""}`}
      aria-label={t("shell.refresh")}
      title={t("shell.refresh")}
      onClick={() => {
        setSpin(true);
        start(() => router.refresh());
        window.setTimeout(() => setSpin(false), 600);
      }}
    >
      <RefreshCw />
    </button>
  );
}
