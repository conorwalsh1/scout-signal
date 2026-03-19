import Link from "next/link";
import { BADGES } from "@/lib/badges";

export function LandingBadges() {
  return (
    <section className="border-t border-border/50 px-4 py-16 sm:px-6 lg:px-8" data-landing="signals-we-detect">
      <div className="mx-auto max-w-6xl">
        <h2 className="text-2xl font-bold text-foreground-heading">Signals we detect</h2>
        <p className="mt-2 text-sm text-secondary">
          Click a signal to see who&apos;s worth acting on right now.
        </p>
        <div className="mt-6 flex flex-wrap gap-2">
          {BADGES.map((badge) => (
            <Link
              key={badge.id}
              href={`/companies?badge=${badge.id}&sort=rank`}
              className="inline-flex items-center rounded-md border border-border bg-card px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-secondary no-underline transition-colors hover:border-signal-green/40 hover:text-foreground"
            >
              {badge.label}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
