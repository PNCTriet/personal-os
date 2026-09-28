import { NextResponse } from "next/server";
import { ok, jsonBody, route } from "@/lib/http";
import { deleteTask, getTask, updateTask } from "@/modules/tasks";

type P = { idOrCode: string };

export const GET = route<P>(async ({ scope, params, requestId }) => ok(await getTask(scope, params.idOrCode), { requestId }));

export const PATCH = route<P>(async ({ req, scope, params, requestId }) =>
  ok(await updateTask(scope, params.idOrCode, await jsonBody(req)), { requestId }));

export const DELETE = route<P>(async ({ scope, params }) => {
  await deleteTask(scope, params.idOrCode);
  return new NextResponse(null, { status: 204 });
});
