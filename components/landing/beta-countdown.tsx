"use client";

import { useEffect, useMemo, useState } from "react";

function format2(n: number) {
  return n.toString().padStart(2, "0");
}

export function BetaCountdown() {
  // Friday 3rd April 2026 9:00am Europe/Dublin.
  // Dublin is UTC+1 in April (DST), so 09:00 Dublin = 08:00 UTC.
  const targetMs = useMemo(() => new Date("2026-04-03T08:00:00.000Z").getTime(), []);
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const diffMs = Math.max(0, targetMs - nowMs);
  const totalSeconds = Math.floor(diffMs / 1000);
  const days = Math.floor(totalSeconds / (60 * 60 * 24));
  const hours = Math.floor((totalSeconds % (60 * 60 * 24)) / (60 * 60));
  const minutes = Math.floor((totalSeconds % (60 * 60)) / 60);
  const seconds = totalSeconds % 60;

  const ended = diffMs <= 0;

  if (ended) {
    return (
      <div className="inline-flex items-center gap-2 rounded-lg border border-signal-green/40 bg-[rgba(34,197,94,0.08)] px-3 py-2 text-xs font-semibold text-signal-green">
        Pro unlocks now
      </div>
    );
  }

  return (
    <div className="inline-flex flex-wrap items-center gap-2 rounded-lg border border-signal-green/40 bg-[rgba(34,197,94,0.08)] px-3 py-2 text-xs font-semibold text-signal-green">
      <span className="uppercase tracking-[0.16em] text-[10px] opacity-90">Early access</span>
      <span className="text-signal-green/95">
        Pro unlocks in {days}d {format2(hours)}:{format2(minutes)}:{format2(seconds)}
      </span>
    </div>
  );
}

