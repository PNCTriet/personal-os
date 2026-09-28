import { ok, jsonBody, route } from "@/lib/http";
import { createProject, listProjectsWithStats } from "@/modules/projects";

export const GET = route(async ({ req, scope, requestId }) => {
  const includeArchived = req.nextUrl.searchParams.get("include_archived") === "true";
  const projects = (await listProjectsWithStats(scope)).filter((p) => includeArchived || !p.archived_at);
  return ok(projects, { requestId, meta: { count: projects.length } });
});

export const POST = route(async ({ req, scope, requestId }) => {
  const project = await createProject(scope, await jsonBody(req));
  return ok(project, { status: 201, requestId });
});
