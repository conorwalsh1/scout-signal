import type { RawIngestionEvent } from "@/types/ingestion";
import type { Company } from "@/types/database";

function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[^\w\s-]/g, "")
    .trim();
}

function normalizeDomain(domain: string): string {
  return domain.toLowerCase().replace(/^https?:\/\//, "").split("/")[0].trim();
}

/**
 * Match a raw event to an existing company by domain or normalized name.
 * Returns company id if found, null otherwise.
 */
export function matchCompany(
  raw: RawIngestionEvent,
  companies: Pick<Company, "id" | "name" | "domain">[]
): string | null {
  if (raw.company_domain) {
    const d = normalizeDomain(raw.company_domain);
    const byDomain = companies.find(
      (c) => c.domain && normalizeDomain(c.domain) === d
    );
    if (byDomain) return byDomain.id;
  }
  const name = normalizeName(raw.company_name_raw);
  const byName = companies.find((c) => normalizeName(c.name) === name);
  return byName?.id ?? null;
}
