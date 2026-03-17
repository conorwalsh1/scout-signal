"use client";

import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { BADGES, BADGE_STYLES, type BadgeId } from "@/lib/badges";

// Goal: institutional / expensive / quiet confidence (no neon halo).
const BADGE_INLINE_STYLES: Record<
  BadgeId,
  { background: string; borderColor: string; color: string; boxShadow?: string }
> = {
  hiring_surge: {
    background: "linear-gradient(90deg, rgba(16,185,129,0.24), rgba(16,185,129,0.14), rgba(16,185,129,0.28))",
    borderColor: "rgba(52,211,153,0.9)",
    color: "rgba(236,253,245,0.95)",
    boxShadow: "0 0 10px rgba(16,185,129,0.18)",
  },
  engineering_buildout: {
    background: "linear-gradient(90deg, rgba(56,189,248,0.22), rgba(56,189,248,0.12), rgba(56,189,248,0.26))",
    borderColor: "rgba(125,211,252,0.85)",
    color: "rgba(240,249,255,0.95)",
    boxShadow: "0 0 10px rgba(56,189,248,0.16)",
  },
  venture_backed: {
    background: "linear-gradient(90deg, rgba(245,158,11,0.24), rgba(245,158,11,0.12), rgba(245,158,11,0.28))",
    borderColor: "rgba(252,211,77,0.9)",
    color: "rgba(255,251,235,0.95)",
    boxShadow: "0 0 10px rgba(245,158,11,0.16)",
  },
  ft1000: {
    background: "linear-gradient(90deg, rgba(30,41,59,0.9), rgba(15,23,42,0.85))",
    borderColor: "rgba(148,163,184,0.75)",
    color: "rgba(226,232,240,0.92)",
    boxShadow: "0 0 10px rgba(148,163,184,0.12)",
  },
  ai_hiring: {
    background: "linear-gradient(90deg, rgba(217,70,239,0.22), rgba(168,85,247,0.14), rgba(217,70,239,0.26))",
    borderColor: "rgba(240,171,252,0.9)",
    color: "rgba(253,244,255,0.95)",
    boxShadow: "0 0 12px rgba(217,70,239,0.18)",
  },
  leadership_hire: {
    // Premium "Exec signal" treatment: subtle warm outline, no glow.
    background: "linear-gradient(90deg, rgba(17,24,39,0.9), rgba(17,24,39,0.75))",
    borderColor: "rgba(245, 158, 11, 0.65)",
    color: "rgba(255, 251, 235, 0.92)",
  },
  expansion_mode: {
    background: "linear-gradient(90deg, rgba(163,230,53,0.18), rgba(52,211,153,0.12), rgba(163,230,53,0.22))",
    borderColor: "rgba(190,242,100,0.85)",
    color: "rgba(247,254,231,0.92)",
    boxShadow: "0 0 10px rgba(163,230,53,0.14)",
  },
  hypergrowth: {
    background: "linear-gradient(90deg, rgba(16,185,129,0.34), rgba(16,185,129,0.24), rgba(16,185,129,0.4))",
    borderColor: "rgba(52,211,153,0.95)",
    color: "rgba(236,253,245,0.98)",
    boxShadow: "0 0 12px rgba(16,185,129,0.2)",
  },
};

function ExecSignalIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-3.5 w-3.5 shrink-0"
    >
      <path d="M12 2l10 18H2L12 2z" fill="currentColor" opacity="0.85" />
      <path d="M12 8v5" stroke="var(--amber-accent,#F59E0B)" strokeWidth="2" strokeLinecap="round" />
      <circle cx="12" cy="16.5" r="1" fill="var(--amber-accent,#F59E0B)" />
    </svg>
  );
}

export function CompanyBadge({
  badgeId,
  className,
}: {
  badgeId: BadgeId;
  className?: string;
}) {
  const router = useRouter();
  const label =
    badgeId === "leadership_hire"
      ? "Exec signal"
      : BADGES.find((b) => b.id === badgeId)?.label ?? badgeId.replace(/_/g, " ");
  const styleClass = BADGE_STYLES[badgeId] ?? "bg-muted/80 text-secondary border border-border";
  const inline = BADGE_INLINE_STYLES[badgeId];

  const handleClick: React.MouseEventHandler<HTMLSpanElement> = (e) => {
    e.preventDefault();
    e.stopPropagation();
    router.push(`/companies?badge=${badgeId}&sort=rank`);
  };

  const handleKeyDown: React.KeyboardEventHandler<HTMLSpanElement> = (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      e.stopPropagation();
      router.push(`/companies?badge=${badgeId}&sort=rank`);
    }
  };

  return (
    <span
      className={cn(
        // Chip-like, quieter. Keep hover lift small, remove big neon glow.
        "inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-semibold uppercase tracking-wide transition-all duration-150 hover:-translate-y-[1px]",
        styleClass,
        className
      )}
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      style={
        inline
          ? {
              background: inline.background,
              borderColor: inline.borderColor,
              color: inline.color,
              boxShadow: inline.boxShadow,
            }
          : undefined
      }
    >
      {badgeId === "leadership_hire" ? (
        <>
          <ExecSignalIcon />
          <span>{label}</span>
        </>
      ) : (
        label
      )}
    </span>
  );
}
