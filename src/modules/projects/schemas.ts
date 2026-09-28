import { z } from "zod";
import { PROJECT_CODE_RE, PROJECT_STATUSES } from "./domain";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD");
const text = (max: number) => z.string().trim().max(max);

export const ProjectCreateSchema = z
  .object({
    code: z.string().trim().toUpperCase().max(32).regex(PROJECT_CODE_RE, "Code like HOWL-POS-01"),
    name: text(200).min(1),
    description: text(5000).nullish(),
    status: z.enum(PROJECT_STATUSES).optional(),
    company_id: z.uuid().nullish(),
    start_date: isoDate.nullish(),
    target_date: isoDate.nullish(),
  })
  .strict();

export const ProjectUpdateSchema = ProjectCreateSchema.omit({ code: true })
  .partial()
  .strict()
  .refine((v) => Object.keys(v).length > 0, "Nothing to update");

export const ProjectListQuery = z.object({
  status: z.array(z.enum(PROJECT_STATUSES)).optional(),
  include_archived: z.coerce.boolean().optional(),
});
