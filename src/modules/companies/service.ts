import type { Scope } from "@/lib/context";
import { notFound } from "@/lib/errors";

export function listCompanies({ repos }: Scope) {
  return repos.companies.list();
}

export async function getCompany({ repos }: Scope, id: string) {
  const c = await repos.companies.get(id);
  if (!c) throw notFound("Company");
  return c;
}
