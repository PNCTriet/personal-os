import { ok, jsonBody, paginate, queryObject, route } from "@/lib/http";
import { createTask, listTasks, TaskListQuery } from "@/modules/tasks";

export const GET = route(async ({ req, scope, requestId }) => {
  const q = TaskListQuery.parse(queryObject(req));
  const tasks = await listTasks(scope, {
    project_id: q.project_id, statuses: q.status, priorities: q.priority, kind: q.kind,
    due_before: q.due_before, due_after: q.due_after, q: q.q,
  });
  const { page, meta } = paginate(tasks, q.limit, q.cursor);
  return ok(page, { requestId, meta });
});

export const POST = route(async ({ req, scope, requestId }) => {
  return ok(await createTask(scope, await jsonBody(req)), { status: 201, requestId });
});
