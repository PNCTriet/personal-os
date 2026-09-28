import { NextResponse } from "next/server";
import { ok, jsonBody, route } from "@/lib/http";
import { deleteProject, getProject, statsFor, updateProject } from "@/modules/projects";
import { listTasks } from "@/modules/tasks";
import { todayISO } from "@/lib/dates";

type P = { idOrCode: string };

export const GET = route<P>(async ({ scope, params, requestId }) => {
  const project = await getProject(scope, params.idOrCode);
  const tasks = await listTasks(scope, { project_id: project.id });
  return ok({ ...project, stats: statsFor(tasks, todayISO(scope.ctx.timezone)) }, { requestId });
});

export const PATCH = route<P>(async ({ req, scope, params, requestId }) => {
  return ok(await updateProject(scope, params.idOrCode, await jsonBody(req)), { requestId });
});

export const DELETE = route<P>(async ({ scope, params }) => {
  await deleteProject(scope, params.idOrCode);
  return new NextResponse(null, { status: 204 });
});
