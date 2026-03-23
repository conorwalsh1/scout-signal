"use client";

import Link from "next/link";

function IconLock({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

/**
 * Inline preview teaser for free-tier users.
 * Shows truncated text with a gradient fade and a small upgrade nudge.
 */
export function ProPreviewInline({
  text,
  maxChars = 45,
}: {
  text: string;
  maxChars?: number;
}) {
  const preview = text.length > maxChars ? text.slice(0, maxChars) : text;
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="bg-gradient-to-r from-foreground to-transparent bg-clip-text text-transparent">
        {preview}…
      </span>
      <Link
        href="/pricing"
        onClick={(e) => e.stopPropagation()}
        className="inline-flex shrink-0 items-center gap-1 rounded border border-signal-green/30 bg-signal-green/10 px-1.5 py-0.5 text-[10px] font-semibold text-signal-green hover:bg-signal-green/20 transition-colors"
      >
        <IconLock className="h-2.5 w-2.5" />
        Pro
      </Link>
    </span>
  );
}

/**
 * Block-level preview lock for sections on the detail page.
 * Renders children behind a blur with an upgrade overlay.
 */
export function ProPreviewBlock({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative">
      <div className="pointer-events-none select-none blur-[6px] opacity-50" aria-hidden="true">
        {children}
      </div>
      <div className="absolute inset-0 flex items-center justify-center">
        <Link
          href="/pricing"
          className="inline-flex items-center gap-2 rounded-lg border border-signal-green/40 bg-card/95 px-4 py-2.5 text-sm font-medium text-foreground shadow-lg backdrop-blur-sm transition-colors hover:border-signal-green/60 hover:bg-card"
        >
          <IconLock className="h-4 w-4 text-signal-green" />
          Upgrade to Founder Pro
        </Link>
      </div>
    </div>
  );
}
