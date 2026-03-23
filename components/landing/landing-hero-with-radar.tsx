"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { LandingRadar, type RadarLabel } from "./landing-radar";
import { BetaCountdown } from "./beta-countdown";
import { BetaRequestForm } from "./beta-request-form";

export function LandingHeroWithRadar({
  radarLabels,
  displayCount,
  signalsDisplay,
}: {
  radarLabels: RadarLabel[];
  displayCount: string;
  signalsDisplay: string | number;
}) {
  const [clicks, setClicks] = useState<{ id: number; x: number; y: number }[]>([]);
  const nextIdRef = useRef(0);

  const handleClick = (event: React.MouseEvent<HTMLDivElement>) => {
    const x = event.clientX;
    const y = event.clientY;
    const id = nextIdRef.current++;
    setClicks((prev) => [...prev, { id, x, y }]);
    setTimeout(() => {
      setClicks((prev) => prev.filter((pulse) => pulse.id !== id));
    }, 900);
  };

  return (
    <>
      {/* Click-based radar pulses */}
      <div className="pointer-events-none fixed inset-0 z-[40]" aria-hidden>
        {clicks.map((pulse) => (
          <div
            key={pulse.id}
            className="click-radar-ripple absolute rounded-full border border-signal-green/50"
            style={{
              left: pulse.x,
              top: pulse.y,
              width: 200,
              height: 200,
              marginLeft: -100,
              marginTop: -100,
              boxShadow: "0 0 40px 12px rgba(34, 197, 94, 0.35)",
            }}
          />
        ))}
      </div>
      <section
        className="relative border-b border-border/50 px-4 py-16 sm:px-6 lg:px-8"
        data-landing="hero-with-radar"
        onClick={handleClick}
      >
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-col items-center gap-12 lg:flex-row lg:justify-between lg:gap-16">
            <div className="flex shrink-0 flex-col items-center justify-center gap-4 lg:order-2">
              <LandingRadar size={320} labels={radarLabels} className="max-w-[min(320px,85vw)]" />
              <BetaCountdown />
            </div>
            <div className="min-w-0 flex-1 text-center lg:order-1 lg:text-left">
              <p className="text-sm font-medium uppercase tracking-[0.22em] text-signal-green">
                Fresh funding creates recruiting opportunity.
              </p>
              <h1 className="mt-6 text-4xl font-bold tracking-tight text-foreground-heading sm:text-5xl lg:text-6xl">
                Track newly funded companies before hiring demand becomes obvious.
              </h1>
              <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-secondary lg:mx-0">
                Signal Scout tracks Series A-C funding events and translates them into recruiter-ready opportunities so you can act before other agencies pile in.
              </p>
              <p className="mt-4 text-sm text-muted-foreground">
                Tracking <span className="font-semibold text-signal-green">{displayCount}</span> companies.
                {" · "}
                Signals detected today <span className="font-semibold text-signal-green">{signalsDisplay}</span>
              </p>
              <BetaRequestForm />
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
