import Link from "next/link";
import { BADGES, BADGE_STYLES } from "@/lib/badges";

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
              className={[
                "inline-flex items-center rounded-md px-2 py-1 text-[11px] font-semibold uppercase tracking-wide no-underline transition-all duration-150 hover:-translate-y-[1px]",
                BADGE_STYLES[badge.id],
              ].join(" ")}
            >
              {badge.id === "leadership_hire" ? "Exec signal" : badge.label}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
