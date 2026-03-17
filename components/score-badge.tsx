"use client";

import { cn } from "@/lib/utils";

/**
 * Signal score badge. Backend score 0–100; display as 0–10 with momentum label and meter bar.
 */
export function ScoreBadge({
  score,
  className,
  showMeter = true,
}: {
  score: number;
  className?: string;
  showMeter?: boolean;
}) {
  const outOf10 = Math.min(10, Math.max(0, score / 10));
  const tier = outOf10 >= 8 ? "high" : outOf10 >= 5 ? "medium" : "low";
  const momentumLabel =
    tier === "high" ? "High Momentum" : tier === "medium" ? "Moderate Momentum" : "Low Momentum";
  const filledSegments = Math.round(outOf10);

  return (
    <div
      className={cn(
        // Quieter, less dominant. Let insight + badges lead.
        "inline-flex flex-col gap-1.5 rounded-lg px-2 py-1.5 text-[11px] font-medium",
        tier === "low" && "bg-muted/60 text-secondary",
        tier === "medium" && "bg-[rgba(56,189,248,0.08)] text-data-blue",
        tier === "high" && "bg-[rgba(34,197,94,0.08)] text-signal-green",
        className
      )}
    >
      <div className="flex flex-col items-start gap-0.5">
        <span className="text-[10px] uppercase tracking-wider opacity-85">Signal Score</span>
        <span className="font-mono text-sm font-bold leading-none">
          {outOf10.toFixed(1)} <span className="font-sans text-[11px] font-medium opacity-75">/ 10</span>
        </span>
        <span className="text-[10px] font-semibold uppercase tracking-wide opacity-95">
          {momentumLabel}
        </span>
      </div>
      {showMeter && (
        <div
          className="flex gap-0.5 w-full max-w-[7rem]"
          role="progressbar"
          aria-valuenow={outOf10}
          aria-valuemin={0}
          aria-valuemax={10}
        >
          {Array.from({ length: 10 }).map((_, i) => (
            <div
              key={i}
              className={cn(
                "h-1 flex-1 rounded-sm transition-colors",
                i < filledSegments
                  ? tier === "high"
                    ? "bg-signal-green"
                    : tier === "medium"
                      ? "bg-data-blue"
                      : "bg-secondary/70"
                  : "bg-muted/50"
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
}
