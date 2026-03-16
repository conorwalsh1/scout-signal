"use client";

import { cn } from "@/lib/utils";

export function LoadingState({ className }: { className?: string }) {
  return (
    <div className={cn("space-y-4", className)}>
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="h-28 rounded-lg border border-border bg-muted/50 animate-pulse"
        />
      ))}
    </div>
  );
}
