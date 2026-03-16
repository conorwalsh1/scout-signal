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

  return (
    <div className={cn("space-y-2 group", className)}>
      <div className={cn("flex items-end gap-1.5", variant === "sparkline" ? "h-12" : "h-20")}>
        {points.map((p) => {
          const height = (p.count / max) * 100;
          return (
            <div key={p.label} className="flex-1 flex flex-col items-center gap-1">
              <div
                className="w-full rounded-t-sm bg-gradient-to-t from-signal-green/40 to-signal-green transition-all duration-200 group-hover:from-signal-green/20 group-hover:to-signal-green/90"
                style={{ height: `${height || 8}%` }}
              />
            </div>
          );
        })}
      </div>
      {variant === "full" && (
        <div className="flex justify-between text-[10px] text-secondary">
          {points.map((p, idx) => (
            <span key={p.label} className={idx === 0 || idx === points.length - 1 ? "" : "hidden sm:inline"}>
              {p.label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

