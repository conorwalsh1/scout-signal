"use client";

import { useEffect, useRef, useState } from "react";

const DOT_COUNT = 16;
const DOT_SIZE = 10;
const GLOW_SIZE = 24;
const TRAIL_INTERVAL_MS = 28;
const MAX_AGE_MS = 320;
const SIGNAL_GREEN = "rgba(34, 197, 94, 0.88)";
const SIGNAL_GLOW = "rgba(34, 197, 94, 0.4)";

type Point = { x: number; y: number; t: number };

export function CursorTrail() {
  const [points, setPoints] = useState<Point[]>([]);
  const [mounted, setMounted] = useState(false);
  const [, setTick] = useState(0);
  const rafRef = useRef<number>(0);
  const lastMoveRef = useRef(0);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const push = (x: number, y: number) => {
      const now = Date.now();
      if (now - lastMoveRef.current < TRAIL_INTERVAL_MS) return;
      lastMoveRef.current = now;
      setPoints((prev) => {
        const next = [...prev, { x, y, t: now }].slice(-DOT_COUNT);
        return next;
      });
    };

    const onMove = (e: MouseEvent) => {
      rafRef.current = requestAnimationFrame(() => push(e.clientX, e.clientY));
    };

    const onLeave = () => setPoints([]);

    let tickId: ReturnType<typeof setInterval>;
    tickId = setInterval(() => setTick((t) => t + 1), 50);

    window.addEventListener("mousemove", onMove, { passive: true });
    document.documentElement.addEventListener("mouseleave", onLeave);
    return () => {
      cancelAnimationFrame(rafRef.current);
      clearInterval(tickId);
      window.removeEventListener("mousemove", onMove);
      document.documentElement.removeEventListener("mouseleave", onLeave);
    };
  }, [mounted]);

  if (!mounted) return null;

  const now = Date.now();

  return (
    <div
      className="fixed inset-0 pointer-events-none z-[9999]"
      aria-hidden
    >
      {points.map((p, i) => {
        const age = now - p.t;
        if (age > MAX_AGE_MS) return null;
        const progress = 1 - age / MAX_AGE_MS;
        const opacity = progress * 0.92;
        const scale = 0.35 + 0.65 * progress;
        const size = DOT_SIZE * scale;
        const glow = GLOW_SIZE * scale;
        return (
          <div
            key={`${p.t}-${i}`}
            className="absolute rounded-full"
            style={{
              left: p.x,
              top: p.y,
              width: size,
              height: size,
              marginLeft: -size / 2,
              marginTop: -size / 2,
              background: SIGNAL_GREEN,
              boxShadow: `0 0 ${glow}px ${glow / 2}px ${SIGNAL_GLOW}`,
              opacity,
            }}
          />
        );
      })}
    </div>
  );
}
