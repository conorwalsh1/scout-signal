"use client";

import { cn } from "@/lib/utils";
import { BADGES, PRO_ONLY_BADGES } from "@/lib/badges";
import type { Plan } from "@/types/database";

interface FilterBarProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  signalTypeFilter: string;
  onSignalTypeChange: (value: string) => void;
  badgeFilter?: string;
  onBadgeChange?: (value: string) => void;
  sort?: string;
  onSortChange?: (value: string) => void;
  plan?: Plan;
  className?: string;
}

export function FilterBar({
  searchQuery,
  onSearchChange,
  signalTypeFilter,
  onSignalTypeChange,
  badgeFilter = "",
  onBadgeChange,
  sort = "rank",
  onSortChange,
  plan = "free",
  className,
}: FilterBarProps) {
  const visibleBadges =
    plan === "pro" ? BADGES : BADGES.filter((b) => !PRO_ONLY_BADGES.includes(b.id));
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-3 border-b border-border pb-4",
        className
      )}
    >
      <input
        type="search"
        placeholder="Search companies..."
        value={searchQuery}
        onChange={(e) => onSearchChange(e.target.value)}
        className="min-w-[12rem] rounded-md border border-border bg-sidebar px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-data-blue"
        aria-label="Search companies"
      />
      <select
        value={signalTypeFilter}
        onChange={(e) => onSignalTypeChange(e.target.value)}
        className="rounded-md border border-border bg-sidebar px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-data-blue"
        aria-label="Filter by signal type"
      >
        <option value="">All signals</option>
        <option value="job_post">Job posting</option>
        <option value="hiring_spike">Hiring spike</option>
        <option value="engineering_hiring">Engineering hiring</option>
        <option value="ai_hiring">AI hiring</option>
        <option value="remote_hiring">Remote or hybrid hiring</option>
        <option value="new_department_hiring">New department hiring</option>
        <option value="leadership_hiring">Leadership hiring</option>
        <option value="funding_event">Funding event</option>
      </select>
      {onBadgeChange && (
        <select
          value={badgeFilter}
          onChange={(e) => onBadgeChange(e.target.value)}
          className="rounded-md border border-border bg-sidebar px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-data-blue"
          aria-label="Filter by badge"
        >
          <option value="">All badges</option>
          {visibleBadges.map((b) => (
            <option key={b.id} value={b.id}>
              {b.label}
            </option>
          ))}
        </select>
      )}
      {onSortChange && (
        <select
          value={sort}
          onChange={(e) => onSortChange(e.target.value)}
          className="rounded-md border border-border bg-sidebar px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-data-blue"
          aria-label="Sort by"
        >
          <option value="rank">Sort by rank (1, 2, 3…)</option>
          <option value="score">Sort by score</option>
          <option value="updated">Sort by updated</option>
        </select>
      )}
    </div>
  );
}
