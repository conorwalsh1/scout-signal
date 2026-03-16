"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { SignalStrengthMeter } from "@/components/company-detail/signal-strength-meter";
import { CompanyLogo } from "@/components/company-logo";
import { saveCompany, unsaveCompany, deleteCompany } from "../actions";

function IconBookmark({ filled }: { filled?: boolean }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" className="shrink-0">
      <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function IconExternalLink() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" x2="21" y1="14" y2="3" />
    </svg>
  );
}

function IconTrash() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0">
      <path d="M3 6h18" />
      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
      <line x1="10" x2="10" y1="11" y2="17" />
      <line x1="14" x2="14" y1="11" y2="17" />
    </svg>
  );
}

function IconGlobe() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted-foreground">
      <circle cx="12" cy="12" r="10" />
      <line x1="2" x2="22" y1="12" y2="12" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  );
}

function signalCategory(score: number): "LOW SIGNAL" | "MEDIUM SIGNAL" | "HIGH SIGNAL" {
  const outOf10 = score / 10;
  if (outOf10 >= 8) return "HIGH SIGNAL";
  if (outOf10 >= 5) return "MEDIUM SIGNAL";
  return "LOW SIGNAL";
}

function signalCategoryColor(score: number): string {
  const outOf10 = score / 10;
  if (outOf10 >= 8) return "text-signal-green";
  if (outOf10 >= 5) return "text-data-blue";
  return "text-secondary";
}

interface CompanyPageHeaderProps {
  company: {
    id: string;
    name: string;
    domain: string | null;
    website: string | null;
    score: number;
    last_calculated_at: string;
    company_web_sources?: Array<{
      source_type: string;
      source_value: string | null;
      confidence: string;
      website: string | null;
      domain: string | null;
      metadata_json: Record<string, unknown>;
      verified_at: string | null;
    }>;
  };
  isSaved: boolean;
  isAdmin?: boolean;
}

export function CompanyPageHeader({ company, isSaved, isAdmin = false }: CompanyPageHeaderProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [deleting, setDeleting] = useState(false);
  const siteUrl = company.website ?? (company.domain ? `https://${company.domain}` : null);
  const lastUpdated = new Date(company.last_calculated_at);
  const isValidDate = !Number.isNaN(lastUpdated.getTime());
  const isToday = isValidDate && lastUpdated.getTime() > Date.now() - 24 * 60 * 60 * 1000;
  const updatedLabel = !isValidDate ? "—" : isToday ? "Today" : lastUpdated.toLocaleDateString();
  const scoreOutOf10 = (company.score / 10).toFixed(1);
  const category = signalCategory(company.score);
  const webSource = company.company_web_sources?.[0];
  const webConfidenceLabel =
    webSource?.confidence === "manual_verified"
      ? "Manual verified"
      : webSource?.confidence === "official"
        ? "Official"
        : webSource?.confidence === "high"
          ? "High confidence"
          : webSource?.confidence === "medium"
            ? "Medium confidence"
            : webSource?.confidence === "low"
              ? "Low confidence"
              : null;
  const webSourceLabel = webSource?.source_type
    ? webSource.source_type.replace(/_/g, " ")
    : null;

  const handleSave = () => {
    startTransition(async () => {
      if (isSaved) await unsaveCompany(company.id);
      else await saveCompany(company.id);
      router.refresh();
    });
  };

  const handleDelete = () => {
    if (!confirm(`Delete "${company.name}"? This cannot be undone.`)) return;
    setDeleting(true);
    deleteCompany(company.id).then((res) => {
      if (res.error) alert(res.error);
      else router.push("/companies");
      setDeleting(false);
    });
  };

  return (
    <header className="rounded-lg border border-border bg-card p-6 mb-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1 flex items-start gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-sidebar">
            <CompanyLogo name={company.name} website={company.website} domain={company.domain} className="h-full w-full object-contain" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-bold text-foreground-heading">{company.name}</h1>
            {siteUrl && (
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <a
                  href={siteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm text-data-blue hover:underline"
                >
                  {company.domain ?? siteUrl}
                  <IconExternalLink />
                </a>
                {(webSourceLabel || webConfidenceLabel) && (
                  <div className="flex flex-wrap gap-2 text-xs text-secondary">
                    {webSourceLabel ? (
                      <span className="rounded bg-muted px-2 py-1">
                        Web source: {webSourceLabel}
                      </span>
                    ) : null}
                    {webConfidenceLabel ? (
                      <span className="rounded bg-muted px-2 py-1">
                        {webConfidenceLabel}
                      </span>
                    ) : null}
                  </div>
                )}
              </div>
            )}
            <div className="mt-4 flex flex-wrap items-center gap-4">
              <div>
                <span className="text-2xl font-bold font-mono text-foreground-heading">Signal score: {scoreOutOf10}</span>
                <span className={signalCategoryColor(company.score) + " ml-2 text-sm font-semibold uppercase tracking-wide"}>
                  {category}
                </span>
              </div>
              <span className="text-sm text-secondary">Last updated: {updatedLabel}</span>
            </div>
            <div className="mt-3">
              <SignalStrengthMeter score={company.score} />
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {isAdmin && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleDelete}
              disabled={deleting}
              className="border-danger text-danger hover:bg-danger/10"
            >
              <IconTrash />
              <span className="ml-1.5">Delete company</span>
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handleSave}
            disabled={pending}
            className={isSaved ? "border-signal-green text-signal-green hover:bg-signal-green/10" : ""}
          >
            <IconBookmark filled={isSaved} />
            <span className="ml-1.5">{isSaved ? "Tracking" : "Track company"}</span>
          </Button>
        </div>
      </div>
    </header>
  );
}
