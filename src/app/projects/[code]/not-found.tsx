import Link from "next/link";
import { FolderKanban } from "lucide-react";
import { EmptyState } from "@/components/ui/page";

export default function ProjectNotFound() {
  return (
    <div className="panel">
      <EmptyState icon={FolderKanban} title="No project with that code" body="Codes look like HOWL-POS-01." action={<Link href="/projects" className="btn btn-plain">All projects</Link>} />
    </div>
  );
}
