/**
 * Server-only data for the public landing page. No auth required.
 */
import { createServiceClient } from "@/lib/supabase/service";
import { formatFundingRoundType, getLatestSignalLabel } from "@/lib/signal-engine/explanations";
import type { ScoreComponents } from "@/types/database";

export async function getLandingCompaniesCount(): Promise<number> {
  try {
    const supabase = createServiceClient();
    const { count } = await supabase.from("companies").select("id", { count: "exact", head: true });
    return count ?? 0;
  } catch {
    return 0;
  }
}

/** Count signals with occurred_at today (UTC). */
export async function getSignalsTodayCount(): Promise<number> {
  try {
    const supabase = createServiceClient();
    const today = new Date().toISOString().slice(0, 10);
    const { count } = await supabase
      .from("signals")
      .select("id", { count: "exact", head: true })
      .gte("occurred_at", `${today}T00:00:00.000Z`)
      .lt("occurred_at", `${today}T23:59:59.999Z`);
    return count ?? 0;
  } catch {
    return 0;
  }
}

export type LandingCompanyPreview = {
  id: string;
  name: string;
  domain: string | null;
  website: string | null;
  score: number;
  last_calculated_at: string;
  score_components_json: ScoreComponents;
  latest_signal_label: string;
  insight_line: string;
};

/** Top companies by score, most recently updated first (for dashboard preview). */
export async function getTopScoreCompanies(limit = 5): Promise<LandingCompanyPreview[]> {
  try {
    const supabase = createServiceClient();
    const { data: scoreRows } = await supabase
      .from("company_scores")
      .select("company_id, score, last_calculated_at, score_components_json")
      .order("score", { ascending: false })
      .order("last_calculated_at", { ascending: false })
      .limit(limit);
    if (!scoreRows?.length) return [];
    const ids = scoreRows.map((r) => r.company_id);
    const { data: companies } = await supabase
      .from("companies")
      .select("id, name, domain, website")
      .in("id", ids);
    const companyMap = new Map((companies ?? []).map((c) => [c.id, c]));
    const out: LandingCompanyPreview[] = [];
    for (const row of scoreRows) {
      const c = companyMap.get(row.company_id);
      if (!c) continue;
      const comp = (row.score_components_json ?? {}) as ScoreComponents;
      const latest_signal_label = getLatestSignalLabel(comp);
      let insight_line = "";
      const jobs = comp.job_posts ?? 0;
      if (comp.hiring_spike && jobs > 0) insight_line = `${jobs} roles posted this week`;
      else if (comp.hiring_spike) insight_line = "Multiple new roles in short window";
      else if (comp.funding_event) insight_line = `${formatFundingRoundType(comp.funding_round_type as string | null | undefined) ?? "Funding"} announced`;
      else if (jobs > 0) insight_line = `${jobs} role${jobs !== 1 ? "s" : ""} posted recently`;
      else if (comp.ft1000_listed) insight_line = "FT1000 ranked";
      else insight_line = "Activity detected";
      out.push({
        id: c.id,
        name: c.name,
        domain: c.domain,
        website: c.website,
        score: row.score,
        last_calculated_at: row.last_calculated_at,
        score_components_json: comp,
        latest_signal_label,
        insight_line,
      });
    }
    return out;
  } catch {
    return [];
  }
}

/** Top 3 companies by rank for "Latest Signals Detected" preview. */
export async function getLatestSignalCompanies(limit = 3): Promise<LandingCompanyPreview[]> {
  try {
    const supabase = createServiceClient();
    const { data: scoreRows } = await supabase
      .from("company_scores")
      .select("company_id, score, last_calculated_at, score_components_json")
      .not("rank_position", "is", null)
      .order("rank_position", { ascending: true })
      .limit(limit);
    if (!scoreRows?.length) return [];
    const ids = scoreRows.map((r) => r.company_id);
    const { data: companies } = await supabase
      .from("companies")
      .select("id, name, domain, website")
      .in("id", ids);
    const companyMap = new Map((companies ?? []).map((c) => [c.id, c]));
    const out: LandingCompanyPreview[] = [];
    for (const row of scoreRows) {
      const c = companyMap.get(row.company_id);
      if (!c) continue;
      const comp = (row.score_components_json ?? {}) as ScoreComponents;
      const latest_signal_label = getLatestSignalLabel(comp);
      let insight_line = "";
      const jobs = comp.job_posts ?? 0;
      if (comp.hiring_spike && jobs > 0) insight_line = `${jobs} roles posted this week`;
      else if (comp.hiring_spike) insight_line = "Multiple new roles in short window";
      else if (comp.funding_event) insight_line = `${formatFundingRoundType(comp.funding_round_type as string | null | undefined) ?? "Funding"} announced`;
      else if (jobs > 0) insight_line = `${jobs} role${jobs !== 1 ? "s" : ""} posted recently`;
      else if (comp.ft1000_listed) insight_line = "FT1000 ranked";
      else insight_line = "Activity detected";
      out.push({
        id: c.id,
        name: c.name,
        domain: c.domain,
        website: c.website,
        score: row.score,
        last_calculated_at: row.last_calculated_at,
        score_components_json: comp,
        latest_signal_label,
        insight_line,
      });
    }
    return out;
  } catch {
    return [];
  }
}

/** One row for LinkedIn / newsletter “top N by rank” posts. */
export type WeeklyRankRow = {
  rank: number;
  name: string;
  /** Display score 0–10 to match app UI */
  scoreOutOf10: string;
  signal: string;
  insight: string;
};

/**
 * Top N companies by global signal rank (rank_position ascending).
 * Run scoring worker first so ranks are fresh.
 */
export async function getTopRankedForWeeklyPost(limit = 25): Promise<WeeklyRankRow[]> {
  try {
    const supabase = createServiceClient();
    const { data: scoreRows } = await supabase
      .from("company_scores")
      .select("company_id, score, rank_position, score_components_json")
      .not("rank_position", "is", null)
      .order("rank_position", { ascending: true })
      .limit(limit);
    if (!scoreRows?.length) return [];
    const ids = scoreRows.map((r) => r.company_id);
    const { data: companies } = await supabase
      .from("companies")
      .select("id, name")
      .in("id", ids);
    const companyMap = new Map((companies ?? []).map((c) => [c.id, c.name ?? ""]));
    const out: WeeklyRankRow[] = [];
    for (const row of scoreRows) {
      const name = companyMap.get(row.company_id);
      if (!name) continue;
      const rank = typeof row.rank_position === "number" ? row.rank_position : out.length + 1;
      const comp = (row.score_components_json ?? {}) as ScoreComponents;
      const signal = getLatestSignalLabel(comp);
      const jobs = comp.job_posts ?? 0;
      let insight = "";
      if (comp.hiring_spike && jobs > 0) insight = `${jobs} roles posted this week`;
      else if (comp.hiring_spike) insight = "Multiple new roles in a short window";
      else if (comp.funding_event)
        insight = `${formatFundingRoundType(comp.funding_round_type as string | null | undefined) ?? "Funding"} signal`;
      else if (jobs > 0) insight = `${jobs} role${jobs !== 1 ? "s" : ""} posted recently`;
      else if (comp.ft1000_listed) insight = "FT1000 listed";
      else insight = "Hiring / growth activity";
      out.push({
        rank,
        name,
        scoreOutOf10: (row.score / 10).toFixed(1),
        signal,
        insight,
      });
    }
    return out;
  } catch {
    return [];
  }
}

/** For radar labels: recent signals (company name + signal type). */
export type RadarSignalLabel = { companyName: string; signalType: string };

export type CronRunSummary = {
  jobName: string;
  triggerSource: string;
  status: string;
  deploymentHost: string | null;
  startedAt: string;
  finishedAt: string | null;
  details: Record<string, unknown>;
};

export async function getLatestCronRuns(): Promise<CronRunSummary[]> {
  try {
    const supabase = createServiceClient();
    const { data } = await supabase
      .from("cron_runs")
      .select("job_name, trigger_source, status, deployment_host, started_at, finished_at, details_json")
      .order("started_at", { ascending: false })
      .limit(6);

    return (data ?? []).map((row) => ({
      jobName: row.job_name,
      triggerSource: row.trigger_source,
      status: row.status,
      deploymentHost: row.deployment_host ?? null,
      startedAt: row.started_at,
      finishedAt: row.finished_at ?? null,
      details: (row.details_json ?? {}) as Record<string, unknown>,
    }));
  } catch {
    return [];
  }
}

export async function getRadarSignalLabels(limit = 6): Promise<RadarSignalLabel[]> {
  const companies = await getLatestSignalCompanies(limit);
  return companies.map((c) => ({
    companyName: c.name,
    signalType: c.latest_signal_label.toLowerCase(),
  }));
}
