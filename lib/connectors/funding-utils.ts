export function extractCompanyFromFundingTitle(title: string): string | null {
  const t = title.trim();
  if (!t) return null;
  const raiseMatch = t.match(/^([^–—-]+?)\s+(?:raises?|secures?|closes?|lands?|announces?)\s+/i)
    ?? t.match(/\s+([^–—-]+?)\s+(?:raises?|secures?|closes?|lands?|announces?)\s+/i);
  if (raiseMatch) return raiseMatch[1].trim();
  const fundedMatch = t.match(/([^–—-]+?)\s+(?:raises?|secures?|gets?)\s+\$[\d.]+\s*[KMB]/i);
  if (fundedMatch) return fundedMatch[1].trim();
  return null;
}

export function detectFundingRoundType(content: string): string | null {
  const value = content.toLowerCase();
  if (/\bstrategic investment\b|\bstrategic backing\b/.test(value)) return "strategic_investment";
  if (/\bpre-seed\b/.test(value)) return "pre_seed";
  if (/\bseed\b/.test(value)) return "seed";
  if (/\bseries\s+a\b/.test(value)) return "series_a";
  if (/\bseries\s+b\b/.test(value)) return "series_b";
  if (/\bseries\s+c\b|\bseries\s+d\b|\bseries\s+e\b|\bseries\s+f\b|\bgrowth round\b/.test(value)) {
    return "series_c_plus";
  }
  return null;
}

export function extractFundingAmount(content: string): { amount: string | null; currency: string | null } {
  const match = content.match(/([$€£])\s?(\d+(?:\.\d+)?)\s?([KMB])?/i);
  if (!match) return { amount: null, currency: null };
  const currency = match[1] === "$" ? "USD" : match[1] === "€" ? "EUR" : "GBP";
  const unit = (match[3] ?? "").toUpperCase();
  const amount = `${match[2]}${unit}`;
  return { amount, currency };
}

export function extractLeadInvestors(content: string): string[] {
  const leadMatch = content.match(/led by ([^.]+?)(?:,| with| alongside|\.|$)/i);
  if (!leadMatch) return [];
  return leadMatch[1]
    .split(/,| and /i)
    .map((part) => part.trim())
    .filter((part) => part.length >= 2)
    .slice(0, 3);
}

export function formatFundingRoundType(roundType: string | null | undefined): string | null {
  switch (roundType) {
    case "pre_seed":
      return "Pre-seed";
    case "seed":
      return "Seed";
    case "series_a":
      return "Series A";
    case "series_b":
      return "Series B";
    case "series_c_plus":
      return "Series C+";
    case "strategic_investment":
      return "Strategic investment";
    default:
      return roundType ? roundType.replace(/_/g, " ") : null;
  }
}
