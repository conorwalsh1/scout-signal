"use client";

import { useRouter } from "next/navigation";
import { ScoreBadge } from "./score-badge";
import { Button } from "./ui/button";
import { buildScoreExplanation, formatFundingRoundType, getSuggestedOutreachAngle, getWhyThisMatters } from "@/lib/signal-engine/explanations";
import { getCompanyBadgesForPlan, pickDisplayBadges } from "@/lib/badges";
import { getCompanySiteUrl } from "@/lib/company-web";
import { getProvenanceInfo, rankProvenanceSourceTypes } from "@/lib/provenance";
import { CompanyBadge } from "@/components/company-badge";
import { CompanyLogo } from "@/components/company-logo";
import type { Plan, ScoreComponents } from "@/types/database";

function IconBookmark({ className, filled }: { className?: string; filled?: boolean }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function IconExternalLink({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" x2="21" y1="14" y2="3" />
    </svg>
  );
}

function IconGlobe({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <circle cx="12" cy="12" r="10" />
      <line x1="2" x2="22" y1="12" y2="12" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  );
}

function IconArrowUp({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <path d="m18 15-6-6-6 6" />
    </svg>
  );
}

function IconArrowDown({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

/** Initials from company name (e.g. "Acme Corp" -> "AC", "Beta" -> "B"). */
function getInitials(name: string): string {
  const t = name.trim();
  if (!t) return "?";
  const words = t.split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    const a = words[0].charAt(0);
    const b = words[1].charAt(0);
    return (a + b).toUpperCase().slice(0, 2);
  }
  return t.slice(0, 2).toUpperCase();
}

/** Fallback avatar: glowing green circle with initials (radar-dot style). */
function InitialsAvatar({ name }: { name: string }) {
  const initials = getInitials(name);
  return (
    <div
      className="flex h-full w-full items-center justify-center rounded-lg font-semibold text-signal-green text-[10px] sm:text-xs uppercase tracking-tight"
      style={{
        background: "radial-gradient(ellipse 70% 70% at 50% 50%, rgba(34, 197, 94, 0.25), rgba(34, 197, 94, 0.08))",
        boxShadow: "0 0 12px 2px rgba(34, 197, 94, 0.2), inset 0 0 0 1px rgba(34, 197, 94, 0.15)",
      }}
    >
      {initials}
    </div>
  );
}

interface CompanyCardProps {
  id: string;
  name: string;
  domain: string | null;
  website: string | null;
  score: number;
  rankPosition?: number | null;
  previousRankPosition?: number | null;
  totalRankedCount?: number | null;
  score_components_json: ScoreComponents;
  last_calculated_at: string;
  isSaved: boolean;
  onSave: (companyId: string) => void;
  onUnsave: (companyId: string) => void;
  plan?: Plan;
  /** Use stacked layout to avoid overlap in narrow grids (e.g. spotlight). */
  compact?: boolean;
}

/** One-line "why this company" — core intelligence layer. */
function getSignalSummary(score_components_json: ScoreComponents): string {
  return getWhyThisMatters(score_components_json);
}

function getFundingSnapshot(scoreComponents: ScoreComponents): string | null {
  if (!scoreComponents.funding_event) return null;
  const round = typeof scoreComponents.funding_round_type === "string"
    ? formatFundingRoundType(scoreComponents.funding_round_type) ?? scoreComponents.funding_round_type
    : "Funding";
  const amount = typeof scoreComponents.funding_amount === "string" ? scoreComponents.funding_amount : null;
  const currency = typeof scoreComponents.funding_currency === "string" ? scoreComponents.funding_currency : null;
  const investors = Array.isArray(scoreComponents.funding_investors)
    ? scoreComponents.funding_investors.filter((value): value is string => typeof value === "string")
    : [];
  const amountLabel = amount ? `${currency ?? ""} ${amount}`.trim() : null;
  const investorLabel = investors.length > 0 ? ` · ${investors.slice(0, 2).join(", ")}` : "";
  return `${round}${amountLabel ? ` · ${amountLabel}` : ""}${investorLabel}`;
}

function getRankDisplayStyle(rankPosition: number | null, totalRankedCount: number | null) {
  if (!rankPosition || !totalRankedCount || totalRankedCount <= 1) {
    return {
      color: "#94A3B8",
      backgroundColor: "rgba(148, 163, 184, 0.12)",
      borderColor: "rgba(148, 163, 184, 0.25)",
    };
  }

  const progress = Math.min(1, Math.max(0, (rankPosition - 1) / (totalRankedCount - 1)));
  const hue = 120 - 120 * progress;
  const color = `hsl(${hue} 88% 58%)`;

  return {
    color,
    backgroundColor: `hsl(${hue} 88% 58% / 0.12)`,
    borderColor: `hsl(${hue} 88% 58% / 0.3)`,
  };
}

function getRankPercentileLabel(rankPosition: number | null, totalRankedCount: number | null): string | null {
  if (!rankPosition || !totalRankedCount || totalRankedCount <= 0) return null;
  const percentile = Math.max(1, Math.ceil((rankPosition / totalRankedCount) * 100));
  return `Top ${percentile}%`;
}

export function CompanyCard({
  id,
  name,
  domain,
  website,
  score,
  rankPosition = null,
  previousRankPosition = null,
  totalRankedCount = null,
  score_components_json,
  last_calculated_at,
  isSaved,
  onSave,
  onUnsave,
  plan = "free",
  compact = false,
}: CompanyCardProps) {
  const lines = buildScoreExplanation(score_components_json);
  const allBadgeIds = getCompanyBadgesForPlan(score_components_json, { score, plan });
  const badgeIds = pickDisplayBadges(allBadgeIds, 3);
  const extraBadgesCount = Math.max(0, allBadgeIds.length - badgeIds.length);
  const date = new Date(last_calculated_at);
  const siteUrl = getCompanySiteUrl({ website, domain });
  const timeAgo =
    date.getTime() > Date.now() - 24 * 60 * 60 * 1000
      ? "Today"
      : date.toLocaleDateString();
  const ft1000Line = lines.find((l) => l.includes("FT1000"));
  const confidence =
    typeof score_components_json.highest_signal_confidence === "string"
      ? score_components_json.highest_signal_confidence
      : null;
  const monitoredSourceTypes = Array.isArray(score_components_json.monitored_source_types)
    ? score_components_json.monitored_source_types.filter((v): v is string => typeof v === "string")
    : [];
  const rankedSourceTypes = rankProvenanceSourceTypes(monitoredSourceTypes);
  const directSources = rankedSourceTypes
    .map((t) => getProvenanceInfo(t))
    .filter((p): p is NonNullable<ReturnType<typeof getProvenanceInfo>> => !!p && p.kind === "direct")
    .map((p) => p.label);
  const inferredSources = rankedSourceTypes
    .map((t) => getProvenanceInfo(t))
    .filter((p): p is NonNullable<ReturnType<typeof getProvenanceInfo>> => !!p && p.kind === "inferred")
    .map((p) => p.label);
  const evidenceParts: string[] = [];
  if (directSources.length > 0) evidenceParts.push(`Evidence: ${directSources.slice(0, 3).join(", ")}`);
  else if (inferredSources.length > 0) evidenceParts.push(`Evidence: ${inferredSources.slice(0, 2).join(", ")}`);
  const recent7d = (score_components_json.recent_job_posts_7d as number) ?? 0;
  const previous7d = (score_components_json.previous_job_posts_7d as number) ?? 0;
  const trendLine =
    recent7d > 0 || previous7d > 0
      ? `${recent7d} roles in last 7d${previous7d > 0 ? ` vs ${previous7d} prior` : ""}`
      : null;
  const summary = getSignalSummary(score_components_json);
  const fundingSnapshot = getFundingSnapshot(score_components_json);
  const outreachAngle = getSuggestedOutreachAngle(score_components_json);
  const metadataParts = [
    ...evidenceParts,
    trendLine,
    confidence ? `${confidence} confidence` : null,
    ft1000Line,
    `Updated ${timeAgo.toLowerCase()}`,
  ].filter(Boolean);
  const rankMovement =
    rankPosition != null && previousRankPosition != null
      ? previousRankPosition - rankPosition
      : null;
  const movementLabel =
    rankMovement == null || rankMovement === 0
      ? null
      : `${Math.abs(rankMovement)} place${Math.abs(rankMovement) === 1 ? "" : "s"}`;
  const rankDisplayStyle = getRankDisplayStyle(rankPosition, totalRankedCount);
  const rankPercentileLabel = getRankPercentileLabel(rankPosition, totalRankedCount);
  const rankMovementToneClass =
    rankMovement == null || rankMovement === 0
      ? "text-secondary"
      : rankMovement > 0
        ? "text-signal-green"
        : "text-red-400";
  const rankBorderClass =
    rankMovement == null || rankMovement === 0
      ? "border-border"
      : rankMovement > 0
        ? "border-signal-green/35"
        : "border-red-400/30";
  const router = useRouter();

  if (compact) {
    return (
      <article
        role="button"
        tabIndex={0}
        onClick={() => router.push(`/companies/${id}`)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            router.push(`/companies/${id}`);
          }
        }}
        className="group flex cursor-pointer flex-col rounded-lg border border-border bg-card p-4 transition-all duration-200 hover:border-signal-green/50 hover:shadow-[0_6px_24px_rgba(0,0,0,0.25),0_0_0_1px_rgba(34,197,94,0.2)] hover:-translate-y-0.5"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-sidebar">
              <CompanyLogo name={name} website={website} domain={domain} className="h-full w-full object-contain" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="block truncate font-semibold text-foreground-heading">{name}</span>
              {siteUrl ? (
                <a
                  href={siteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="mt-0.5 inline-flex items-center gap-1 truncate text-xs text-secondary hover:underline"
                >
                  <span className="truncate">{domain ?? siteUrl}</span>
                  <IconExternalLink className="h-3 w-3 shrink-0" />
                </a>
              ) : (
                <span className="mt-0.5 inline-flex items-center gap-1 text-xs text-secondary">
                  <IconGlobe className="h-3 w-3" />
                  Profile being enriched
                </span>
              )}
            </div>
          </div>
          <div className="flex shrink-0 items-start gap-2" onClick={(e) => e.stopPropagation()}>
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                isSaved ? onUnsave(id) : onSave(id);
              }}
              className={
                isSaved
                  ? "h-8 px-2.5 text-xs bg-[rgba(34,197,94,0.10)] hover:bg-[rgba(34,197,94,0.14)] border-signal-green/30 text-foreground"
                  : "h-8 px-2.5 text-xs bg-card/30 hover:bg-card/50 text-foreground border-border"
              }
            >
              <span className="inline-flex items-center gap-1.5">
                <IconBookmark className={isSaved ? "h-4 w-4 text-signal-green" : "h-4 w-4"} filled={isSaved} />
                {isSaved ? "Saved" : "Save"}
              </span>
            </Button>
            {rankPosition != null ? (
              <div className={`min-w-[86px] rounded-md border bg-card/40 px-2.5 py-2 text-right ${rankBorderClass}`} style={rankDisplayStyle}>
                <div className="text-[10px] uppercase tracking-wide text-secondary">Rank</div>
                <div className="mt-0.5 font-mono text-sm font-semibold leading-none text-foreground">
                  #{rankPosition}{totalRankedCount ? <span className="opacity-70"> / {totalRankedCount}</span> : null}
                </div>
                <div className={`mt-1 inline-flex items-center justify-end gap-1 text-[10px] font-semibold ${rankMovementToneClass}`}>
                  {movementLabel && rankMovement != null ? (
                    <>
                      {rankMovement > 0 ? <IconArrowUp className="h-3 w-3" /> : <IconArrowDown className="h-3 w-3" />}
                      {movementLabel}
                    </>
                  ) : (
                    "No change"
                  )}
                  {rankPercentileLabel ? (
                    <span className="ml-1 font-medium text-secondary">{rankPercentileLabel}</span>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>
        </div>
        {fundingSnapshot ? (
          <>
            <p className="mt-2 text-[10px] font-semibold uppercase tracking-wide text-signal-green">Funding signal</p>
            <p className="mt-0.5 line-clamp-1 text-sm text-foreground">{fundingSnapshot}</p>
          </>
        ) : null}
        <p className="mt-2 text-[10px] font-semibold uppercase tracking-wide text-secondary">Why this matters</p>
        <p className="mt-0.5 line-clamp-1 text-sm text-foreground">{summary}</p>
        <p className="mt-1 line-clamp-1 text-xs text-secondary">{outreachAngle}</p>
        <p className="mt-1 text-xs text-secondary">{metadataParts.join(" · ")}</p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <ScoreBadge score={score} showMeter={false} />
          <div className="flex flex-wrap items-center gap-1">
            {badgeIds.map((bid) => (
              <CompanyBadge key={bid} badgeId={bid} />
            ))}
            {extraBadgesCount > 0 && (
              <span className="inline-flex items-center rounded-md border border-border bg-muted/60 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-secondary">
                +{extraBadgesCount}
              </span>
            )}
          </div>
        </div>
      </article>
    );
  }

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={() => router.push(`/companies/${id}`)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          router.push(`/companies/${id}`);
        }
      }}
      className="group cursor-pointer rounded-lg border border-border bg-card p-5 transition-all duration-200 hover:border-signal-green/50 hover:shadow-[0_6px_24px_rgba(0,0,0,0.25),0_0_0_1px_rgba(34,197,94,0.2)] hover:-translate-y-0.5"
    >
      <div className="flex items-start gap-4">
        {/* Left: identity */}
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-sidebar">
            <CompanyLogo name={name} website={website} domain={domain} className="h-full w-full object-contain" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="font-semibold text-foreground-heading">{name}</span>
            {siteUrl ? (
              <a
                href={siteUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="mt-0.5 inline-flex items-center gap-1 text-xs text-secondary hover:underline"
              >
                {domain ?? siteUrl}
                <IconExternalLink className="h-3 w-3" />
              </a>
            ) : (
              <span className="mt-0.5 inline-flex items-center gap-1 text-xs text-secondary">
                <IconGlobe className="h-3 w-3" />
                Profile being enriched
              </span>
            )}
            <div className="mt-2">
              <ScoreBadge score={score} />
            </div>
          </div>
        </div>

        {/* Middle: why this matters + insight (scan-first) */}
        <div className="hidden min-w-0 flex-[1.2] flex-col gap-1 sm:flex">
          {fundingSnapshot ? (
            <>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-signal-green">Funding signal</p>
              <p className="text-sm font-medium text-foreground line-clamp-1">{fundingSnapshot}</p>
            </>
          ) : null}
          <p className="text-[11px] font-semibold uppercase tracking-wide text-secondary">Why this matters</p>
          <p className="text-sm font-medium text-foreground line-clamp-1">{summary}</p>
          <p className="text-xs text-secondary line-clamp-1">{outreachAngle}</p>
          <p className="text-xs text-secondary">
            {metadataParts.join(" · ")}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-1">
            {badgeIds.map((bid) => (
              <CompanyBadge key={bid} badgeId={bid} />
            ))}
            {extraBadgesCount > 0 && (
              <span className="inline-flex items-center rounded-md border border-border bg-muted/60 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-secondary">
                +{extraBadgesCount}
              </span>
            )}
          </div>
        </div>

        {/* Right: compact rank + clear actions */}
        <div className="ml-auto flex shrink-0 items-start gap-3" onClick={(e) => e.stopPropagation()}>
          <div className="flex flex-col gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => (isSaved ? onUnsave(id) : onSave(id))}
              className={
                isSaved
                  ? "h-9 px-3 bg-[rgba(34,197,94,0.10)] hover:bg-[rgba(34,197,94,0.14)] border-signal-green/30 text-foreground"
                  : "h-9 px-3 bg-card/30 hover:bg-card/50 text-foreground border-border"
              }
            >
              <span className="inline-flex items-center gap-2">
                <IconBookmark className={isSaved ? "h-4 w-4 text-signal-green" : "h-4 w-4"} filled={isSaved} />
                {isSaved ? "Saved" : "Save"}
              </span>
            </Button>
            {rankPosition != null ? (
              <div className={`min-w-[86px] rounded-md border bg-card/40 px-2.5 py-2 text-right text-xs ${rankBorderClass}`} style={rankDisplayStyle}>
                <div className="text-[10px] font-semibold uppercase tracking-wide opacity-80">Rank</div>
                <div className="mt-0.5 font-mono text-sm font-semibold leading-none text-foreground">
                  #{rankPosition}{totalRankedCount ? <span className="text-xs font-medium opacity-70"> / {totalRankedCount}</span> : null}
                </div>
                <div className={`mt-1 inline-flex items-center justify-end gap-1 text-[10px] font-semibold ${rankMovementToneClass}`}>
                  {movementLabel && rankMovement != null ? (
                    <>
                      {rankMovement > 0 ? <IconArrowUp className="h-3 w-3" /> : <IconArrowDown className="h-3 w-3" />}
                      {movementLabel}
                    </>
                  ) : (
                    "No change"
                  )}
                  {rankPercentileLabel ? (
                    <span className="ml-1 font-medium text-secondary">{rankPercentileLabel}</span>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* Mobile: why this matters + summary below */}
      <div className="mt-3 flex flex-col gap-1 sm:hidden">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-secondary">Why this matters</p>
        <p className="text-sm text-foreground line-clamp-1">{summary}</p>
        <p className="text-xs text-secondary line-clamp-1">{outreachAngle}</p>
        <p className="text-xs text-secondary">{metadataParts.join(" · ")}</p>
        <div className="mt-1 flex flex-wrap items-center gap-1">
          {badgeIds.map((bid) => (
            <CompanyBadge key={bid} badgeId={bid} />
          ))}
          {extraBadgesCount > 0 && (
            <span className="inline-flex items-center rounded-md border border-border bg-muted/60 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-secondary">
              +{extraBadgesCount}
            </span>
          )}
        </div>
      </div>
    </article>
  );
}
