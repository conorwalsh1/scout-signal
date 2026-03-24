"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { CompanyLogo } from "@/components/company-logo";
import { CompanyBadge } from "@/components/company-badge";
import { saveCompany, unsaveCompany, deleteCompany } from "../actions";
import type { BadgeId } from "@/lib/badges";

function IconBookmark({ filled }: { filled?: boolean }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" className="shrink-0">
      <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function IconExternalLink() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0 opacity-60">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" x2="21" y1="14" y2="3" />
    </svg>
  );
}

function IconTrash() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0">
      <path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
    </svg>
  );
}

function IconRadar() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0">
      <path d="M19.07 4.93A10 10 0 0 0 6.99 3.34" /><path d="M4 6h.01" /><path d="M2.29 9.62A10 10 0 1 0 21.31 8.35" /><path d="M16.24 7.76A6 6 0 1 0 8.23 16.67" /><path d="M12 18h.01" /><path d="M17.99 11.66A6 6 0 0 1 15.77 16.67" /><circle cx="12" cy="12" r="2" /><path d="m13.41 10.59 5.66-5.66" />
    </svg>
  );
}

function signalTier(score: number): { label: string; color: string; bgClass: string; glowColor: string } {
  const v = score / 10;
  if (v >= 8) return { label: "HIGH SIGNAL", color: "text-signal-green", bgClass: "from-signal-green/20 to-signal-green/5 border-signal-green/40", glowColor: "rgba(34, 197, 94, 0.15)" };
  if (v >= 5) return { label: "MODERATE", color: "text-data-blue", bgClass: "from-data-blue/20 to-data-blue/5 border-data-blue/40", glowColor: "rgba(56, 189, 248, 0.12)" };
  return { label: "LOW SIGNAL", color: "text-secondary", bgClass: "from-secondary/15 to-secondary/5 border-border", glowColor: "rgba(148, 163, 184, 0.08)" };
}

function AnimatedScore({ value }: { value: number }) {
  const [display, setDisplay] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    let frame: number;
    const duration = 900;
    const start = performance.now();
    const animate = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(parseFloat((eased * value).toFixed(1)));
      if (t < 1) frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [value]);

  return <span ref={ref}>{display.toFixed(1)}</span>;
}

function SignalMeter({ score }: { score: number }) {
  const segments = 5;
  const filled = Math.round((score / 100) * segments);
  const [animated, setAnimated] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setAnimated(true), 150);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="flex gap-1.5" role="progressbar" aria-valuenow={score / 10} aria-valuemin={0} aria-valuemax={10}>
      {Array.from({ length: segments }).map((_, i) => {
        const active = animated && i < filled;
        const segVal = ((i + 1) / segments) * 10;
        const color = segVal <= 4 ? "bg-secondary/50" : segVal <= 7 ? "bg-data-blue" : "bg-signal-green";
        return (
          <div
            key={i}
            className="h-1.5 flex-1 rounded-full overflow-hidden bg-muted/30"
          >
            <div
              className={`h-full rounded-full transition-all duration-700 ease-out ${active ? color : "bg-transparent"}`}
              style={{
                width: active ? "100%" : "0%",
                transitionDelay: `${i * 120}ms`,
              }}
            />
          </div>
        );
      })}
    </div>
  );
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
  signalStory?: string;
  insightLine?: string;
  badgeIds?: BadgeId[];
  evidenceLabel?: string;
}

export function CompanyPageHeader({
  company,
  isSaved,
  isAdmin = false,
  signalStory,
  insightLine,
  badgeIds = [],
  evidenceLabel,
}: CompanyPageHeaderProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [deleting, setDeleting] = useState(false);
  const [mounted, setMounted] = useState(false);
  const siteUrl = company.website ?? (company.domain ? `https://${company.domain}` : null);
  const lastUpdated = new Date(company.last_calculated_at);
  const isValidDate = !Number.isNaN(lastUpdated.getTime());
  const isToday = isValidDate && lastUpdated.getTime() > Date.now() - 24 * 60 * 60 * 1000;
  const updatedLabel = !isValidDate ? "—" : isToday ? "Today" : lastUpdated.toLocaleDateString();
  const tier = signalTier(company.score);
  const scoreVal = parseFloat((company.score / 10).toFixed(1));

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(t);
  }, []);

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

  const webSource = company.company_web_sources?.[0];
  const confidenceLabel =
    webSource?.confidence === "manual_verified" ? "Verified"
    : webSource?.confidence === "official" ? "Official"
    : webSource?.confidence === "high" ? "High conf."
    : webSource?.confidence === "medium" ? "Med. conf."
    : null;

  return (
    <header
      className="relative overflow-hidden rounded-xl border border-border bg-card mb-6"
      style={{ boxShadow: `0 0 40px ${tier.glowColor}, 0 1px 3px rgba(0,0,0,0.3)` }}
    >
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full opacity-[0.04]" style={{ background: `radial-gradient(circle, ${tier.glowColor} 0%, transparent 70%)` }} />
      </div>

      <div className="relative grid grid-cols-1 md:grid-cols-[1fr_auto] gap-6 p-6 md:p-8">
        {/* Left column: identity + score hero */}
        <div className="flex flex-col gap-5">
          {/* Identity row */}
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-sidebar">
              <CompanyLogo name={company.name} website={company.website} domain={company.domain} className="h-full w-full object-contain" />
            </div>
            <div className="min-w-0">
              <h1 className="text-2xl font-bold tracking-tight text-foreground-heading">{company.name}</h1>
              {siteUrl && (
                <a
                  href={siteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-0.5 inline-flex items-center gap-1.5 text-sm text-secondary hover:text-foreground transition-colors"
                >
                  {company.domain ?? siteUrl}
                  <IconExternalLink />
                </a>
              )}
            </div>
          </div>

          {/* Score hero */}
          <div className={`transition-all duration-500 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"}`}>
            <div className="flex items-end gap-4">
              <div className="font-mono text-[56px] font-extrabold leading-none tracking-tighter text-foreground-heading">
                <AnimatedScore value={scoreVal} />
              </div>
              <div className="flex flex-col gap-1.5 pb-1.5">
                <span className={`text-[10px] font-bold uppercase tracking-[0.15em] ${tier.color}`}>/ 10</span>
                <span
                  className={`inline-flex w-fit items-center gap-1.5 rounded-md border bg-gradient-to-r px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] ${tier.bgClass} ${tier.color}`}
                >
                  <span className="relative flex h-1.5 w-1.5">
                    <span className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-60 ${tier.color === "text-signal-green" ? "bg-signal-green" : tier.color === "text-data-blue" ? "bg-data-blue" : "bg-secondary"}`} />
                    <span className={`relative inline-flex h-1.5 w-1.5 rounded-full ${tier.color === "text-signal-green" ? "bg-signal-green" : tier.color === "text-data-blue" ? "bg-data-blue" : "bg-secondary"}`} />
                  </span>
                  {tier.label}
                </span>
              </div>
            </div>

            {/* Signal meter */}
            <div className="mt-3 max-w-[200px]">
              <SignalMeter score={company.score} />
            </div>

            {/* Insight line */}
            {insightLine && (
              <p className="mt-3 text-sm text-secondary leading-relaxed max-w-lg">
                {insightLine}
              </p>
            )}
          </div>

          {/* Badges */}
          {badgeIds.length > 0 && (
            <div className={`flex flex-wrap gap-1.5 transition-all duration-500 delay-200 ${mounted ? "opacity-100" : "opacity-0"}`}>
              {badgeIds.slice(0, 5).map((bid) => (
                <CompanyBadge key={bid} badgeId={bid} />
              ))}
            </div>
          )}
        </div>

        {/* Right column: actions + metadata */}
        <div className="flex flex-col items-end gap-4 md:min-w-[180px]">
          <div className="flex items-center gap-2">
            {isAdmin && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleDelete}
                disabled={deleting}
                className="h-9 border-red-500/30 text-red-400 hover:bg-red-500/10 hover:border-red-500/50 transition-all"
              >
                <IconTrash />
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={handleSave}
              disabled={pending}
              className={`h-9 px-4 transition-all duration-200 ${
                isSaved
                  ? "border-signal-green/50 bg-signal-green/10 text-signal-green hover:bg-signal-green/20 hover:border-signal-green/70"
                  : "border-border bg-card/50 text-foreground hover:bg-card hover:border-signal-green/40"
              }`}
            >
              <IconBookmark filled={isSaved} />
              <span className="ml-1.5 text-sm font-medium">{isSaved ? "Tracking" : "Track signals"}</span>
            </Button>
          </div>

          {/* Metadata stack */}
          <div className={`flex flex-col items-end gap-2 text-xs text-secondary transition-all duration-500 delay-300 ${mounted ? "opacity-100" : "opacity-0"}`}>
            {signalStory && (
              <div className="flex items-center gap-1.5 text-right">
                <IconRadar />
                <span className="text-foreground/80">{signalStory}</span>
              </div>
            )}
            {evidenceLabel && (
              <div className="flex items-center gap-1.5 text-right">
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0 opacity-50"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                <span>{evidenceLabel}</span>
              </div>
            )}
            {confidenceLabel && (
              <div className="flex items-center gap-1.5 text-right">
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0 opacity-50"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                <span>{confidenceLabel}</span>
              </div>
            )}
            <div className="flex items-center gap-1.5 text-right">
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0 opacity-50"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              <span>Updated {updatedLabel}</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
