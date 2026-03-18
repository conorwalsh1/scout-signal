"use client";

import { cn } from "@/lib/utils";

export type HiringActivityPoint = {
  label: string;
  count: number;
};

interface HiringActivityChartProps {
  points: HiringActivityPoint[];
  className?: string;
  variant?: "full" | "sparkline";
}

export function HiringActivityChart({ points, className, variant = "full" }: HiringActivityChartProps) {
  if (!points.length) {
    return <p className="text-sm text-secondary">No hiring activity detected in the last 30 days.</p>;
  }

  const max = Math.max(...points.map((p) => p.count), 1);
  const total = points.reduce((a, p) => a + (Number.isFinite(p.count) ? p.count : 0), 0);
  const activeDays = points.filter((p) => p.count > 0).length;
  const chartHeightPx = variant === "sparkline" ? 48 : 80;

  return (
    <div className={cn("space-y-2 group", className)}>
      {variant === "full" && (
        <div className="flex items-center justify-between text-[11px] text-secondary">
          <span>
            <span className="text-foreground font-medium">{total}</span> post{total === 1 ? "" : "s"}
            {activeDays > 0 ? <span className="opacity-80"> · {activeDays} day{activeDays === 1 ? "" : "s"}</span> : null}
          </span>
          <span className="hidden sm:inline opacity-80">Last 30 days</span>
        </div>
      )}
      <div
        className={cn("flex items-end gap-1.5", variant === "sparkline" ? "h-12" : "h-20")}
        style={variant === "sparkline" ? { height: `${chartHeightPx}px` } : undefined}
      >
        {points.map((p) => {
          const ratio = max > 0 ? p.count / max : 0;
          const heightPx = Math.round(ratio * chartHeightPx);
          // Sparkline needs a minimum pixel height for non-zero days, otherwise sub-pixel bars vanish.
          const minPx = variant === "sparkline" ? (p.count > 0 ? 6 : 0) : 0;
          const finalHeightPx = Math.max(minPx, heightPx);
          return (
            <div key={p.label} className="flex-1 flex flex-col items-center gap-1">
              <div
                className="w-full rounded-t-sm bg-gradient-to-t from-signal-green/60 to-signal-green transition-all duration-200 group-hover:from-signal-green/40 group-hover:to-signal-green"
                style={{ height: `${finalHeightPx}px` }}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

