import type { NewTask, Task, TaskFilter, TaskPatch } from "./domain";

export interface TaskRepository {
  list(filter: TaskFilter): Promise<Task[]>;
  /** UUID, current code, or a previous code (codes survive moves). */
  get(ref: string): Promise<Task | null>;
  /** Code is assigned by the store ({project}-T{NN}). */
  create(input: NewTask): Promise<Task>;
  /** Changing project_id re-codes the task and keeps the old code in previous_codes. */
  update(id: string, patch: TaskPatch): Promise<Task>;
  softDelete(id: string): Promise<void>;
}
