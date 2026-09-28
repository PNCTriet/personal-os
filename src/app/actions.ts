"use server";

import { revalidatePath } from "next/cache";
import { ZodError } from "zod";
import { AppError } from "@/lib/errors";
import { appMode, env } from "@/lib/env";
import { requireScope } from "@/lib/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createTask, setTaskStatus, TASK_STATUSES, type TaskStatus } from "@/modules/tasks";
import { createProject } from "@/modules/projects";

export type FormState = { ok: boolean; message?: string; nonce?: number };

const s = (fd: FormData, k: string) => {
  const v = fd.get(k);
  return typeof v === "string" && v.trim() !== "" ? v.trim() : undefined;
};

function toMessage(err: unknown): string {
  if (err instanceof ZodError) return err.issues[0]?.message ?? "Check the form";
  if (err instanceof AppError) return err.message;
  console.error(err);
  return "Something went wrong";
}

export async function quickAddTask(_: FormState, fd: FormData): Promise<FormState> {
  try {
    const scope = await requireScope();
    const kind = s(fd, "kind") ?? "task";
    await createTask(scope, {
      title: s(fd, "title") ?? "",
      project_id: s(fd, "project_id") ?? null,
      priority: s(fd, "priority") ?? "normal",
      due_on: s(fd, "due_on") ?? null,
      kind,
      company_id: kind === "follow_up" ? (s(fd, "company_id") ?? null) : null,
    });
    revalidatePath("/", "layout");
    return { ok: true, nonce: Date.now() };
  } catch (err) {
    return { ok: false, message: toMessage(err) };
  }
}

export async function changeTaskStatus(taskId: string, status: TaskStatus): Promise<FormState> {
  try {
    if (!TASK_STATUSES.includes(status)) throw new AppError("validation_error", "Unknown status");
    const scope = await requireScope();
    await setTaskStatus(scope, taskId, status);
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (err) {
    return { ok: false, message: toMessage(err) };
  }
}

export async function createProjectAction(_: FormState, fd: FormData): Promise<FormState> {
  try {
    const scope = await requireScope();
    await createProject(scope, {
      code: s(fd, "code") ?? "",
      name: s(fd, "name") ?? "",
      description: s(fd, "description") ?? null,
      target_date: s(fd, "target_date") ?? null,
      status: "active",
    });
    revalidatePath("/", "layout");
    return { ok: true, nonce: Date.now() };
  } catch (err) {
    return { ok: false, message: toMessage(err) };
  }
}

/** Owner-only magic link. Always returns the same generic message (no account enumeration). */
export async function sendMagicLink(_: FormState, fd: FormData): Promise<FormState> {
  const generic: FormState = { ok: true, message: "If that address belongs to the owner, a sign-in link is on its way." };
  if (appMode() !== "supabase") return { ok: false, message: "Demo mode has no sign-in. Everything is already open." };
  const email = (s(fd, "email") ?? "").toLowerCase();
  if (!email || email !== env.ownerEmail) return generic;
  const db = await createSupabaseServerClient();
  const { error } = await db.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: false, emailRedirectTo: `${env.appUrl}/auth/callback` },
  });
  if (error) console.error("magic link", error.message);
  return generic;
}
