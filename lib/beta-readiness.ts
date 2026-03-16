type BetaCompanyLike = {
  score: number;
  website: string | null;
  domain: string | null;
  score_components_json?: Record<string, unknown>;
};

const BLOCKED_LAUNCH_DOMAINS = [
  "venturebeat.com",
  "techcrunch.com",
  "reuters.com",
  "bloomberg.com",
  "ft.com",
  "statista.com",
  "crunchbase.com",
  "linkedin.com",
  "greenhouse.io",
  "lever.co",
  "ashbyhq.com",
];

function normalizeDomain(domain: string | null | undefined): string | null {
  if (!domain) return null;
  try {
    const value = domain.startsWith("http") ? new URL(domain).hostname : domain;
    return value.replace(/^www\./, "").toLowerCase();
  } catch {
    return domain.replace(/^www\./, "").toLowerCase();
  }
}

function isBlockedLaunchDomain(domain: string | null | undefined): boolean {
  const normalized = normalizeDomain(domain);
  if (!normalized) return false;
  return BLOCKED_LAUNCH_DOMAINS.some(
    (blocked) => normalized === blocked || normalized.endsWith(`.${blocked}`)
  );
}

export function hasMeaningfulSignals(scoreComponents: Record<string, unknown> | null | undefined): boolean {
  const c = scoreComponents ?? {};
  return (
    ((c.job_posts as number) ?? 0) > 0 ||
    !!c.hiring_spike ||
    !!c.engineering_hiring ||
    !!c.ai_hiring ||
    !!c.remote_hiring ||
    !!c.new_department_hiring ||
    !!c.leadership_hiring ||
    !!c.funding_event
  );
}

export function isLaunchReadyCompany(company: BetaCompanyLike): boolean {
  const scoreComponents = company.score_components_json ?? {};
  const hasSite = Boolean(company.website || company.domain);
  const hasBlockedDomain = isBlockedLaunchDomain(company.domain) || isBlockedLaunchDomain(company.website);
  const hasSignals = hasMeaningfulSignals(scoreComponents);
  const ft1000Listed = scoreComponents.ft1000_listed === true;
  const score = company.score ?? 0;

  if (hasBlockedDomain) return false;
  if (!hasSite) return false;
  if (hasSignals && score >= 20) return true;
  if (ft1000Listed && score >= 25) return true;
  return false;
}

export function filterLaunchReadyCompanies<T extends BetaCompanyLike>(companies: T[]): T[] {
  return companies.filter(isLaunchReadyCompany);
}

export function isStaleTimestamp(iso: string | null | undefined, maxHours: number): boolean {
  if (!iso) return true;
  const time = new Date(iso).getTime();
  if (Number.isNaN(time)) return true;
  return Date.now() - time > maxHours * 60 * 60 * 1000;
}
