"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { CompanyCard } from "@/components/company-card";
import { EmptyState } from "@/components/empty-state";
import { unsaveCompany } from "../dashboard/actions";

interface CompanyRow {
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

export function SavedList({ initialCompanies, plan = "free" }: { initialCompanies: CompanyRow[]; plan?: import("@/types/database").Plan }) {
  const [companies, setCompanies] = useState(initialCompanies);

  const handleUnsave = useCallback(async (companyId: string) => {
    const res = await unsaveCompany(companyId);
    if (!res.error)
      setCompanies((prev) => prev.filter((c) => c.id !== companyId));
  }, []);

  if (companies.length === 0) {
    return (
      <EmptyState
        title="No saved companies yet"
        description="Save companies from the dashboard to build your target list."
      />
    );
  }

  return (
    <ul className="space-y-5">
      {companies.map((company) => (
        <li key={company.id}>
          <CompanyCard
            id={company.id}
            name={company.name}
            domain={company.domain}
            website={company.website}
            score={company.score}
            rankPosition={company.rank_position}
            previousRankPosition={company.previous_rank_position}
            score_components_json={
              company.score_components_json as import("@/types/database").ScoreComponents
            }
            last_calculated_at={company.last_calculated_at}
            isSaved={true}
            onSave={() => {}}
            onUnsave={handleUnsave}
            plan={plan}
          />
        </li>
      ))}
    </ul>
  );
}
