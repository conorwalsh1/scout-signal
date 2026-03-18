"use client";

import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";

function IconPin({ className, filled }: { className?: string; filled?: boolean }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M14 9l7-7" />
      <path d="M9 14l-7 7" />
      <path d="M8 8l8 8" />
      <path d="M5 19l4-4" />
    </svg>
  );
}

const STORAGE_KEY = "scoutsignal.sidebar.pinned";

export function SidebarShell({
  brand,
  nav,
  children,
}: {
  brand: React.ReactNode;
  nav: React.ReactNode;
  children: React.ReactNode;
}) {
  const [pinned, setPinned] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw === "true") setPinned(true);
    } catch {
      // ignore
    } finally {
      setHydrated(true);
    }
  }, []);

  const asideClassName = useMemo(() => {
    const base =
      "group/sidebar border-r border-sidebar-border flex flex-col bg-sidebar transition-[width] duration-200 ease-out";
    if (!hydrated) return cn(base, "w-56"); // avoid layout jank on first paint
    if (pinned) return cn(base, "w-56");
    return cn(base, "w-[68px] hover:w-56 focus-within:w-56");
  }, [hydrated, pinned]);

  const pinButtonClassName = useMemo(() => {
    const base =
      "inline-flex h-8 w-8 items-center justify-center rounded-md border border-border bg-card/30 text-secondary hover:text-foreground hover:bg-card/50 transition-opacity";
    if (!hydrated) return cn(base, "opacity-100");
    if (pinned) return cn(base, "opacity-100");
    return cn(base, "opacity-0 group-hover/sidebar:opacity-100 group-focus-within/sidebar:opacity-100");
  }, [hydrated, pinned]);

  return (
    <div className="min-h-screen flex bg-background">
      <aside className={asideClassName} data-pinned={pinned ? "true" : "false"}>
        <div
          className={cn(
            "relative border-b border-sidebar-border flex items-center justify-center",
            hydrated && !pinned ? "px-3 py-3 group-hover/sidebar:px-4 group-focus-within/sidebar:px-4" : "p-4"
          )}
        >
          <div className="min-w-0">{brand}</div>
          <button
            type="button"
            className={pinButtonClassName}
            onClick={() => {
              setPinned((v) => {
                const next = !v;
                try {
                  window.localStorage.setItem(STORAGE_KEY, next ? "true" : "false");
                } catch {
                  // ignore
                }
                return next;
              });
            }}
            aria-label={pinned ? "Unpin sidebar" : "Pin sidebar"}
            title={pinned ? "Unpin sidebar" : "Pin sidebar"}
            style={{ position: "absolute", right: "0.75rem" }}
          >
            <IconPin className={pinned ? "h-4 w-4 text-signal-green" : "h-4 w-4"} filled={pinned} />
          </button>
        </div>
        {nav}
      </aside>
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}

