import type { Company } from "./domain";

export interface CompanyRepository {
  list(): Promise<Company[]>;
  get(id: string): Promise<Company | null>;
}
