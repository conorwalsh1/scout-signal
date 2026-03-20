"use client";

import Image from "next/image";
import Link from "next/link";

/**
 * Sidebar brand: text-only \"Signal Scout\" with a subtle green radar pulse
 * sitting just to the left of the wordmark.
 */
export function SidebarBrand() {
  return (
    <Link
      href="/dashboard"
      className="flex items-center justify-center gap-2 font-semibold text-foreground-heading no-underline-hover w-full rounded-md px-0 py-2 group-hover/sidebar:justify-start group-focus-within/sidebar:justify-start group-data-[pinned=true]/sidebar:justify-start group-hover/sidebar:px-3 group-focus-within/sidebar:px-3 group-data-[pinned=true]/sidebar:px-3 hover:bg-muted"
      aria-label="Signal Scout – Dashboard"
    >
      <div className="relative h-4 w-4 flex items-center justify-center overflow-visible">
        {/* Keep a subtle pulse behind the mark for continuity */}
        <div
          className="pointer-events-none absolute inset-0 rounded-full border border-[var(--signal-green)] opacity-0 blur-[3px]"
          style={{
            animation: "radar-pulse 5s ease-out infinite",
            borderColor: "var(--signal-green)",
            boxShadow: "0 0 10px 3px rgba(34, 197, 94, 0.24)",
          }}
        />
        <Image
          src="/brand-mark.png"
          alt="Signal Scout"
          width={16}
          height={16}
          className="relative h-4 w-4 object-contain"
          priority
        />
      </div>
      <span className="text-sm tracking-wide hidden group-hover/sidebar:inline group-focus-within/sidebar:inline group-data-[pinned=true]/sidebar:inline">
        Signal Scout
      </span>
    </Link>
  );
}
