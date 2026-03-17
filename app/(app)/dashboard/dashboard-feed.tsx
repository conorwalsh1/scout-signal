"use client";

import { useCallback, useMemo, useState } from "react";
import { CompanyCard } from "@/components/company-card";
import { EmptyState } from "@/components/empty-state";
import { FilterBar } from "@/components/filter-bar";
import { getCompanyBadgesForPlan } from "@/lib/badges";
import type { ScoreComponents } from "@/types/database";
import { saveCompany, unsaveCompany } from "./actions";

interface RecentHeadline {
  id: string;
  source_url: string;
  detected_at: string;
  event_type: string;
  company_name_raw: string;
  title: string | null;
}

interface FeedItem {
  id: string;
  name: string;
  domain: string | null;
  website: string | null;
  updated_at: string;
  score: number;
  last_calculated_at: string;
  rank_position: number | null;
  previous_rank_position: number | null;
  score_components_json: Record<string, unknown>;
}

interface DashboardFeedProps {
  initialFeed: FeedItem[];
  savedIds: string[];
  plan?: "free" | "basic" | "pro";
  totalRankedCount?: number | null;
  recentHeadlines?: RecentHeadline[];
}

function matchesSignalFilter(
  score_components_json: Record<string, unknown>,
  signalType: string
): boolean {
  if (!signalType) return true;
  if (signalType === "job_post")
    return (score_components_json.job_posts as number) > 0;
  if (signalType === "hiring_spike") return !!score_components_json.hiring_spike;
  if (signalType === "engineering_hiring") {
    return !!score_components_json.engineering_hiring || ((score_components_json.engineering_job_posts as number) ?? 0) > 0;
  }
  if (signalType === "ai_hiring") {
    return !!score_components_json.ai_hiring || ((score_components_json.ai_job_posts as number) ?? 0) > 0;
  }
  if (signalType === "remote_hiring") {
    return !!score_components_json.remote_hiring || ((score_components_json.remote_job_posts as number) ?? 0) > 0;
  }
  if (signalType === "new_department_hiring") return !!score_components_json.new_department_hiring;
  if (signalType === "leadership_hiring") {
    return !!score_components_json.leadership_hiring || ((score_components_json.leadership_job_posts as number) ?? 0) > 0;
  }
  if (signalType === "funding_event") return !!score_components_json.funding_event;
  return true;
}

function hasExpandedHiringSignals(scoreComponents: Record<string, unknown>): boolean {
  return (
    ((scoreComponents?.job_posts as number) ?? 0) > 0 ||
    !!scoreComponents?.hiring_spike ||
    !!scoreComponents?.engineering_hiring ||
    ((scoreComponents?.engineering_job_posts as number) ?? 0) > 0 ||
    !!scoreComponents?.ai_hiring ||
    ((scoreComponents?.ai_job_posts as number) ?? 0) > 0 ||
    !!scoreComponents?.remote_hiring ||
    ((scoreComponents?.remote_job_posts as number) ?? 0) > 0 ||
    !!scoreComponents?.new_department_hiring ||
    !!scoreComponents?.leadership_hiring ||
    ((scoreComponents?.leadership_job_posts as number) ?? 0) > 0 ||
    !!scoreComponents?.funding_event
  );
}

function eventTypeLabel(eventType: string): string {
  if (eventType === "funding_event_detected") return "Funding";
  if (eventType.includes("job") || eventType.includes("hiring")) return "Hiring";
  return eventType.replace(/_/g, " ");
}

export function DashboardFeed({
  initialFeed,
  savedIds: initialSaved,
  plan = "free",
  totalRankedCount = null,
  recentHeadlines = [],
}: DashboardFeedProps) {
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set(initialSaved));
  const [searchQuery, setSearchQuery] = useState("");
  const [signalTypeFilter, setSignalTypeFilter] = useState("");
  const [badgeFilter, setBadgeFilter] = useState("");
  const [sort, setSort] = useState<"rank" | "score" | "updated">("rank");
  const [summaryFilter, setSummaryFilter] = useState<null | "high_signal" | "hiring_signals">(null);

  const baseFiltered = useMemo(() => {
    return initialFeed.filter((c) => {
      const matchesSearch =
        !searchQuery.trim() ||
        c.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesSignal = matchesSignalFilter(
        c.score_components_json,
        signalTypeFilter
      );
      const badges = getCompanyBadgesForPlan(c.score_components_json as ScoreComponents, { score: c.score, plan });
      const matchesBadge = !badgeFilter || badges.includes(badgeFilter as import("@/lib/badges").BadgeId);
      return matchesSearch && matchesSignal && matchesBadge;
    });
  }, [initialFeed, searchQuery, signalTypeFilter, badgeFilter, plan]);

  const summaryStats = useMemo(() => {
    const total = baseFiltered.length;
    const highSignal = baseFiltered.filter((c) => c.score >= 80).length;
    const withHiringSignals = baseFiltered.filter((c) => hasExpandedHiringSignals(c.score_components_json)).length;
    return { total, highSignal, withHiringSignals };
  }, [baseFiltered]);

  const filteredFeed = useMemo(() => {
    let list = baseFiltered;
    if (summaryFilter === "high_signal") {
      list = list.filter((c) => c.score >= 80);
    } else if (summaryFilter === "hiring_signals") {
      list = list.filter((c) => hasExpandedHiringSignals(c.score_components_json));
    }
    const sorted = [...list].sort((a, b) => {
      if (sort === "rank") {
        const ra = a.rank_position ?? Number.MAX_SAFE_INTEGER;
        const rb = b.rank_position ?? Number.MAX_SAFE_INTEGER;
        if (ra !== rb) return ra - rb;
        return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
      }
      if (sort === "score") {
        if (b.score !== a.score) return b.score - a.score;
        return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
      }
      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
    });
    return sorted;
  }, [baseFiltered, summaryFilter, sort]);

  const [saveLimitHit, setSaveLimitHit] = useState(false);
  const handleSave = useCallback(async (companyId: string) => {
    setSaveLimitHit(false);
    const res = await saveCompany(companyId);
    if (res.error === "saved_limit") {
      setSaveLimitHit(true);
      return;
    }
    if (!res.error) setSavedIds((prev) => new Set(prev).add(companyId));
  }, []);

  const handleUnsave = useCallback(async (companyId: string) => {
    const res = await unsaveCompany(companyId);
    if (!res.error)
      setSavedIds((prev) => {
        const next = new Set(prev);
        next.delete(companyId);
        return next;
      });
  }, []);

  return (
    <>
      {plan !== "pro" && saveLimitHit && (
        <div
          className="mb-4 rounded-lg border p-3 text-sm text-[#FDE68A]"
          style={{
            backgroundColor: "rgba(245, 158, 11, 0.08)",
            borderColor: "rgba(245, 158, 11, 0.35)",
          }}
        >
          Save limit reached ({plan === "free" ? "10 on Free" : "25 on Basic"}).{" "}
          <a href="/pricing" className="font-medium underline">{plan === "free" ? "View plans" : "Upgrade to Pro"}</a> for more saved companies.
        </div>
      )}
      {initialFeed.length > 0 && (
        <div className="mb-6 rounded-lg border border-border bg-card/50 px-4 py-3">
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            Feed summary
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => setSummaryFilter(null)}
              className={`rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
                summaryFilter === null
                  ? "border-data-blue bg-data-blue/20 text-data-blue ring-1 ring-data-blue/40"
                  : "border-border bg-sidebar/80 text-secondary hover:bg-sidebar hover:text-foreground"
              }`}
              aria-pressed={summaryFilter === null}
              aria-label="Show all in view"
            >
              {summaryStats.total} in view
            </button>
            <button
              type="button"
              onClick={() => setSummaryFilter((s) => (s === "high_signal" ? null : "high_signal"))}
              className="rounded-md border px-3 py-2 text-sm font-medium transition-colors cursor-pointer hover:opacity-90"
              style={{
                borderColor: summaryFilter === "high_signal" ? "var(--signal-green)" : "rgba(34, 197, 94, 0.35)",
                backgroundColor: summaryFilter === "high_signal" ? "rgba(34, 197, 94, 0.2)" : "rgba(34, 197, 94, 0.1)",
                color: "var(--signal-green)",
                boxShadow: summaryFilter === "high_signal" ? "0 0 0 1px rgba(34, 197, 94, 0.4)" : undefined,
              }}
              aria-pressed={summaryFilter === "high_signal"}
              aria-label={`Show ${summaryStats.highSignal} high signal companies`}
            >
              {summaryStats.highSignal} high signal
            </button>
            <button
              type="button"
              onClick={() => setSummaryFilter((s) => (s === "hiring_signals" ? null : "hiring_signals"))}
              className="rounded-md border px-3 py-2 text-sm font-medium transition-colors cursor-pointer hover:opacity-90"
              style={{
                borderColor: summaryFilter === "hiring_signals" ? "var(--data-blue)" : "rgba(56, 189, 248, 0.35)",
                backgroundColor: summaryFilter === "hiring_signals" ? "rgba(56, 189, 248, 0.2)" : "rgba(56, 189, 248, 0.1)",
                color: "var(--data-blue)",
                boxShadow: summaryFilter === "hiring_signals" ? "0 0 0 1px rgba(56, 189, 248, 0.4)" : undefined,
              }}
              aria-pressed={summaryFilter === "hiring_signals"}
              aria-label={`Show ${summaryStats.withHiringSignals} companies with hiring signals`}
            >
              {summaryStats.withHiringSignals} with hiring signals
            </button>
          </div>
        </div>
      )}
      <FilterBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        signalTypeFilter={signalTypeFilter}
        onSignalTypeChange={setSignalTypeFilter}
        badgeFilter={badgeFilter}
        onBadgeChange={setBadgeFilter}
        sort={sort}
        onSortChange={(v) => setSort(v === "score" || v === "updated" ? v : "rank")}
        plan={plan}
        className="mb-6"
      />
      {filteredFeed.length === 0 ? (
        <EmptyState
          title={
            initialFeed.length === 0
              ? "No hiring signals found"
              : "No companies match your filters"
          }
          description={
            initialFeed.length === 0
              ? "Run the pipeline to fetch and score hiring signals: npm run worker:all (or use db:seed for demo data first)."
              : "Try widening your search or signal filter."
          }
        />
      ) : (
        <>
          {filteredFeed.length >= 1 && (
            <section className="mb-10">
              <h2 className="mb-5 border-b border-border pb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Top momentum
              </h2>
              <div className="flex gap-5 overflow-x-auto pb-2 sm:grid sm:grid-cols-2 sm:overflow-visible lg:grid-cols-3">
                {filteredFeed.slice(0, 5).map((company) => (
                  <div
                    key={company.id}
                    className="min-w-[min(20rem,88vw)] shrink-0 sm:min-w-0 sm:shrink"
                  >
                    <CompanyCard
                      id={company.id}
                      name={company.name}
                      domain={company.domain}
                      website={company.website}
                      score={company.score}
                      rankPosition={company.rank_position}
                      previousRankPosition={company.previous_rank_position}
                      totalRankedCount={totalRankedCount}
                      score_components_json={
                        company.score_components_json as import("@/types/database").ScoreComponents
                      }
                      last_calculated_at={company.last_calculated_at}
                      isSaved={savedIds.has(company.id)}
                      onSave={handleSave}
                      onUnsave={handleUnsave}
                      plan={plan}
                      compact
                    />
                  </div>
                ))}
              </div>
            </section>
          )}
          {recentHeadlines.length > 0 && (
            <section className="mb-10">
              <h2 className="mb-5 border-b border-border pb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Recent signal headlines
              </h2>
              <ul className="space-y-3">
                {recentHeadlines.map((h) => {
                  const date = new Date(h.detected_at);
                  const dateStr = date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
                  const label = h.title || `${h.company_name_raw} — ${eventTypeLabel(h.event_type)}`;
                  return (
                    <li key={h.id}>
                      <a
                        href={h.source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex flex-col gap-0.5 rounded-lg border border-border bg-card/50 px-4 py-3 transition-colors hover:border-data-blue hover:bg-card"
                      >
                        <span className="line-clamp-2 text-sm font-medium text-foreground hover:text-data-blue">
                          {label}
                        </span>
                        <span className="text-xs text-muted-foreground">{dateStr}</span>
                      </a>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}
          <section>
            <h2 className="mb-5 border-b border-border pb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              All companies
            </h2>
            <ul className="space-y-5">
              {filteredFeed.map((company) => (
                <li key={company.id}>
                  <CompanyCard
                    id={company.id}
                    name={company.name}
                    domain={company.domain}
                    website={company.website}
                    score={company.score}
                    rankPosition={company.rank_position}
                    previousRankPosition={company.previous_rank_position}
                    totalRankedCount={totalRankedCount}
                    score_components_json={
                      company.score_components_json as import("@/types/database").ScoreComponents
                    }
                    last_calculated_at={company.last_calculated_at}
                    isSaved={savedIds.has(company.id)}
                    onSave={handleSave}
                    onUnsave={handleUnsave}
                    plan={plan}
                  />
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </>
  );
}
