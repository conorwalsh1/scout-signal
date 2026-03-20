import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { isAdmin } from "@/lib/auth/admin";
import { isStaleTimestamp } from "@/lib/beta-readiness";
import { getLatestCronRuns } from "@/lib/landing-data";

type SourceHealthRow = {
  source_type: string;
  active: boolean;
  last_status: string | null;
  last_checked_at: string | null;
  last_result_count: number | null;
};

type WeakCompanyRow = {
  id: string;
  name: string;
  website: string | null;
  domain: string | null;
  company_scores:
    | {
        score: number;
        last_calculated_at: string;
        score_components_json: Record<string, unknown>;
      }
    | Array<{
        score: number;
        last_calculated_at: string;
        score_components_json: Record<string, unknown>;
      }>
    | null;
};

export default async function AdminLaunchReadinessPage() {
  const supabase = await createClient();
  const service = createServiceClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!isAdmin(user?.email ?? null)) {
    notFound();
  }

  const [
    { count: companyCount },
    { count: completeWebCount },
    { data: scores },
    { data: sourceRows },
    { data: weakRows },
    cronRuns,
  ] =
    await Promise.all([
      service.from("companies").select("id", { count: "exact", head: true }),
      service.from("companies").select("id", { count: "exact", head: true }).not("website", "is", null).not("domain", "is", null),
      service.from("company_scores").select("company_id, last_calculated_at, score"),
      service.from("monitored_sources").select("source_type, active, last_status, last_checked_at, last_result_count").eq("active", true),
      service
        .from("companies")
        .select("id, name, website, domain, company_scores(score, last_calculated_at, score_components_json)")
        .order("updated_at", { ascending: false })
        .limit(25),
      getLatestCronRuns(),
    ]);

  const latestScoreRows = (scores ?? []) as Array<{ company_id: string; last_calculated_at: string; score: number }>;
  const staleScores = latestScoreRows.filter((row) => isStaleTimestamp(row.last_calculated_at, 24)).length;
  const topScores = latestScoreRows.filter((row) => row.score > 0).length;

  const sourceHealthRows = (sourceRows ?? []) as SourceHealthRow[];
  const healthySources = sourceHealthRows.filter((row) => row.last_status === "ok").length;
  const staleSources = sourceHealthRows.filter((row) => isStaleTimestamp(row.last_checked_at, 24)).length;
  const failingSources = sourceHealthRows.filter((row) => row.last_status === "error").length;
  const latestIngestRun = cronRuns.find((row) => row.jobName === "ingest" || row.jobName === "ingest_full");
  const latestProcessRun = cronRuns.find((row) => row.jobName === "process");
  const staleCronRuns = cronRuns.filter((row) => isStaleTimestamp(row.startedAt, 24)).length;

  const weakCompanies = ((weakRows ?? []) as WeakCompanyRow[]).filter((company) => {
    const rawScore = Array.isArray(company.company_scores) ? company.company_scores[0] : company.company_scores;
    const score = rawScore?.score ?? 0;
    const components = rawScore?.score_components_json ?? {};
    const hasSignals =
      ((components.job_posts as number) ?? 0) > 0 ||
      !!components.funding_event ||
      !!components.engineering_hiring ||
      !!components.ai_hiring ||
      !!components.leadership_hiring;
    return !(company.website && company.domain) || !hasSignals || score < 20;
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground-heading">Launch Readiness</h1>
          <p className="text-sm text-secondary">
            Beta checklist for reliability, data quality, and operational visibility.
          </p>
        </div>
        <div className="flex gap-3 text-sm">
          <Link href="/admin/source-registry" className="text-data-blue hover:underline">
            Source registry
          </Link>
          <Link href="/admin/logo-gaps" className="text-data-blue hover:underline">
            Logo gaps
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs uppercase tracking-wide text-secondary">Companies</p>
          <p className="mt-2 text-3xl font-bold text-foreground-heading">{companyCount ?? 0}</p>
          <p className="mt-1 text-xs text-secondary">{completeWebCount ?? 0} with website + domain</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs uppercase tracking-wide text-secondary">Scores</p>
          <p className="mt-2 text-3xl font-bold text-foreground-heading">{topScores}</p>
          <p className="mt-1 text-xs text-secondary">{staleScores} stale over 24h</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs uppercase tracking-wide text-secondary">Sources</p>
          <p className="mt-2 text-3xl font-bold text-foreground-heading">{healthySources}</p>
          <p className="mt-1 text-xs text-secondary">{failingSources} failing · {staleSources} stale</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs uppercase tracking-wide text-secondary">Weak companies</p>
          <p className="mt-2 text-3xl font-bold text-foreground-heading">{weakCompanies.length}</p>
          <p className="mt-1 text-xs text-secondary">recent rows needing cleanup</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs uppercase tracking-wide text-secondary">Latest ingest</p>
          <p className="mt-2 text-lg font-bold text-foreground-heading">
            {latestIngestRun ? latestIngestRun.status : "no heartbeat"}
          </p>
          <p className="mt-1 text-xs text-secondary">
            {latestIngestRun?.startedAt ? new Date(latestIngestRun.startedAt).toLocaleString("en-GB") : "Apply cron_runs SQL to start tracking"}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs uppercase tracking-wide text-secondary">Latest process</p>
          <p className="mt-2 text-lg font-bold text-foreground-heading">
            {latestProcessRun ? latestProcessRun.status : "no heartbeat"}
          </p>
          <p className="mt-1 text-xs text-secondary">
            {latestProcessRun?.startedAt ? new Date(latestProcessRun.startedAt).toLocaleString("en-GB") : "Apply cron_runs SQL to start tracking"}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs uppercase tracking-wide text-secondary">Cron visibility</p>
          <p className="mt-2 text-lg font-bold text-foreground-heading">{cronRuns.length}</p>
          <p className="mt-1 text-xs text-secondary">
            {cronRuns.length > 0 ? `${staleCronRuns} stale over 24h` : "No heartbeat rows yet"}
          </p>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card p-4">
        <p className="text-sm font-semibold text-foreground-heading">Launch checklist</p>
        <ul className="mt-3 space-y-2 text-sm text-secondary">
          <li>1. Run <code>npm run worker:all</code> and confirm source statuses are fresh.</li>
          <li>2. Spot-check the top 25 ranked companies for explanation quality and correct websites/logos.</li>
          <li>3. Review weak companies below and either enrich them or let the curation filter hide them.</li>
          <li>4. Check the source registry for failing or zero-result sources.</li>
        </ul>
      </div>

      <div className="rounded-lg border border-border overflow-hidden">
        <div className="border-b border-border bg-sidebar/50 px-4 py-3">
          <h2 className="font-semibold text-foreground-heading">Cron Heartbeats</h2>
          <p className="mt-1 text-xs text-secondary">
            Vercel cron should hit ingest at 08:00 UTC and process at 10:00 UTC. GitHub Actions backup workflows are scheduled for 08:05 UTC and 10:05 UTC.
          </p>
        </div>
        <div className="overflow-x-auto">
          {cronRuns.length > 0 ? (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-sidebar/30">
                  <th className="px-4 py-3 text-left font-semibold text-secondary">Job</th>
                  <th className="px-4 py-3 text-left font-semibold text-secondary">Trigger</th>
                  <th className="px-4 py-3 text-left font-semibold text-secondary">Status</th>
                  <th className="px-4 py-3 text-left font-semibold text-secondary">Started</th>
                  <th className="px-4 py-3 text-left font-semibold text-secondary">Finished</th>
                  <th className="px-4 py-3 text-left font-semibold text-secondary">Host</th>
                </tr>
              </thead>
              <tbody>
                {cronRuns.map((run) => (
                  <tr key={`${run.jobName}-${run.startedAt}`} className="border-b border-border">
                    <td className="px-4 py-3 text-secondary">{run.jobName}</td>
                    <td className="px-4 py-3 text-secondary">{run.triggerSource}</td>
                    <td className="px-4 py-3 text-secondary">{run.status}</td>
                    <td className="px-4 py-3 text-secondary">{new Date(run.startedAt).toLocaleString("en-GB")}</td>
                    <td className="px-4 py-3 text-secondary">
                      {run.finishedAt ? new Date(run.finishedAt).toLocaleString("en-GB") : "—"}
                    </td>
                    <td className="px-4 py-3 text-secondary">{run.deploymentHost ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="px-4 py-6 text-sm text-secondary">
              No cron heartbeat rows yet. Run the `cron_runs` SQL in Supabase, then manual or scheduled runs will start appearing here.
            </div>
          )}
        </div>
      </div>

      <div className="rounded-lg border border-border overflow-hidden">
        <div className="border-b border-border bg-sidebar/50 px-4 py-3">
          <h2 className="font-semibold text-foreground-heading">Recent Weak Companies</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-sidebar/30">
                <th className="px-4 py-3 text-left font-semibold text-secondary">Company</th>
                <th className="px-4 py-3 text-left font-semibold text-secondary">Web</th>
                <th className="px-4 py-3 text-left font-semibold text-secondary">Score</th>
                <th className="px-4 py-3 text-left font-semibold text-secondary">Last scored</th>
              </tr>
            </thead>
            <tbody>
              {weakCompanies.slice(0, 15).map((company) => {
                const rawScore = Array.isArray(company.company_scores) ? company.company_scores[0] : company.company_scores;
                return (
                  <tr key={company.id} className="border-b border-border">
                    <td className="px-4 py-3">
                      <Link href={`/companies/${company.id}`} className="font-medium text-foreground hover:text-signal-green">
                        {company.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-secondary">
                      {company.website && company.domain ? "complete" : "needs enrichment"}
                    </td>
                    <td className="px-4 py-3 text-secondary">{rawScore?.score ?? 0}</td>
                    <td className="px-4 py-3 text-secondary">
                      {rawScore?.last_calculated_at ? new Date(rawScore.last_calculated_at).toLocaleString("en-GB") : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
