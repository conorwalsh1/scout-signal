import Link from "next/link";
import { getCompaniesList, getSavedCompanyIds, getCompaniesCount, getRecentSignalHeadlines } from "./data";
import { DashboardFeed } from "./dashboard-feed";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/auth/admin";

function hasHiringSignals(score_components_json: Record<string, unknown>): boolean {
  return (
    ((score_components_json?.job_posts as number) ?? 0) > 0 ||
    !!score_components_json?.hiring_spike ||
    !!score_components_json?.engineering_hiring ||
    !!score_components_json?.ai_hiring ||
    !!score_components_json?.remote_hiring ||
    !!score_components_json?.new_department_hiring ||
    !!score_components_json?.leadership_hiring ||
    !!score_components_json?.funding_event
  );
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const adminUser = isAdmin(user?.email ?? null);

  const [{ companies: feed, plan }, savedIds, companiesCount, recentHeadlines] = await Promise.all([
    getCompaniesList({ sort: "rank" }),
    getSavedCompanyIds(),
    getCompaniesCount(),
    getRecentSignalHeadlines(5),
  ]);
  const displayCount = companiesCount != null ? companiesCount.toLocaleString() : "—";
  const anyHiringSignals = feed.some((c) => hasHiringSignals(c.score_components_json ?? {}));
  const feedLimitReached = plan !== "pro" && feed.length >= 20;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-foreground-heading">Dashboard</h1>
        <p className="text-sm">
          <span className="text-secondary">Companies tracked: </span>
          <span className="font-semibold text-signal-green">{displayCount}</span>
        </p>
      </div>
      <p className="text-secondary">
        Companies ranked by hiring signal score. Save companies to revisit later.
      </p>
      {adminUser && (
        <div className="rounded-lg border border-border bg-card/60 px-4 py-3 text-sm">
          <span className="text-secondary">Launch ops: </span>
          <Link href="/admin/launch-readiness" className="font-medium text-data-blue hover:underline">
            Open launch-readiness dashboard
          </Link>
        </div>
      )}
      {feed.length > 0 && !anyHiringSignals && (
        <div
          className="rounded-lg border p-4"
          style={{
            backgroundColor: "rgba(56, 189, 248, 0.08)",
            borderColor: "rgba(56, 189, 248, 0.3)",
          }}
        >
          <p className="text-sm font-medium text-foreground">
            No hiring signals detected yet
          </p>
          <p className="mt-1 text-sm text-secondary">
            Run the pipeline to fetch job posts (Greenhouse, career pages) and funding news, then generate signals and scores. From the project root:
          </p>
          <code className="mt-2 block rounded bg-sidebar px-3 py-2 text-xs text-foreground font-mono">
            npm run worker:all
          </code>
          <p className="mt-2 text-xs text-muted-foreground">
            Or trigger it via <strong>GET /api/cron/ingest</strong> (with <code>Authorization: Bearer CRON_SECRET</code>). On Vercel, the cron runs every 45 minutes automatically.
          </p>
        </div>
      )}
      {plan !== "pro" && feedLimitReached && (
        <div
          className="mb-4 rounded-lg border p-4 flex items-center justify-between gap-4"
          style={{
            backgroundColor: "rgba(245, 158, 11, 0.08)",
            borderColor: "rgba(245, 158, 11, 0.35)",
          }}
        >
          <p className="text-sm text-[#FDE68A]">
            You&apos;re viewing a limited feed. {plan === "free" ? "Choose a paid plan" : "Upgrade to Pro"} for broader access.
          </p>
          <Link
            href="/pricing"
            className="inline-flex h-9 items-center rounded-md bg-amber-accent px-3 text-sm font-medium text-sidebar transition-opacity hover:opacity-90"
          >
            {plan === "free" ? "View plans" : "Upgrade to Pro"}
          </Link>
        </div>
      )}
      <DashboardFeed
        initialFeed={feed}
        savedIds={savedIds}
        plan={plan}
        totalRankedCount={companiesCount}
        recentHeadlines={recentHeadlines}
      />
    </div>
  );
}
