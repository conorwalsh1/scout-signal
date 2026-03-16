"use client";

import Link from "next/link";
import { CursorTrail } from "./cursor-trail";
import { LandingRadar, type RadarLabel } from "./landing-radar";

export function LandingHeroWithRadar({
  radarLabels,
  displayCount,
  signalsDisplay,
}: {
  radarLabels: RadarLabel[];
  displayCount: string;
  signalsDisplay: string | number;
}) {
  return (
    <>
      <CursorTrail />
      <section className="relative border-b border-border/50 px-4 py-16 sm:px-6 lg:px-8" data-landing="hero-with-radar">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-col items-center gap-12 lg:flex-row lg:justify-between lg:gap-16">
            <div className="flex shrink-0 justify-center lg:order-2">
              <LandingRadar size={320} labels={radarLabels} className="max-w-[min(320px,85vw)]" />
            </div>
            <div className="min-w-0 flex-1 text-center lg:order-1 lg:text-left">
              <p className="text-sm font-medium uppercase tracking-[0.22em] text-signal-green">
                Hiring intelligence for early growth
              </p>
              <h1 className="mt-6 text-4xl font-bold tracking-tight text-foreground-heading sm:text-5xl lg:text-6xl">
                Discover companies before they start scaling.
              </h1>
              <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-secondary lg:mx-0">
                Real-time hiring intelligence that reveals which companies are about to grow.
              </p>
              <p className="mt-4 text-sm text-muted-foreground">
                Tracking <span className="font-semibold text-signal-green">{displayCount}</span> companies.
                {" · "}
                Signals detected today <span className="font-semibold text-signal-green">{signalsDisplay}</span>
              </p>
              <div className="mt-8 flex flex-col justify-center gap-4 sm:flex-row lg:justify-start">
                <Link
                  href="/signup"
                  className="inline-flex justify-center rounded-lg bg-signal-green px-6 py-3.5 text-base font-semibold text-black no-underline hover:bg-signal-green/90"
                >
                  Create free account
                </Link>
                <Link
                  href="/login"
                  className="inline-flex justify-center rounded-lg border border-border px-6 py-3.5 text-base font-semibold text-foreground no-underline hover:bg-card"
                >
                  View live signals
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
