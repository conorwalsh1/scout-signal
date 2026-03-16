"use client";

import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { BADGES, BADGE_STYLES, type BadgeId } from "@/lib/badges";

const BADGE_INLINE_STYLES: Record<
  BadgeId,
  { background: string; borderColor: string; color: string; boxShadow?: string }
> = {
  hiring_surge: {
    background: "linear-gradient(90deg, rgba(16,185,129,0.24), rgba(16,185,129,0.14), rgba(16,185,129,0.28))",
    borderColor: "rgba(52,211,153,0.9)",
    color: "rgba(236,253,245,0.95)",
    boxShadow: "0 0 18px rgba(16,185,129,0.38)",
  },
  engineering_buildout: {
    background: "linear-gradient(90deg, rgba(56,189,248,0.22), rgba(56,189,248,0.12), rgba(56,189,248,0.26))",
    borderColor: "rgba(125,211,252,0.85)",
    color: "rgba(240,249,255,0.95)",
    boxShadow: "0 0 18px rgba(56,189,248,0.35)",
  },
  venture_backed: {
    background: "linear-gradient(90deg, rgba(245,158,11,0.24), rgba(245,158,11,0.12), rgba(245,158,11,0.28))",
    borderColor: "rgba(252,211,77,0.9)",
    color: "rgba(255,251,235,0.95)",
    boxShadow: "0 0 18px rgba(245,158,11,0.35)",
  },
  ft1000: {
    background: "linear-gradient(90deg, rgba(30,41,59,0.9), rgba(15,23,42,0.85))",
    borderColor: "rgba(148,163,184,0.75)",
    color: "rgba(226,232,240,0.92)",
    boxShadow: "0 0 14px rgba(148,163,184,0.22)",
  },
  ai_hiring: {
    background: "linear-gradient(90deg, rgba(217,70,239,0.22), rgba(168,85,247,0.14), rgba(217,70,239,0.26))",
    borderColor: "rgba(240,171,252,0.9)",
    color: "rgba(253,244,255,0.95)",
    boxShadow: "0 0 22px rgba(217,70,239,0.45)",
  },
  leadership_hire: {
    background: "linear-gradient(90deg, rgba(244,114,182,0.22), rgba(251,113,133,0.14), rgba(244,114,182,0.26))",
    borderColor: "rgba(251,113,133,0.9)",
    color: "rgba(255,241,242,0.95)",
    boxShadow: "0 0 26px rgba(244,114,182,0.55)",
  },
  expansion_mode: {
    background: "linear-gradient(90deg, rgba(163,230,53,0.18), rgba(52,211,153,0.12), rgba(163,230,53,0.22))",
    borderColor: "rgba(190,242,100,0.85)",
    color: "rgba(247,254,231,0.92)",
    boxShadow: "0 0 18px rgba(163,230,53,0.3)",
  },
  hypergrowth: {
    background: "linear-gradient(90deg, rgba(16,185,129,0.34), rgba(16,185,129,0.24), rgba(16,185,129,0.4))",
    borderColor: "rgba(52,211,153,0.95)",
    color: "rgba(236,253,245,0.98)",
    boxShadow: "0 0 28px rgba(16,185,129,0.6)",
  },
};

function LeadershipFlameIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-[1.6em] w-[1.6em] shrink-0"
    >
      <defs>
        <linearGradient id="leadership-flame" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fed7e2" />
          <stop offset="50%" stopColor="#fb7185" />
          <stop offset="100%" stopColor="#f97316" />
        </linearGradient>
      </defs>
      <path
        d="M12 3c.5 2.5-1 3.5-1 5.5 0 1.2.7 2.1 1.6 2.7.6-1.1 1.4-2.4 1.4-3.9 0-1-.3-1.9-.8-2.8 1.9 1 3.8 3.3 3.8 6.1 0 3.3-2.4 5.9-5.9 5.9-3 0-5.5-2.2-5.5-5.4 0-2.5 1.4-4.2 3-5.5-.2.7-.3 1.3-.3 1.9 0 1.5.6 2.6 1.4 3.5.3-.9.7-1.8.7-2.8C11.1 6.4 11.4 4.6 12 3z"
        fill="url(#leadership-flame)"
      />
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
  const label = BADGES.find((b) => b.id === badgeId)?.label ?? badgeId.replace(/_/g, " ");
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
        "inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-semibold uppercase tracking-wide transition-all duration-150 hover:-translate-y-0.5 hover:shadow-signal-glow hover:border-signal-green/60",
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
          <LeadershipFlameIcon />
          <span>{label}</span>
          <LeadershipFlameIcon />
        </>
      ) : (
        label
      )}
    </span>
  );
}
