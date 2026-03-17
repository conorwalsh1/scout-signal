import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getCompanyById,
  getCompanySignals,
  getCompanyEvents,
  getCompanyJobPostEventsLast30Days,
  getCompanyRankContext,
  isCompanySaved,
  isAdminUser,
  getSavedCompaniesCount,
} from "../actions";
import { CompanyPageHeader } from "./company-page-header";
import { DashboardCard } from "@/components/company-detail/dashboard-card";
import { HiringActivityChart, type HiringActivityPoint } from "@/components/company-detail/hiring-activity-chart";
import {
  buildScoreExplanation,
  getWhyThisMatters,
  getScoreBreakdown,
  getSuggestedOutreachTiming,
} from "@/lib/signal-engine/explanations";
import { BADGES, getCompanyBadgesForPlan } from "@/lib/badges";
import { CompanyBadge } from "@/components/company-badge";
import { formatDaysAgo, getProvenanceInfo, rankProvenanceSourceTypes } from "@/lib/provenance";
import type { Plan, ScoreComponents } from "@/types/database";
import { createClient } from "@/lib/supabase/server";

function scoreCategory(score: number): "LOW" | "MEDIUM" | "HIGH" {
  const outOf10 = score / 10;
  if (outOf10 >= 8) return "HIGH";
  if (outOf10 >= 5) return "MEDIUM";
  return "LOW";
}

function scoreCategoryColor(score: number): string {
  const outOf10 = score / 10;
  if (outOf10 >= 8) return "text-signal-green";
  if (outOf10 >= 5) return "text-data-blue";
  return "text-secondary";
}

export default async function CompanyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = user
    ? await supabase.from("users").select("plan").eq("id", user.id).single()
    : { data: null };
  const plan = (profile?.plan ?? "free") as Plan;
  const [company, signals, events, jobPostEvents30d, rankContext, saved, isAdmin, savedCount] = await Promise.all([
    getCompanyById(id),
    getCompanySignals(id),
    getCompanyEvents(id),
    getCompanyJobPostEventsLast30Days(id),
    getCompanyRankContext(id),
    isCompanySaved(id),
    isAdminUser(),
    getSavedCompaniesCount(),
  ]);

  if (!company) notFound();

  const comp = company.score_components_json as ScoreComponents;
  const lines = buildScoreExplanation(comp);
  const whyThisMatters = getWhyThisMatters(comp);
  const scoreBreakdown = getScoreBreakdown(comp, company.score);
  const companyBadgeIds = getCompanyBadgesForPlan(comp, { score: company.score, plan });
  const outreachTiming = getSuggestedOutreachTiming({ scoreComponents: comp, signals, events });
  const scoreOutOf10 = (company.score / 10).toFixed(1);
  const category = scoreCategory(company.score);
  const ft1000Source = company.company_sources?.find((s) => s.source_type === "ft1000");
  const ftMeta = (ft1000Source?.metadata_json ?? {}) as Record<string, unknown>;
  const ftRank = typeof ftMeta.rank === "number" ? ftMeta.rank : null;
  const ftHeadquarters = typeof ftMeta.headquarters === "string" ? ftMeta.headquarters : null;
  const ftCategory = typeof ftMeta.category === "string" ? ftMeta.category : null;
  const compSize = typeof ftMeta.employees === "string" ? ftMeta.employees : typeof ftMeta.company_size === "string" ? ftMeta.company_size : null;
  const hasFundingSignal =
    !!company.score_components_json?.funding_event || signals.some((s) => s.signal_type === "funding_event");
  const newsSourceLabel =
    !ftRank && !compSize && !ftCategory && !ftHeadquarters && hasFundingSignal
      ? "Source: Funding news"
      : null;

  const monitoredSourceTypes = Array.isArray(company.score_components_json?.monitored_source_types)
    ? company.score_components_json.monitored_source_types.filter((value): value is string => typeof value === "string")
    : [];
  const highestSignalConfidence =
    typeof company.score_components_json?.highest_signal_confidence === "string"
      ? company.score_components_json.highest_signal_confidence
      : null;
  const newDepartmentNames = Array.isArray(company.score_components_json?.new_department_names)
    ? company.score_components_json.new_department_names.filter((value): value is string => typeof value === "string")
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

  // Timeline: merge signals and events by date, sort descending
  type TimelineEntry = {
    date: string;
    label: string;
    key: string;
    ts: number;
    provenanceLabel: string | null;
    provenanceKind: "direct" | "inferred" | "context" | null;
    confidence?: string | null;
    sourceUrl?: string | null;
  };
  const timelineEntries: TimelineEntry[] = [];
  signals.forEach((s) => {
    const d = new Date(s.occurred_at);
    const dateStr = d.toLocaleDateString("en-GB", { day: "numeric", month: "long" });
    let label = s.signal_type.replace(/_/g, " ");
    if (s.signal_type === "job_post") label = "Job posts detected";
    if (s.signal_type === "hiring_spike") label = "Hiring surge detected";
    if (s.signal_type === "engineering_hiring") label = "Engineering hiring detected";
    if (s.signal_type === "ai_hiring") label = "AI hiring detected";
    if (s.signal_type === "remote_hiring") label = "Remote hiring detected";
    if (s.signal_type === "new_department_hiring") label = "New department hiring detected";
    if (s.signal_type === "leadership_hiring") label = "Leadership hiring detected";
    if (s.signal_type === "funding_event") label = "Funding event detected";
    const sourceType = (s as any)?.events?.source_type as string | undefined;
    const sourceUrl = (s as any)?.events?.source_url as string | undefined;
    const prov = getProvenanceInfo(sourceType);
    timelineEntries.push({
      date: dateStr,
      label,
      key: `s-${s.id}`,
      ts: d.getTime(),
      provenanceLabel: prov?.label ?? null,
      provenanceKind: prov?.kind ?? null,
      confidence: (s as any)?.confidence ?? null,
      sourceUrl: sourceUrl ?? null,
    });
  });
  events.forEach((e) => {
    const d = new Date(e.detected_at);
    const dateStr = d.toLocaleDateString("en-GB", { day: "numeric", month: "long" });
    const meta = (e.metadata_json ?? {}) as Record<string, unknown>;
    const title = typeof meta.title === "string" ? meta.title : null;
    const jobCount = typeof meta.job_count === "number" ? meta.job_count : null;
    const prov = getProvenanceInfo((e as any).source_type);
    timelineEntries.push({
      date: dateStr,
      label:
        e.event_type === "funding_event"
          ? title ?? "Funding event detected"
          : e.event_type === "job_post_detected"
            ? jobCount != null
              ? `${jobCount} role${jobCount === 1 ? "" : "s"} posted`
              : title ?? "Job posts detected"
            : title ?? e.event_type.replace(/_/g, " "),
      key: `e-${e.id}`,
      ts: d.getTime(),
      provenanceLabel: prov?.label ?? null,
      provenanceKind: prov?.kind ?? null,
      sourceUrl: (e as any).source_url ?? null,
    });
  });
  timelineEntries.sort((a, b) => b.ts - a.ts);
  const timelineByDate: TimelineEntry[] = timelineEntries.length
    ? timelineEntries.slice(0, 4)
    : [
        {
          date: "Today",
          label: "No signals detected",
          key: "empty",
          ts: 0,
          provenanceLabel: null,
          provenanceKind: null,
          confidence: null,
          sourceUrl: null,
        },
      ];

  const jobPosts = (company.score_components_json?.job_posts as number) ?? 0;
  const engineeringJobs = (company.score_components_json?.engineering_job_posts as number) ?? 0;
  const aiJobs = (company.score_components_json?.ai_job_posts as number) ?? 0;
  const remoteJobs = (company.score_components_json?.remote_job_posts as number) ?? 0;
  const leadershipJobs = (company.score_components_json?.leadership_job_posts as number) ?? 0;
  const recentJobPosts7d = (company.score_components_json?.recent_job_posts_7d as number) ?? 0;
  const previousJobPosts7d = (company.score_components_json?.previous_job_posts_7d as number) ?? 0;
  const hiringVelocityDelta = (company.score_components_json?.hiring_velocity_delta as number) ?? 0;
  const fundingRoundType =
    typeof company.score_components_json?.funding_round_type === "string"
      ? company.score_components_json.funding_round_type
      : null;
  const fundingAmount =
    typeof company.score_components_json?.funding_amount === "string"
      ? company.score_components_json.funding_amount
      : null;
  const fundingCurrency =
    typeof company.score_components_json?.funding_currency === "string"
      ? company.score_components_json.funding_currency
      : null;
  // Hiring velocity sparkline: aggregate job-post events by day (last 30 days).
  const hiringPoints: HiringActivityPoint[] = (() => {
    const counts = new Map<string, number>();
    for (const e of jobPostEvents30d ?? []) {
      const d = new Date(e.detected_at);
      const key = d.toISOString().slice(0, 10);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    const entries = Array.from(counts.entries())
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .slice(-10);
    return entries.map(([date, count]) => {
      const d = new Date(date);
      const label = d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
      return { label, count };
    });
  })();

  const primaryBadgeLabel =
    companyBadgeIds.length > 0
      ? BADGES.find((b) => b.id === companyBadgeIds[0])?.label ?? null
      : null;
  const latestEntry = timelineEntries[0] ?? null;
  const latestWhen = latestEntry ? formatDaysAgo(new Date(latestEntry.ts).toISOString()) : null;
  const latestWhere = latestEntry?.provenanceLabel ? `from ${latestEntry.provenanceLabel}` : null;
  const whatChanged = primaryBadgeLabel ?? latestEntry?.label ?? "New signals detected";
  const signalStory = [
    `${whatChanged}`,
    latestWhen ? `(${latestWhen})` : null,
    latestWhere,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Link href="/dashboard" className="text-sm text-secondary hover:underline">
          ← Back to dashboard
        </Link>
      </div>

      <CompanyPageHeader
        company={{
          id: company.id,
          name: company.name,
          domain: company.domain,
          website: company.website,
          score: company.score,
          last_calculated_at: company.last_calculated_at,
          company_web_sources: company.company_web_sources,
        }}
        isSaved={saved}
        isAdmin={isAdmin}
      />

      {/* Signal story – one-line analyst-style briefing */}
      <div className="rounded-md border border-border bg-card/80 px-4 py-2 text-sm text-secondary">
        <div className="flex flex-col gap-1">
          <div className="text-secondary">
            <span className="font-medium text-foreground">{signalStory}</span>
          </div>
          <div className="text-[11px] text-secondary">
            {directSources.length > 0 ? (
              <span>
                Direct evidence: <span className="text-foreground">{directSources.join(", ")}</span>
              </span>
            ) : inferredSources.length > 0 ? (
              <span>
                Evidence (inferred): <span className="text-foreground">{inferredSources.join(", ")}</span>
              </span>
            ) : (
              <span>Evidence: —</span>
            )}
          </div>
        </div>
      </div>

      {/* Primary row – keep essentials tight in a single band */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
        <div className="md:col-span-4">
          <DashboardCard
            title="Signal Score"
            className={
              category === "HIGH"
                ? "bg-[rgba(34,197,94,0.14)] border-signal-green/50"
                : category === "MEDIUM"
                  ? "bg-[rgba(56,189,248,0.12)] border-data-blue/50"
                  : ""
            }
          >
            <div className="space-y-3">
              <p className="text-4xl font-bold font-mono text-foreground-heading">
                {scoreOutOf10} <span className="text-base font-normal text-secondary">/ 10</span>
              </p>
              <p className={`text-sm font-semibold uppercase tracking-wide ${scoreCategoryColor(company.score)}`}>
                {category} SIGNAL
              </p>
              {rankContext.rank != null && rankContext.totalRanked > 0 && (
                <p className="text-xs text-secondary">
                  Rank: <span className="font-mono font-semibold text-foreground-heading">#{rankContext.rank}</span>{" "}
                  of {rankContext.totalRanked.toLocaleString()} companies monitored
                </p>
              )}
              {scoreBreakdown.length > 0 && (
                <div className="border-t border-border pt-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-secondary mb-1">Score components</p>
                  <ul className="space-y-1 text-sm">
                    {scoreBreakdown.slice(0, 3).map((row) => (
                      <li key={row.key} className="flex justify-between gap-2">
                        <span className="text-foreground">{row.label}</span>
                        <span className="font-mono font-medium text-signal-green/90">+{row.points.toFixed(1)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="border-t border-border pt-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-secondary mb-1">
                  Recent signals
                </p>
                <ul className="space-y-1 text-xs text-foreground">
                  {timelineByDate.slice(0, 3).map((entry) => (
                    <li key={entry.key} className="flex gap-2">
                      <span className="shrink-0 text-secondary w-16">{entry.date}</span>
                      <span className="flex-1">
                        {entry.sourceUrl ? (
                          <a
                            href={entry.sourceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="underline decoration-dotted underline-offset-2 hover:decoration-solid"
                          >
                            {entry.label}
                          </a>
                        ) : (
                          entry.label
                        )}
                        {(entry.provenanceLabel || entry.confidence) && (
                          <span className="ml-2 text-[10px] text-secondary">
                            {entry.provenanceLabel ? `· ${entry.provenanceLabel}` : ""}
                            {entry.confidence ? ` · ${entry.confidence} confidence` : ""}
                          </span>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </DashboardCard>
        </div>
        <div className="md:col-span-4">
          <DashboardCard title="Why this matters">
            <p className="text-sm font-medium text-foreground">
              {whyThisMatters}
            </p>
            <p className="mt-2 text-xs text-secondary">
              Early hiring moves often precede product launches, market expansion, or new strategic initiatives.
            </p>
            {companyBadgeIds.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {companyBadgeIds.slice(0, 4).map((bid) => (
                  <CompanyBadge key={bid} badgeId={bid} />
                ))}
              </div>
            )}
            {lines.length > 0 && !(lines.length === 1 && lines[0] === "No recent signals") && (
              <>
                <p className="mt-3 text-[11px] font-semibold uppercase tracking-wide text-secondary">Key signals</p>
                <ul className="mt-1 list-disc list-inside space-y-1 text-sm text-foreground">
                  {lines.slice(0, 3).map((line, i) => (
                    <li key={i}>{line}</li>
                  ))}
                </ul>
              </>
            )}
            {hiringPoints.length > 0 && (
              <div className="mt-4 border-t border-border pt-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-secondary mb-1">
                  Hiring velocity (last 30 days)
                </p>
                <HiringActivityChart points={hiringPoints} variant="sparkline" />
              </div>
            )}
            <div className="mt-4 border-t border-border pt-3 text-xs text-secondary">
              <p className="font-semibold text-[11px] uppercase tracking-wide mb-1">Confidence</p>
              <p>
                Signals detected from monitored career pages and job boards. Confidence increases as more sources confirm the trend.
              </p>
            </div>
          </DashboardCard>
        </div>
        <div className="md:col-span-4">
          <DashboardCard title="Company overview">
            <dl className="space-y-3 text-sm">
              {ftRank != null && (
                <div>
                  <dt className="text-secondary">FT1000 Rank</dt>
                  <dd className="text-foreground font-medium">#{ftRank}</dd>
                </div>
              )}
              {ftCategory && (
                <div>
                  <dt className="text-secondary">Industry</dt>
                  <dd className="text-foreground font-medium">{ftCategory}</dd>
                </div>
              )}
              {ftHeadquarters && (
                <div>
                  <dt className="text-secondary">Location</dt>
                  <dd className="text-foreground font-medium">{ftHeadquarters}</dd>
                </div>
              )}
              {company.website && (
                <div>
                  <dt className="text-secondary">Website</dt>
                  <dd className="text-foreground font-medium break-all">
                    <a href={company.website} target="_blank" rel="noopener noreferrer" className="text-data-blue hover:underline">
                      {company.website}
                    </a>
                  </dd>
                </div>
              )}
              {company.domain && (
                <div>
                  <dt className="text-secondary">Domain</dt>
                  <dd className="text-foreground font-mono text-xs">{company.domain}</dd>
                </div>
              )}
              {fundingRoundType && (
                <div>
                  <dt className="text-secondary">Funding</dt>
                  <dd className="text-foreground font-medium">
                    {fundingRoundType.replace(/_/g, " ")}
                    {fundingAmount ? ` · ${fundingCurrency ?? ""} ${fundingAmount}`.trim() : ""}
                  </dd>
                </div>
              )}
              <div>
                <dt className="text-secondary">Suggested outreach timing</dt>
                <dd className="text-foreground font-medium">{outreachTiming.window}</dd>
                <dd className="mt-1 text-xs text-secondary">
                  Based on {outreachTiming.basedOn.toLowerCase()}: {outreachTiming.rationale}
                </dd>
              </div>
              {monitoredSourceTypes.length > 0 && (
                <div>
                  <dt className="text-secondary">Signal sources</dt>
                  <dd className="text-foreground font-medium">{monitoredSourceTypes.join(", ")}</dd>
                </div>
              )}
              {highestSignalConfidence && (
                <div>
                  <dt className="text-secondary">Signal confidence</dt>
                  <dd className="text-foreground font-medium">{highestSignalConfidence}</dd>
                </div>
              )}
            </dl>
            <div className="mt-4 border-t border-border pt-3">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-secondary">
                Hiring activity (last 30 days)
              </p>
              <HiringActivityChart points={hiringPoints} />
              <dl className="mt-3 space-y-2 text-xs text-secondary">
                <div className="flex items-center justify-between gap-3">
                  <dt>Engineering roles</dt>
                  <dd className="font-mono text-foreground-heading">{engineeringJobs}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt>AI roles</dt>
                  <dd className="font-mono text-foreground-heading">{aiJobs}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt>Remote roles</dt>
                  <dd className="font-mono text-foreground-heading">{remoteJobs}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt>Leadership roles</dt>
                  <dd className="font-mono text-foreground-heading">{leadershipJobs}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt>7d vs prior 7d</dt>
                  <dd className="font-mono text-foreground-heading">
                    {recentJobPosts7d} / {previousJobPosts7d}
                    {hiringVelocityDelta !== 0 ? ` (${hiringVelocityDelta > 0 ? "+" : ""}${hiringVelocityDelta})` : ""}
                  </dd>
                </div>
                <div className="flex items-start justify-between gap-3">
                  <dt>New departments</dt>
                  <dd className="max-w-[60%] text-right text-foreground">
                    {newDepartmentNames.length > 0 ? newDepartmentNames.join(", ") : "—"}
                  </dd>
                </div>
              </dl>
            </div>
          </DashboardCard>
        </div>
      </div>

    </div>
  );
}
