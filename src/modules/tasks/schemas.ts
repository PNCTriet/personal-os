import { z } from "zod";
import { TASK_KINDS, TASK_PRIORITIES, TASK_STATUSES } from "./domain";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD");
const fields = {
  title: z.string().trim().min(1, "Title is required").max(500),
  description: z.string().trim().max(10_000).nullish(),
  project_id: z.uuid().nullish(),
  status: z.enum(TASK_STATUSES).optional(),
  priority: z.enum(TASK_PRIORITIES).optional(),
  kind: z.enum(TASK_KINDS).optional(),
  due_on: isoDate.nullish(),
  company_id: z.uuid().nullish(),
};

export const TaskCreateSchema = z
  .object(fields)
  .strict()
  .refine((v) => v.kind !== "follow_up" || !!v.company_id, {
    message: "A follow-up needs a company",
    path: ["company_id"],
  });

export const TaskUpdateSchema = z
  .object(fields)
  .partial()
  .strict()
  .refine((v) => Object.keys(v).length > 0, "Nothing to update");

const list = <T extends z.ZodTypeAny>(s: T) =>
  z.preprocess((v) => (v === undefined ? undefined : Array.isArray(v) ? v : [v]), z.array(s).optional());

export const TaskListQuery = z.object({
  project_id: z.uuid().optional(),
  status: list(z.enum(TASK_STATUSES)),
  priority: list(z.enum(TASK_PRIORITIES)),
  kind: z.enum(TASK_KINDS).optional(),
  due_before: isoDate.optional(),
  due_after: isoDate.optional(),
  q: z.string().trim().max(200).optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  cursor: z.string().max(200).optional(),
});
