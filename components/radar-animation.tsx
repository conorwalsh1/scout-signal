"use client";

import { useId, useMemo, useEffect, useState } from "react";

const VIEWBOX = 200;
const CENTER = VIEWBOX / 2;
const RADIUS = 92;

export type RadarLabel = { companyName: string; signalType: string };

/**
 * Premium radar animation for sign-in and marketing surfaces.
 * Concentric rings, crosshairs, rotating sweep, pulse rings, center glow, signal dots.
 * Uses existing Scout Signal palette; subtle and technical.
 */
export function RadarAnimation({
  size = 280,
  className = "",
  labels = [],
}: {
  size?: number;
  className?: string;
  labels?: RadarLabel[];
}) {
  const id = useId().replace(/:/g, "-");
  const [activeIndex, setActiveIndex] = useState(0);
  const sweepPath = useMemo(() => {
    const r = RADIUS;
    const deg = 36;
    const x = CENTER + r * Math.sin((deg * Math.PI) / 180);
    const y = CENTER - r * Math.cos((deg * Math.PI) / 180);
    return `M ${CENTER} ${CENTER} L ${CENTER} ${CENTER - r} A ${r} ${r} 0 0 1 ${x} ${y} Z`;
  }, []);

  const displayLabels =
    labels.length > 0
      ? labels
      : [
          { companyName: "Gamma Inc", signalType: "hiring surge" },
          { companyName: "Asana", signalType: "ai hiring" },
          { companyName: "Datadog", signalType: "engineering buildout" },
        ];
  const activeLabel = displayLabels[activeIndex];

  useEffect(() => {
    if (displayLabels.length <= 1) return;
    const t = setInterval(() => {
      setActiveIndex((i) => (i + 1) % displayLabels.length);
    }, 3200);
    return () => clearInterval(t);
  }, [displayLabels.length]);

  return (
    <div
      className={`relative flex items-center justify-center ${className}`}
      style={{ width: size, height: size, minWidth: size, minHeight: size }}
      aria-hidden
    >
      {/* Background card + gradient, to match landing radar */}
      <div
        className="absolute inset-0 rounded-2xl pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 80% 80% at 50% 50%, rgba(34, 197, 94, 0.08) 0%, rgba(11, 15, 20, 0.95) 60%, var(--background) 100%)",
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

      {/* Pulse rings – expand and fade, 5s cycle */}
      <div
        className="absolute rounded-full border border-[var(--signal-green)] opacity-0 blur-[4px]"
        style={{
          width: "72%",
          height: "72%",
          left: "14%",
          top: "14%",
          animation: "radar-pulse 5s ease-out infinite",
          borderColor: "var(--signal-green)",
          boxShadow: "0 0 20px 4px rgba(34, 197, 94, 0.15)",
        }}
      />
      <div
        className="absolute rounded-full border border-[var(--signal-green)] opacity-0 blur-[4px]"
        style={{
          width: "72%",
          height: "72%",
          left: "14%",
          top: "14%",
          animation: "radar-pulse 5s ease-out 0.6s infinite",
          borderColor: "var(--signal-green)",
          boxShadow: "0 0 20px 4px rgba(34, 197, 94, 0.12)",
        }}
      />

      <svg
        viewBox={`0 0 ${VIEWBOX} ${VIEWBOX}`}
        className="relative z-10 w-full h-full rounded-2xl"
        style={{ maxWidth: "100%", maxHeight: "100%" }}
      >
        <defs>
          <filter id={`radar-glow-${id}`} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="1.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <linearGradient id={`sweep-gradient-${id}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#22C55E" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#38BDF8" stopOpacity="0.08" />
          </linearGradient>
        </defs>

        {/* Concentric rings */}
        {[0.95, 0.75, 0.55, 0.35].map((scale) => (
          <circle
            key={scale}
            cx={CENTER}
            cy={CENTER}
            r={RADIUS * scale}
            fill="none"
            stroke="var(--signal-green)"
            strokeOpacity="0.2"
            strokeWidth="0.6"
          />
        ))}

        {/* Crosshair */}
        <line
          x1={CENTER}
          y1={CENTER - RADIUS}
          x2={CENTER}
          y2={CENTER + RADIUS}
          stroke="var(--signal-green)"
          strokeOpacity="0.25"
          strokeWidth="0.5"
        />
        <line
          x1={CENTER - RADIUS}
          y1={CENTER}
          x2={CENTER + RADIUS}
          y2={CENTER}
          stroke="var(--signal-green)"
          strokeOpacity="0.25"
          strokeWidth="0.5"
        />

        {/* Diagonal guides (faint) */}
        <line
          x1={CENTER - RADIUS * 0.707}
          y1={CENTER - RADIUS * 0.707}
          x2={CENTER + RADIUS * 0.707}
          y2={CENTER + RADIUS * 0.707}
          stroke="var(--signal-green)"
          strokeOpacity="0.12"
          strokeWidth="0.4"
        />
        <line
          x1={CENTER + RADIUS * 0.707}
          y1={CENTER - RADIUS * 0.707}
          x2={CENTER - RADIUS * 0.707}
          y2={CENTER + RADIUS * 0.707}
          stroke="var(--signal-green)"
          strokeOpacity="0.12"
          strokeWidth="0.4"
        />

        {/* Rotating sweep beam – translucent wedge, 5–7s rotation */}
        <g
          className="radar-sweep"
          style={{ transformOrigin: `${CENTER}px ${CENTER}px` }}
        >
          <path
            d={sweepPath}
            fill={`url(#sweep-gradient-${id})`}
            opacity="0.9"
          />
        </g>

        {/* Signal dots – small glowing points, lightly pulsing */}
        {[
          [CENTER + 45, CENTER - 30],
          [CENTER - 35, CENTER + 25],
          [CENTER + 30, CENTER + 40],
        ].map(([x, y], i) => (
          <circle
            key={i}
            cx={x}
            cy={y}
            r="2.8"
            fill="var(--signal-green)"
            opacity={i === 0 ? 0.95 : 0.5}
            filter={`url(#radar-glow-${id})`}
            style={i === 0 ? { animation: "radar-dot-pulse 1.2s ease-in-out infinite" } : undefined}
          />
        ))}

        {/* Center point – glowing */}
        <circle
          cx={CENTER}
          cy={CENTER}
          r="4"
          fill="var(--signal-green)"
          opacity="0.9"
          filter={`url(#radar-glow-${id})`}
        />
        <circle
          cx={CENTER}
          cy={CENTER}
          r="2"
          fill="var(--signal-green)"
          opacity="1"
        />
      </svg>
      {activeLabel && (
        <div
          className="absolute z-20 rounded-lg border border-signal-green/40 bg-card/95 px-3 py-2 text-left shadow-lg backdrop-blur-sm"
          style={{
            left: "58%",
            top: "26%",
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
