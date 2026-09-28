import Link from "next/link";
import { Compass } from "lucide-react";
import { EmptyState } from "@/components/ui/page";
import { getI18n } from "@/lib/i18n/server";

export default async function NotFound() {
  const { t } = await getI18n();
  return (
    <div className="panel" style={{ marginTop: 24 }}>
      <EmptyState icon={Compass} title={t("common.notFound")} action={<Link href="/" className="btn btn-plain">{t("common.backHome")}</Link>} />
    </div>
  );
}
