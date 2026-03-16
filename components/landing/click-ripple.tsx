"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const RIPPLE_SIZE = 120;
const RIPPLE_DURATION_MS = 900;

type Ripple = { id: number; x: number; y: number };

export function ClickRipple() {
  const [ripples, setRipples] = useState<Ripple[]>([]);
  const [mounted, setMounted] = useState(false);
  const idRef = useRef(0);

  useEffect(() => {
    setMounted(true);
  }, []);

  const removeRipple = useCallback((id: number) => {
    setRipples((prev) => prev.filter((r) => r.id !== id));
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const handleClick = (e: MouseEvent) => {
      const id = ++idRef.current;
      setRipples((prev) => [...prev, { id, x: e.clientX, y: e.clientY }]);
      setTimeout(() => removeRipple(id), RIPPLE_DURATION_MS);
    };

    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, [mounted, removeRipple]);

  if (!mounted) return null;

  return (
    <div
      className="fixed inset-0 pointer-events-none z-[9998]"
      aria-hidden
    >
      {ripples.map((r) => (
        <div
          key={r.id}
          className="absolute rounded-full border-2 border-signal-green/80 click-radar-ripple"
          style={{
            left: r.x,
            top: r.y,
            width: RIPPLE_SIZE,
            height: RIPPLE_SIZE,
            marginLeft: -RIPPLE_SIZE / 2,
            marginTop: -RIPPLE_SIZE / 2,
            boxShadow: "0 0 20px 2px rgba(34, 197, 94, 0.25)",
          }}
        />
      ))}
    </div>
  );
}
