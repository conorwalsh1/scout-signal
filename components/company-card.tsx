"use client";

import { useRouter } from "next/navigation";
import { ScoreBadge } from "./score-badge";
import { Button } from "./ui/button";
import { buildScoreExplanation, getWhyThisMatters } from "@/lib/signal-engine/explanations";
import { getCompanyBadges } from "@/lib/badges";
import { getCompanySiteUrl } from "@/lib/company-web";
import { CompanyBadge } from "@/components/company-badge";
import { CompanyLogo } from "@/components/company-logo";
import type { ScoreComponents } from "@/types/database";

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
  /** Use stacked layout to avoid overlap in narrow grids (e.g. spotlight). */
  compact?: boolean;
}

/** One-line "why this company" — core intelligence layer. */
function getSignalSummary(score_components_json: ScoreComponents): string {
  return getWhyThisMatters(score_components_json);
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
  compact = false,
}: CompanyCardProps) {
  const lines = buildScoreExplanation(score_components_json);
  const badgeIds = getCompanyBadges(score_components_json, { score });
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
  const recent7d = (score_components_json.recent_job_posts_7d as number) ?? 0;
  const previous7d = (score_components_json.previous_job_posts_7d as number) ?? 0;
  const trendLine =
    recent7d > 0 || previous7d > 0
      ? `${recent7d} roles in last 7d${previous7d > 0 ? ` vs ${previous7d} prior` : ""}`
      : null;
  const summary = getSignalSummary(score_components_json);
  const metadataParts = [
    ft1000Line,
    trendLine,
    confidence ? `${confidence} confidence` : null,
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
          <div className="flex shrink-0 items-center gap-2" onClick={(e) => e.stopPropagation()}>
            {rankPosition != null ? (
              <div
                className="flex flex-col items-end rounded-lg border px-2 py-1.5 text-right"
                style={rankDisplayStyle}
              >
                <span className="font-mono text-xl font-bold leading-none">#{rankPosition}</span>
                {movementLabel && rankMovement != null ? (
                  <span
                    className={`mt-1 inline-flex items-center gap-1 text-[10px] font-semibold ${
                      rankMovement > 0 ? "text-signal-green" : "text-red-400"
                    }`}
                  >
                    {rankMovement > 0 ? <IconArrowUp className="h-3 w-3" /> : <IconArrowDown className="h-3 w-3" />}
                    {movementLabel}
                  </span>
                ) : null}
                {totalRankedCount && (
                  <span className="text-[10px] opacity-80">of {totalRankedCount}</span>
                )}
              </div>
            ) : null}
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                isSaved ? onUnsave(id) : onSave(id);
              }}
              aria-label={isSaved ? "Remove from saved" : "Save company"}
              className="h-8 w-8 text-secondary hover:text-foreground"
            >
              {isSaved ? (
                <IconBookmark className="h-4 w-4 text-signal-green" filled />
              ) : (
                <IconBookmark className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
        <p className="mt-2 text-[10px] font-semibold uppercase tracking-wide text-secondary">Why this matters</p>
        <p className="mt-0.5 line-clamp-2 text-sm text-foreground">{summary}</p>
        <p className="mt-1 text-xs text-secondary">{metadataParts.join(" · ")}</p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <ScoreBadge score={score} showMeter={false} />
          <div className="flex flex-wrap gap-1">
            {badgeIds.map((bid) => (
              <CompanyBadge key={bid} badgeId={bid} />
            ))}
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
        {/* Left: icon (favicon or initials fallback), name, badge */}
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

        {/* Middle: why this matters + insight */}
        <div className="hidden min-w-0 flex-[1.2] flex-col gap-1 sm:flex">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-secondary">Why this matters</p>
          <p className="text-sm font-medium text-foreground">{summary}</p>
          <p className="text-xs text-secondary">
            {metadataParts.join(" · ")}
          </p>
          <div className="mt-1 flex flex-wrap gap-1">
            {badgeIds.map((bid) => (
              <CompanyBadge key={bid} badgeId={bid} />
            ))}
          </div>
        </div>

        {/* Right: leaderboard rank + actions */}
        <div className="ml-auto flex shrink-0 items-start gap-3">
          {rankPosition != null ? (
            <div
              className="flex min-w-[6.5rem] flex-col items-end rounded-xl border px-3 py-2 text-right"
              style={rankDisplayStyle}
            >
              <span className="text-[10px] font-semibold uppercase tracking-[0.22em] opacity-80">
                Rank
              </span>
              <span className="font-mono text-3xl font-bold leading-none sm:text-4xl">
                #{rankPosition}
              </span>
              {movementLabel && rankMovement != null ? (
                <span
                  className={
                    rankMovement > 0
                      ? "mt-2 inline-flex items-center gap-1 rounded-full bg-[rgba(34,197,94,0.12)] px-2 py-1 text-[11px] font-semibold text-signal-green"
                      : "mt-2 inline-flex items-center gap-1 rounded-full bg-[rgba(239,68,68,0.12)] px-2 py-1 text-[11px] font-semibold text-red-400"
                  }
                >
                  {rankMovement > 0 ? (
                    <IconArrowUp className="h-3 w-3" />
                  ) : (
                    <IconArrowDown className="h-3 w-3" />
                  )}
                  {movementLabel}
                </span>
              ) : (
                <span className="mt-2 text-[11px] font-medium opacity-70">
                  {totalRankedCount ? `of ${totalRankedCount}` : "new"}
                </span>
              )}
            </div>
          ) : null}
          <div className="flex shrink-0 items-center" onClick={(e) => e.stopPropagation()}>
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                isSaved ? onUnsave(id) : onSave(id);
              }}
              aria-label={isSaved ? "Remove from saved" : "Save company"}
              className="text-secondary hover:text-foreground"
            >
              {isSaved ? (
                <IconBookmark className="h-4 w-4 text-signal-green" filled />
              ) : (
                <IconBookmark className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile: why this matters + summary below */}
      <div className="mt-3 flex flex-col gap-1 sm:hidden">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-secondary">Why this matters</p>
        <p className="text-sm text-foreground">{summary}</p>
        <p className="text-xs text-secondary">{metadataParts.join(" · ")}</p>
        <div className="mt-1 flex flex-wrap gap-1">
          {badgeIds.map((bid) => (
            <CompanyBadge key={bid} badgeId={bid} />
          ))}
        </div>
      </div>
    </article>
  );
}
