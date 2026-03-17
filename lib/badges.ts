/**
 * Company badges: product-level labels derived from signals and score components.
 * Used on company cards, company pages, and in filters.
 */
import type { ScoreComponents } from "@/types/database";
import type { Plan } from "@/types/database";

export const BADGES = [
  { id: "hiring_surge", label: "Hiring Surge" },
  { id: "engineering_buildout", label: "Engineering Buildout" },
  { id: "venture_backed", label: "Venture Backed" },
  { id: "ft1000", label: "FT1000" },
  { id: "ai_hiring", label: "AI Hiring" },
  { id: "leadership_hire", label: "Leadership Hire" },
  { id: "expansion_mode", label: "Expansion Mode" },
  { id: "hypergrowth", label: "Hypergrowth" },
] as const;

export type BadgeId = (typeof BADGES)[number]["id"];

export const PRO_ONLY_BADGES: readonly BadgeId[] = ["leadership_hire", "hypergrowth"] as const;

// Display priority for badge chips (highest signal value first).
// Keep the premium insight (leadership) near the top.
const BADGE_DISPLAY_PRIORITY: readonly BadgeId[] = [
  "hiring_surge",
  "ai_hiring",
  "leadership_hire",
  "engineering_buildout",
  "venture_backed",
  "expansion_mode",
  "ft1000",
  "hypergrowth",
] as const;

export function pickDisplayBadges(badges: BadgeId[], max = 3): BadgeId[] {
  const unique = Array.from(new Set(badges));
  const order = new Map<BadgeId, number>(BADGE_DISPLAY_PRIORITY.map((b, i) => [b, i]));
  unique.sort((a, b) => (order.get(a) ?? 999) - (order.get(b) ?? 999));
  return unique.slice(0, Math.max(0, max));
}

/** Derive which badges a company has from score components and optional score. */
export function getCompanyBadges(
  scoreComponents: ScoreComponents,
  options?: { score?: number }
): BadgeId[] {
  const c = scoreComponents;
  const jobs = (c.job_posts ?? 0) > 0;
  const engineeringHiring = !!c.engineering_hiring || (c.engineering_job_posts ?? 0) > 0;
  const aiHiring = !!c.ai_hiring || (c.ai_job_posts ?? 0) > 0;
  const remoteHiring = !!c.remote_hiring || (c.remote_job_posts ?? 0) > 0;
  const newDepartmentHiring = !!c.new_department_hiring;
  const leadershipHiring = !!c.leadership_hiring || (c.leadership_job_posts ?? 0) > 0;
  const hiringSpike = !!c.hiring_spike;
  const funding = !!c.funding_event;
  const ft1000 = !!c.ft1000_listed;
  const score = options?.score ?? 0;

  const badges: BadgeId[] = [];
  if (hiringSpike) badges.push("hiring_surge");
  if (engineeringHiring) badges.push("engineering_buildout");
  if (funding) badges.push("venture_backed");
  if (ft1000) badges.push("ft1000");
  if (aiHiring) badges.push("ai_hiring");
  // Leadership Hire: no signal yet; placeholder when we have funding or high score
  if (leadershipHiring) badges.push("leadership_hire");
  if (hiringSpike || jobs || remoteHiring || newDepartmentHiring) badges.push("expansion_mode");
  if (score >= 70 && (hiringSpike || funding || jobs || aiHiring || engineeringHiring)) badges.push("hypergrowth");

  return Array.from(new Set(badges));
}

export function filterBadgesForPlan(badges: BadgeId[], plan: Plan | null | undefined): BadgeId[] {
  if (plan === "pro") return badges;
  return badges.filter((b) => !PRO_ONLY_BADGES.includes(b));
}

export function getCompanyBadgesForPlan(
  scoreComponents: ScoreComponents,
  options: { score?: number; plan: Plan | null | undefined }
): BadgeId[] {
  return filterBadgesForPlan(getCompanyBadges(scoreComponents, { score: options.score }), options.plan);
}

export const BADGE_STYLES: Record<BadgeId, string> = {
  // Hiring Surge – bright, kinetic emerald pill
  hiring_surge: "bg-gradient-to-r from-emerald-500/18 via-emerald-400/12 to-emerald-500/20 text-emerald-100 border border-emerald-400/80",

  // Engineering Buildout – cool technical blue
  engineering_buildout:
    "bg-gradient-to-r from-sky-500/18 via-sky-400/12 to-sky-500/20 text-sky-100 border border-sky-400/80",

  // Venture Backed – gold accent with subtle shine
  venture_backed:
    "bg-gradient-to-r from-amber-500/18 via-amber-400/12 to-amber-500/20 text-amber-50 border border-amber-300/80",

  // FT1000 – institutional slate
  ft1000: "bg-slate-800/90 text-slate-200 border border-slate-400/70",

  // AI Hiring – neon violet glass
  ai_hiring:
    "bg-gradient-to-r from-fuchsia-500/18 via-purple-500/12 to-fuchsia-500/20 text-fuchsia-100 border border-fuchsia-300/80",

  // Leadership Hire – premium glassmorphism highlight
  leadership_hire:
    "bg-slate-900/70 text-amber-50 border border-amber-400/70",

  // Expansion Mode – soft growth band
  expansion_mode:
    "bg-gradient-to-r from-lime-400/16 via-emerald-400/10 to-lime-400/18 text-lime-100 border border-lime-300/75",

  // Hypergrowth – strongest emerald treatment
  hypergrowth:
    "bg-gradient-to-r from-emerald-500/22 via-emerald-400/16 to-emerald-500/24 text-emerald-50 border border-emerald-400/85 ring-1 ring-emerald-300/35",
};
