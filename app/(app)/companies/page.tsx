import { getCompaniesList, getSavedCompanyIds, getCompaniesCount } from "@/app/(app)/dashboard/data";
import { BADGES, PRO_ONLY_BADGES } from "@/lib/badges";
import type { BadgeId } from "@/lib/badges";
import { CompaniesList } from "./companies-list";

interface CompaniesPageProps {
  searchParams?: Promise<{ q?: string; sort?: string; badge?: string }> | { q?: string; sort?: string; badge?: string };
}

export default async function CompaniesPage(props: CompaniesPageProps) {
  const searchParams = props.searchParams instanceof Promise
    ? await props.searchParams
    : props.searchParams ?? {};
  const q = searchParams.q?.trim() ?? "";
  const sortParam = searchParams.sort;
  const sort = sortParam === "score" || sortParam === "updated" || sortParam === "rank" ? sortParam : "rank";
  const badgeParam = searchParams.badge?.trim();
  const badge = badgeParam && BADGES.some((b) => b.id === badgeParam) ? (badgeParam as BadgeId) : undefined;

  const [{ companies, plan }, savedIds, companiesCount] = await Promise.all([
    getCompaniesList({ search: q || undefined, sort, badge }),
    getSavedCompanyIds(),
    getCompaniesCount(),
  ]);
  const visibleBadges =
    plan === "pro" ? BADGES : BADGES.filter((b) => !PRO_ONLY_BADGES.includes(b.id));

  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground-heading mb-4">Companies</h1>
      <p className="text-secondary mb-6">
        Searchable list of surfaced companies. Click a company for details or save it to your list.
      </p>
      <form
        method="get"
        action="/companies"
        className="flex flex-wrap items-center gap-3 border-b border-border pb-4 mb-4"
      >
        <input
          type="search"
          name="q"
          placeholder="Search companies..."
          defaultValue={q}
          className="rounded-md border border-border bg-sidebar px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground w-48 focus:outline-none focus:ring-2 focus:ring-data-blue"
          aria-label="Search companies"
        />
        <select
          name="badge"
          defaultValue={badge ?? ""}
          className="rounded-md border border-border bg-sidebar px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-data-blue"
          aria-label="Filter by badge"
        >
          <option value="">All badges</option>
          {visibleBadges.map((b) => (
            <option key={b.id} value={b.id}>{b.label}</option>
          ))}
        </select>
        <select
          name="sort"
          defaultValue={sort}
          className="rounded-md border border-border bg-sidebar px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-data-blue"
          aria-label="Sort by"
        >
          <option value="rank">Sort by rank (1, 2, 3…)</option>
          <option value="score">Sort by score</option>
          <option value="updated">Sort by updated</option>
        </select>
        <button
          type="submit"
          className="rounded-md bg-foreground px-4 py-2 text-sm text-background font-medium hover:opacity-90"
        >
          Apply
        </button>
      </form>
      <CompaniesList
        initialCompanies={companies}
        savedIds={savedIds}
        plan={plan}
        hasSearchOrSort={!!q || !!badge || sort !== "rank"}
        totalRankedCount={companiesCount}
      />
    </div>
  );
}
