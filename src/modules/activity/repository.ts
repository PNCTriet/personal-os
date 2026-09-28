import type { ActivityEntry, NewActivity } from "./domain";

export interface ActivityRepository {
  record(entry: NewActivity): Promise<void>;
  list(opts: { limit: number; entityIds?: string[] }): Promise<ActivityEntry[]>;
}
