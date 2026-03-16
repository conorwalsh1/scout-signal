"use client";

import { cn } from "@/lib/utils";

const SIGNAL_LABELS: Record<string, string> = {
  job_post: "Job Posting",
  hiring_spike: "Hiring Spike",
  funding_event: "Funding Event",
  ft1000_growth: "FT1000 Growth",
};

const SIGNAL_STYLES: Record<string, string> = {
  job_post: "bg-[rgba(56,189,248,0.15)] text-data-blue border border-data-blue/30",
  hiring_spike: "bg-[rgba(34,197,94,0.15)] text-signal-green border border-signal-green/30",
  funding_event: "bg-[rgba(245,158,11,0.12)] text-amber-400 border border-amber-400/25",
  ft1000_growth: "bg-muted/80 text-secondary border border-border",
};

export function SignalBadge({
  signalType,
  className,
}: {
  signalType: string;
  className?: string;
}) {
  const label = SIGNAL_LABELS[signalType] ?? signalType.replace(/_/g, " ");
  const style = SIGNAL_STYLES[signalType] ?? "bg-muted/80 text-secondary border border-border";
  return (
    <span
      className={cn(
        "inline-flex rounded-md px-2 py-1 text-[11px] font-semibold uppercase tracking-wide",
        style,
        className
      )}
    >
      {label}
    </span>
  );
}
