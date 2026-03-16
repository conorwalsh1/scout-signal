"use client";

import { useId, useMemo, useState, useEffect } from "react";

const VIEWBOX = 200;
const CENTER = VIEWBOX / 2;
const RADIUS = 92;

export type RadarLabel = { companyName: string; signalType: string };

/** Dot position as fraction of radius from center (0–1), angle in degrees. */
function polarToXY(frac: number, deg: number): [number, number] {
  const r = RADIUS * frac;
  const rad = (deg * Math.PI) / 180;
  return [CENTER + r * Math.sin(rad), CENTER - r * Math.cos(rad)];
}

export function LandingRadar({
  size = 380,
  labels = [],
  className = "",
}: {
  size?: number;
  labels?: RadarLabel[];
  className?: string;
}) {
  const id = useId().replace(/:/g, "-");
  const [activeIndex, setActiveIndex] = useState(0);
  const [pulsingIndex, setPulsingIndex] = useState(0);

  const sweepPath = useMemo(() => {
    const r = RADIUS;
    const deg = 36;
    const x = CENTER + r * Math.sin((deg * Math.PI) / 180);
    const y = CENTER - r * Math.cos((deg * Math.PI) / 180);
    return `M ${CENTER} ${CENTER} L ${CENTER} ${CENTER - r} A ${r} ${r} 0 0 1 ${x} ${y} Z`;
  }, []);

  const dotPositions = useMemo(
    () =>
      [
        [0.45, 30],
        [0.65, 120],
        [0.5, 210],
        [0.7, 280],
        [0.55, 340],
        [0.4, 75],
      ].map(([frac, deg]) => polarToXY(frac as number, deg as number)),
    []
  );

  useEffect(() => {
    const t = setInterval(() => {
      setActiveIndex((i) => (i + 1) % Math.max(1, labels.length));
      setPulsingIndex((i) => (i + 1) % Math.max(1, dotPositions.length));
    }, 3200);
    return () => clearInterval(t);
  }, [labels.length, dotPositions.length]);

  const displayLabels = labels.length > 0 ? labels : [
    { companyName: "Beta Labs", signalType: "hiring spike" },
    { companyName: "Gamma Inc", signalType: "funding event" },
    { companyName: "Acme Corp", signalType: "engineering hiring" },
  ];

  const activeLabel = displayLabels[activeIndex];

  return (
    <div
      className={`relative flex items-center justify-center ${className}`}
      style={{ width: size, height: size, minWidth: size, minHeight: size }}
      aria-hidden
    >
      {/* Dark radar screen + gradient */}
      <div
        className="absolute inset-0 rounded-2xl pointer-events-none"
        style={{
          background: "radial-gradient(ellipse 80% 80% at 50% 50%, rgba(34, 197, 94, 0.08) 0%, rgba(11, 15, 20, 0.95) 60%, var(--background) 100%)",
          boxShadow: "inset 0 0 80px rgba(0,0,0,0.4), 0 0 0 1px rgba(34, 197, 94, 0.15)",
        }}
      />
      <div
        className="absolute inset-0 rounded-2xl pointer-events-none opacity-60"
        style={{
          background: "radial-gradient(circle, rgba(34, 197, 94, 0.04) 0%, transparent 65%)",
          filter: "blur(8px)",
        }}
      />

      <div
        className="absolute rounded-full border border-signal-green/30 opacity-0 blur-[2px]"
        style={{
          width: "72%",
          height: "72%",
          left: "14%",
          top: "14%",
          animation: "radar-pulse 5s ease-out infinite",
          borderColor: "var(--signal-green)",
        }}
      />

      <svg
        viewBox={`0 0 ${VIEWBOX} ${VIEWBOX}`}
        className="relative z-10 w-full h-full rounded-2xl"
        style={{ maxWidth: "100%", maxHeight: "100%" }}
      >
        <defs>
          <filter id={`landing-glow-${id}`} x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="1.2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <linearGradient id={`landing-sweep-${id}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#22C55E" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#38BDF8" stopOpacity="0.06" />
          </linearGradient>
        </defs>

        {[0.95, 0.75, 0.55, 0.35].map((scale) => (
          <circle
            key={scale}
            cx={CENTER}
            cy={CENTER}
            r={RADIUS * scale}
            fill="none"
            stroke="var(--signal-green)"
            strokeOpacity="0.22"
            strokeWidth="0.5"
          />
        ))}
        <line x1={CENTER} y1={CENTER - RADIUS} x2={CENTER} y2={CENTER + RADIUS} stroke="var(--signal-green)" strokeOpacity="0.2" strokeWidth="0.5" />
        <line x1={CENTER - RADIUS} y1={CENTER} x2={CENTER + RADIUS} y2={CENTER} stroke="var(--signal-green)" strokeOpacity="0.2" strokeWidth="0.5" />

        <g className="radar-sweep" style={{ transformOrigin: `${CENTER}px ${CENTER}px` }}>
          <path d={sweepPath} fill={`url(#landing-sweep-${id})`} opacity="0.85" />
        </g>

        {dotPositions.map(([x, y], i) => (
          <g key={i}>
            <circle
              cx={x}
              cy={y}
              r="2.8"
              fill="var(--signal-green)"
              opacity={i === pulsingIndex ? 0.95 : 0.45}
              filter={`url(#landing-glow-${id})`}
              style={
                i === pulsingIndex
                  ? { animation: "radar-dot-pulse 1.2s ease-in-out infinite" }
                  : undefined
              }
            />
          </g>
        ))}

        <circle cx={CENTER} cy={CENTER} r="4" fill="var(--signal-green)" opacity="0.9" filter={`url(#landing-glow-${id})`} />
        <circle cx={CENTER} cy={CENTER} r="2" fill="var(--signal-green)" opacity="1" />
      </svg>

      {activeLabel && (
        <div
          className="absolute z-20 rounded-lg border border-signal-green/40 bg-card/95 px-3 py-2 text-left shadow-lg backdrop-blur-sm"
          style={{
            left: "55%",
            top: "35%",
            animation: "radar-label-fade 3.2s ease-in-out infinite",
          }}
        >
          <p className="text-xs font-semibold text-foreground leading-tight">
            {activeLabel.companyName}
          </p>
          <p className="text-[10px] text-signal-green uppercase tracking-wide mt-0.5">
            {activeLabel.signalType}
          </p>
        </div>
      )}
    </div>
  );
}
