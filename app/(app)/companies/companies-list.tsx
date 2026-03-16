"use client";

import { useCallback, useState } from "react";
import { CompanyCard } from "@/components/company-card";
import { EmptyState } from "@/components/empty-state";
import { saveCompany, unsaveCompany } from "@/app/(app)/dashboard/actions";
import type { CompaniesListItem } from "@/app/(app)/dashboard/data";
import type { ScoreComponents } from "@/types/database";

interface CompaniesListProps {
  initialCompanies: CompaniesListItem[];
  savedIds: string[];
  plan?: "basic" | "pro";
  hasSearchOrSort?: boolean;
  totalRankedCount?: number | null;
}

export function CompaniesList({
  initialCompanies,
  savedIds: initialSaved,
  plan = "basic",
  hasSearchOrSort = false,
  totalRankedCount = null,
}: CompaniesListProps) {
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set(initialSaved));
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

  if (initialCompanies.length === 0) {
    return (
      <>
        {plan === "basic" && saveLimitHit && (
          <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30 p-3 text-sm text-amber-800 dark:text-amber-200">
            Save limit reached (10 on Basic).{" "}
            <a href="/pricing" className="font-medium underline">
              Upgrade to Pro
            </a>{" "}
            for unlimited saved companies.
          </div>
        )}
        <EmptyState
          title={hasSearchOrSort ? "No companies matched your search" : "No companies yet"}
          description={
            hasSearchOrSort
              ? "Try a different search term or sort."
              : "Run the ingestion workers to surface companies, or add seed data."
          }
        />
      </>
    );
  }

  return (
    <>
      {plan === "basic" && saveLimitHit && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30 p-3 text-sm text-amber-800 dark:text-amber-200">
          Save limit reached (10 on Basic).{" "}
          <a href="/pricing" className="font-medium underline">
            Upgrade to Pro
          </a>{" "}
          for unlimited saved companies.
        </div>
      )}
      <ul className="space-y-5">
        {initialCompanies.map((company) => (
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
              score_components_json={company.score_components_json as ScoreComponents}
              last_calculated_at={company.last_calculated_at}
              isSaved={savedIds.has(company.id)}
              onSave={handleSave}
              onUnsave={handleUnsave}
            />
          </li>
        ))}
      </ul>
    </>
  );
}
