/**
 * Company badges: product-level labels derived from signals and score components.
 * Used on company cards, company pages, and in filters.
 */
import type { ScoreComponents } from "@/types/database";

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

export const BADGE_STYLES: Record<BadgeId, string> = {
  // Hiring Surge – bright, kinetic emerald pill
  hiring_surge: "bg-gradient-to-r from-emerald-500/20 via-emerald-400/15 to-emerald-500/25 text-emerald-100 border border-emerald-400 shadow-[0_0_18px_rgba(16,185,129,0.45)]",

  // Engineering Buildout – cool technical blue
  engineering_buildout:
    "bg-gradient-to-r from-sky-500/20 via-sky-400/15 to-sky-500/25 text-sky-100 border border-sky-400 shadow-[0_0_18px_rgba(56,189,248,0.45)]",

  // Venture Backed – gold accent with subtle shine
  venture_backed:
    "bg-gradient-to-r from-amber-500/22 via-amber-400/16 to-amber-500/26 text-amber-50 border border-amber-300 shadow-[0_0_18px_rgba(245,158,11,0.5)]",

  // FT1000 – institutional slate
  ft1000: "bg-slate-800/90 text-slate-200 border border-slate-400/80 shadow-[0_0_14px_rgba(148,163,184,0.45)]",

  // AI Hiring – neon violet glass
  ai_hiring:
    "bg-gradient-to-r from-fuchsia-500/24 via-purple-500/18 to-fuchsia-500/28 text-fuchsia-100 border border-fuchsia-300 shadow-[0_0_22px_rgba(192,38,211,0.7)]",

  // Leadership Hire – premium glassmorphism highlight
  leadership_hire:
    "bg-gradient-to-r from-pink-500/24 via-rose-500/18 to-pink-500/26 text-pink-50 border border-pink-300/90 shadow-[0_0_26px_rgba(244,114,182,0.85)] backdrop-blur-sm",

  // Expansion Mode – soft growth band
  expansion_mode:
    "bg-gradient-to-r from-lime-400/20 via-emerald-400/14 to-lime-400/24 text-lime-100 border border-lime-300/80 shadow-[0_0_18px_rgba(163,230,53,0.55)]",

  // Hypergrowth – strongest emerald treatment
  hypergrowth:
    "bg-gradient-to-r from-emerald-500/30 via-emerald-400/24 to-emerald-500/36 text-emerald-50 border border-emerald-400 ring-1 ring-emerald-300 shadow-[0_0_26px_rgba(16,185,129,0.9)]",
};
