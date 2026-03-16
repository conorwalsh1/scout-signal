"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { getLatestSignalLabel } from "@/lib/signal-engine/explanations";
import { getCompanySiteUrl } from "@/lib/company-web";
import { ScoreBadge } from "@/components/score-badge";
import { CompanyBadge } from "@/components/company-badge";
import { getCompanyBadges } from "@/lib/badges";
import { CompanyLogo } from "@/components/company-logo";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { unsaveCompany } from "../dashboard/actions";
import type { ScoreComponents } from "@/types/database";

interface TrackedRow {
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

function IconBookmark({ className, filled }: { className?: string; filled?: boolean }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
    </svg>
  );
}

export function TrackedCompaniesList({ initialCompanies }: { initialCompanies: TrackedRow[] }) {
  const [companies, setCompanies] = useState(initialCompanies);

  const handleUntrack = useCallback(async (companyId: string) => {
    const res = await unsaveCompany(companyId);
    if (!res.error) setCompanies((prev) => prev.filter((c) => c.id !== companyId));
  }, []);

  if (companies.length === 0) {
    return (
      <EmptyState
        title="No tracked companies yet"
        description="Save companies from the dashboard or companies list to build your watchlist and get updates."
      />
    );
  }

  const formatLastActivity = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - d.getTime()) / (24 * 60 * 60 * 1000));
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  };

  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-sidebar/50">
              <th className="text-left py-3 px-4 font-semibold text-secondary">Company</th>
              <th className="text-left py-3 px-4 font-semibold text-secondary">Latest Signal</th>
              <th className="text-left py-3 px-4 font-semibold text-secondary">Signal Score</th>
              <th className="text-left py-3 px-4 font-semibold text-secondary">Last Activity</th>
              <th className="w-24 py-3 px-4" aria-label="Actions" />
            </tr>
          </thead>
          <tbody>
            {companies.map((company) => {
              const comp = company.score_components_json as ScoreComponents;
              const latestSignal = getLatestSignalLabel(comp);
              const badgeIds = getCompanyBadges(comp, { score: company.score });
              const siteUrl = getCompanySiteUrl({ website: company.website, domain: company.domain });
              return (
                <tr
                  key={company.id}
                  className="border-b border-border hover:bg-card/50 transition-colors"
                >
                  <td className="py-3 px-4">
                    <Link
                      href={`/companies/${company.id}`}
                      className="flex items-center gap-3 no-underline text-foreground hover:text-signal-green"
                    >
                      <div className="h-9 w-9 shrink-0 rounded-lg border border-border bg-sidebar overflow-hidden flex items-center justify-center">
                        <CompanyLogo name={company.name} website={company.website} domain={company.domain} className="h-full w-full object-contain" />
                      </div>
                      <div>
                        <span className="font-medium">{company.name}</span>
                        {siteUrl && (
                          <span className="block text-xs text-secondary truncate max-w-[180px]">
                            {company.domain ?? new URL(siteUrl).hostname}
                          </span>
                        )}
                      </div>
                    </Link>
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-foreground">{latestSignal}</span>
                    {badgeIds.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {badgeIds.slice(0, 3).map((bid) => (
                          <CompanyBadge key={bid} badgeId={bid} />
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <ScoreBadge score={company.score} showMeter={false} />
                  </td>
                  <td className="py-3 px-4 text-secondary">
                    {formatLastActivity(company.last_calculated_at)}
                  </td>
                  <td className="py-3 px-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleUntrack(company.id)}
                      className="text-secondary hover:text-foreground"
                      aria-label="Remove from tracked"
                    >
                      <IconBookmark filled />
                      <span className="ml-1.5 sr-only sm:not-sr-only">Untrack</span>
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
