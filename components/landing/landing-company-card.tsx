import Link from "next/link";
import type { LandingCompanyPreview } from "@/lib/landing-data";
import { CompanyBadge } from "@/components/company-badge";
import { getCompanyBadges } from "@/lib/badges";
import { CompanyLogo } from "@/components/company-logo";

export function LandingCompanyCard({ company }: { company: LandingCompanyPreview }) {
  const scoreOutOf10 = (company.score / 10).toFixed(1);
  const badgeIds = getCompanyBadges(company.score_components_json, { score: company.score });

  return (
    <Link
      href={`/companies/${company.id}`}
      className="block rounded-xl border border-border bg-card p-4 transition-all hover:border-signal-green/40 hover:shadow-[0_0_24px_rgba(34,197,94,0.08)] no-underline"
    >
      <div className="flex items-start gap-3">
        <div className="h-11 w-11 shrink-0 overflow-hidden rounded-lg border border-border bg-sidebar flex items-center justify-center">
          <CompanyLogo name={company.name} website={company.website} domain={company.domain} className="h-full w-full object-contain" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-foreground-heading truncate">{company.name}</p>
          <p className="text-xs text-signal-green font-medium mt-0.5">
            Signal Score {scoreOutOf10}
          </p>
          <p className="text-xs text-secondary mt-1">
            {company.latest_signal_label} detected
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {company.insight_line}
          </p>
          {badgeIds.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {badgeIds.slice(0, 2).map((bid) => (
                <CompanyBadge key={bid} badgeId={bid} />
              ))}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
