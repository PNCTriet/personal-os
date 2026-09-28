import Link from "next/link";
import { Compass } from "lucide-react";
import { EmptyState } from "@/components/ui/page";

export default function NotFound() {
  return (
    <div className="panel" style={{ marginTop: 24 }}>
      <EmptyState icon={Compass} title="This page isn’t here" action={<Link href="/" className="btn btn-plain">Back to Dashboard</Link>} />
    </div>
  );
}
