/**
 * Server-only data for the public landing page. No auth required.
 */
import { createServiceClient } from "@/lib/supabase/service";
import { getLatestSignalLabel } from "@/lib/signal-engine/explanations";
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
      else if (comp.funding_event) insight_line = "Series A announced";
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
      else if (comp.funding_event) insight_line = "Series A announced";
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

/** For radar labels: recent signals (company name + signal type). */
export type RadarSignalLabel = { companyName: string; signalType: string };

export async function getRadarSignalLabels(limit = 6): Promise<RadarSignalLabel[]> {
  const companies = await getLatestSignalCompanies(limit);
  return companies.map((c) => ({
    companyName: c.name,
    signalType: c.latest_signal_label.toLowerCase(),
  }));
}
