type CompanySelectionCandidate = {
  id: string;
  name: string;
  score: number;
  website: string | null;
  domain: string | null;
  updated_at: string;
  score_components_json?: Record<string, unknown>;
  rank_position?: number | null;
  company_sources?: Array<{
    source_type?: string | null;
    source_external_id?: string | null;
    metadata_json?: Record<string, unknown> | null;
  }> | null;
};

const DEMO_COMPANY_NAMES = new Set(["acme corp", "beta labs", "gamma inc"]);
const DEMO_COMPANY_DOMAINS = new Set(["acme.example.com", "betalabs.io", "gamma-inc.com"]);

function normalizeCompanyName(name: string): string {
  return name.trim().toLowerCase();
}

function isDemoCompany(candidate: CompanySelectionCandidate): boolean {
  const normalizedName = normalizeCompanyName(candidate.name);
  const normalizedDomain = candidate.domain?.trim().toLowerCase() ?? null;
  const scoreComponents = candidate.score_components_json ?? {};

  return (
    DEMO_COMPANY_NAMES.has(normalizedName) ||
    (normalizedDomain ? DEMO_COMPANY_DOMAINS.has(normalizedDomain) : false) ||
    scoreComponents.demo_seed === true
  );
}

function hasFt1000Source(candidate: CompanySelectionCandidate): boolean {
  if (candidate.company_sources?.some((source) => source.source_type === "ft1000")) return true;
  const scoreComponents = candidate.score_components_json ?? {};
  return scoreComponents.ft1000_listed === true;
}

function compareCompanyCandidates<T extends CompanySelectionCandidate>(a: T, b: T): number {
  const aHasSite = Number(Boolean(a.website || a.domain));
  const bHasSite = Number(Boolean(b.website || b.domain));
  if (aHasSite !== bHasSite) return bHasSite - aHasSite;

  const aHasFt1000 = Number(hasFt1000Source(a));
  const bHasFt1000 = Number(hasFt1000Source(b));
  if (aHasFt1000 !== bHasFt1000) return bHasFt1000 - aHasFt1000;

  if (a.score !== b.score) return b.score - a.score;

  const aUpdated = new Date(a.updated_at).getTime();
  const bUpdated = new Date(b.updated_at).getTime();
  if (aUpdated !== bUpdated) return bUpdated - aUpdated;

  return a.id.localeCompare(b.id);
}

export function dedupeCompaniesByName<T extends CompanySelectionCandidate>(companies: T[]): T[] {
  const byName = new Map<string, T>();

  for (const company of companies) {
    const key = normalizeCompanyName(company.name);
    const existing = byName.get(key);
    if (!existing || compareCompanyCandidates(existing, company) > 0) {
      byName.set(key, company);
    }
  }

  return Array.from(byName.values());
}

export function sortCompaniesForDisplay<T extends CompanySelectionCandidate>(
  companies: T[],
  sort: "score" | "updated" | "rank" = "rank"
): T[] {
  return [...companies].sort((a, b) => {
    if (sort === "rank") {
      const aRank = a.rank_position ?? Number.MAX_SAFE_INTEGER;
      const bRank = b.rank_position ?? Number.MAX_SAFE_INTEGER;
      if (aRank !== bRank) return aRank - bRank;
      return compareCompanyCandidates(a, b);
    }
    if (sort === "updated") {
      const updatedDiff = new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
      if (updatedDiff !== 0) return updatedDiff;
    }

    const scoreDiff = (b.score ?? 0) - (a.score ?? 0);
    if (scoreDiff !== 0) return scoreDiff;

    return compareCompanyCandidates(a, b);
  });
}

export function filterLiveCompanies<T extends CompanySelectionCandidate>(companies: T[]): T[] {
  return companies.filter((company) => !isDemoCompany(company));
}
