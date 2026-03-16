"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ScoreBadge } from "@/components/score-badge";
import { Button } from "@/components/ui/button";
import { saveCompany, unsaveCompany, deleteCompany } from "./actions";

function IconExternalLink({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" x2="21" y1="14" y2="3" />
    </svg>
  );
}

function IconTrash({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <path d="M3 6h18" />
      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
      <line x1="10" x2="10" y1="11" y2="17" />
      <line x1="14" x2="14" y1="11" y2="17" />
    </svg>
  );
}

function IconBookmark({ className, filled }: { className?: string; filled?: boolean }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" className={className}>
      <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function IconBookmarkCheck({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" className={className}>
      <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16l-7-4-7 4" />
      <path d="m9 10 2 2 4-4" />
    </svg>
  );
}

interface CompanyHeaderProps {
  company: {
    id: string;
    name: string;
    domain: string | null;
    website: string | null;
    score: number;
    last_calculated_at: string;
    company_sources?: Array<{
      source_type: string;
      source_external_id: string | null;
      metadata_json: Record<string, unknown>;
    }>;
  };
  isSaved: boolean;
  isAdmin?: boolean;
}

export function CompanyHeader({ company, isSaved, isAdmin = false }: CompanyHeaderProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [deleting, setDeleting] = useState(false);

  const handleDelete = () => {
    if (!confirm(`Delete "${company.name}"? This cannot be undone.`)) return;
    setDeleting(true);
    deleteCompany(company.id).then((res) => {
      if (res.error) alert(res.error);
      else router.push("/companies");
      setDeleting(false);
    });
  };
  const siteUrl = company.website ?? (company.domain ? `https://${company.domain}` : null);
  const ft1000Source = company.company_sources?.find((source) => source.source_type === "ft1000");
  const ftMeta = (ft1000Source?.metadata_json ?? {}) as Record<string, unknown>;
  const ftRank = typeof ftMeta.rank === "number" ? ftMeta.rank : null;
  const ftHeadquarters = typeof ftMeta.headquarters === "string" ? ftMeta.headquarters : null;
  const ftCategory = typeof ftMeta.category === "string" ? ftMeta.category : null;
  const ftCagr = typeof ftMeta.cagr === "number" ? ftMeta.cagr : null;

  const handleToggle = () => {
    startTransition(async () => {
      if (isSaved) await unsaveCompany(company.id);
      else await saveCompany(company.id);
      router.refresh();
    });
  };

  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold text-foreground-heading">{company.name}</h1>
        <div className="mt-2 flex items-center gap-3">
          <ScoreBadge score={company.score} />
          <span className="text-sm text-secondary">
            Updated {new Date(company.last_calculated_at).toLocaleDateString()}
          </span>
        </div>
        {siteUrl && (
          <a
            href={siteUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-flex items-center gap-1 text-sm text-data-blue hover:underline"
          >
            {company.domain ?? siteUrl}
            <IconExternalLink className="h-3 w-3" />
          </a>
        )}
        {!siteUrl && (ftRank || ftHeadquarters || ftCategory || ftCagr) && (
          <div className="mt-3 flex flex-wrap gap-2 text-xs text-secondary">
            {ftRank ? <span className="rounded bg-muted px-2 py-1">FT1000 #{ftRank}</span> : null}
            {ftHeadquarters ? <span className="rounded bg-muted px-2 py-1">{ftHeadquarters}</span> : null}
            {ftCategory ? <span className="rounded bg-muted px-2 py-1">{ftCategory}</span> : null}
            {ftCagr ? <span className="rounded bg-muted px-2 py-1">{ftCagr}% CAGR</span> : null}
          </div>
        )}
      </div>
      <div className="flex items-center gap-2">
        {isAdmin && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleDelete}
            disabled={deleting}
            className="border-danger text-danger hover:bg-danger/10"
          >
            <IconTrash className="h-4 w-4 mr-1" />
            Delete company
          </Button>
        )}
          <Button
          variant="outline"
          size="sm"
          onClick={handleToggle}
          disabled={pending}
        >
          {isSaved ? (
            <>
              <IconBookmarkCheck className="h-4 w-4 mr-1" />
              Tracking
            </>
          ) : (
            <>
              <IconBookmark className="h-4 w-4 mr-1" />
              Track company
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
