"use client";

import { BADGES } from "@/lib/badges";
import type { BadgeId } from "@/lib/badges";
import { CompanyBadge } from "@/components/company-badge";

export function LandingBadges() {
  return (
    <section className="border-t border-border/50 px-4 py-16 sm:px-6 lg:px-8" data-landing="signals-we-detect">
      <div className="mx-auto max-w-6xl">
        <h2 className="text-2xl font-bold text-foreground-heading">Signals we detect</h2>
        <p className="mt-2 text-sm text-secondary">
          Click a badge to see companies with that signal in the leaderboard.
        </p>
        <div className="mt-6 flex flex-wrap gap-2">
          {(BADGES as readonly { id: BadgeId; label: string }[]).map((b) => (
            <CompanyBadge key={b.id} badgeId={b.id} />
          ))}
        </div>
      </div>
    </section>
  );
}
