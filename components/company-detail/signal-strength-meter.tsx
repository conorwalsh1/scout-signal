"use client";

import { cn } from "@/lib/utils";

/** Score 0–100 displayed as 0–10. Bar: 0–4 gray, 5–7 blue, 8–10 green. */
export function SignalStrengthMeter({ score }: { score: number }) {
  const outOf10 = Math.min(10, Math.max(0, score / 10));
  const segmentCount = 10;
  const filledCount = Math.round(outOf10);

  const getSegmentColor = (index: number) => {
    const segmentValue = (index + 1) / segmentCount * 10;
    if (segmentValue <= 4) return "bg-secondary/60";
    if (segmentValue <= 7) return "bg-data-blue";
    return "bg-signal-green";
  };

  return (
    <div className="flex gap-0.5 w-full max-w-xs" role="progressbar" aria-valuenow={outOf10} aria-valuemin={0} aria-valuemax={10}>
      {Array.from({ length: segmentCount }).map((_, i) => (
        <div
          key={i}
          className={cn(
            "h-2 flex-1 rounded-sm transition-colors",
            i < filledCount
              ? getSegmentColor(i)
              : "bg-muted/50"
          )}
        />
      ))}
    </div>
  );
}
