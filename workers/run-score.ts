/**
 * Score worker: recalculate company_scores from recent signals (last 30 days).
 * Run after run-signals. Run with: npm run worker:score
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { createServiceClient } from "@/lib/supabase/service";
import { calculateScore } from "@/lib/scoring-engine/calculate";
import {
  getDepartmentsFromMetadata,
  getLeadershipRolesFromMetadata,
  getNumericMetadata,
} from "@/lib/job-intelligence";
import type { ScoreComponents } from "@/types/database";

const WINDOW_DAYS = 30;

function getFt1000Baseline(rank: number | null | undefined): number {
  if (!rank || rank < 1) return 0;
  return Math.max(5, 30 - Math.floor((rank - 1) / 40));
}

async function fetchAllRows<T>(
  fetchPage: (from: number, to: number) => Promise<T[]>
): Promise<T[]> {
  const pageSize = 1000;
  const rows: T[] = [];

  for (let from = 0; ; from += pageSize) {
    const batch = await fetchPage(from, from + pageSize - 1);
    rows.push(...batch);
    if (batch.length < pageSize) break;
  }

  return rows;
}

export async function run() {
  const supabase = createServiceClient();
  const since = new Date();
  since.setDate(since.getDate() - WINDOW_DAYS);
  const sinceIso = since.toISOString();

  const existingScores = await fetchAllRows(async (from, to) => {
    const { data, error } = await supabase
      .from("company_scores")
      .select("company_id, rank_position")
      .range(from, to);
    if (error) throw error;
    return data ?? [];
  });

  const existingRanks = new Map<string, number | null>();
  for (const row of existingScores) {
    existingRanks.set(
      row.company_id,
      typeof row.rank_position === "number" ? row.rank_position : null
    );
  }

  const signals = await fetchAllRows(async (from, to) => {
    const { data, error } = await supabase
      .from("signals")
      .select("company_id, signal_type, weight, occurred_at, confidence")
      .gte("occurred_at", sinceIso)
      .range(from, to);
    if (error) throw error;
    return data ?? [];
  });

  const recentEvents = await fetchAllRows(async (from, to) => {
    const { data, error } = await supabase
      .from("events")
      .select("company_id, event_type, metadata_json, detected_at, source_type")
      .eq("event_type", "job_post_detected")
      .gte("detected_at", sinceIso)
      .not("company_id", "is", null)
      .range(from, to);
    if (error) throw error;
    return data ?? [];
  });

  const sourceRows = await fetchAllRows(async (from, to) => {
    const { data, error } = await supabase
      .from("company_sources")
      .select("company_id, metadata_json")
      .eq("source_type", "ft1000")
      .range(from, to);
    if (error) throw error;
    return data ?? [];
  });

  const byCompany = new Map<
    string,
    { signal_type: string; weight: number; occurred_at: string; confidence?: string | null }[]
  >();
  for (const s of signals ?? []) {
    const list = byCompany.get(s.company_id) ?? [];
    list.push({
      signal_type: s.signal_type,
      weight: s.weight,
      occurred_at: s.occurred_at,
      confidence: typeof s.confidence === "string" ? s.confidence : null,
    });
    byCompany.set(s.company_id, list);
  }

  const ft1000ByCompany = new Map<string, { rank: number | null }>();
  for (const row of sourceRows ?? []) {
    const metadata = (row.metadata_json ?? {}) as Record<string, unknown>;
    const rank = typeof metadata.rank === "number"
      ? metadata.rank
      : typeof metadata.rank === "string" && /^\d+$/.test(metadata.rank)
        ? Number(metadata.rank)
        : null;
    ft1000ByCompany.set(row.company_id, { rank });
  }

  const jobMetricsByCompany = new Map<
    string,
    {
      job_posts: number;
      engineering_job_posts: number;
      ai_job_posts: number;
      remote_job_posts: number;
      leadership_job_posts: number;
      departments: Set<string>;
      leadership_roles: Set<string>;
      recent_job_posts_7d: number;
      previous_job_posts_7d: number;
      source_types: Set<string>;
    }
  >();

  const fundingContextByCompany = new Map<
    string,
    {
      funding_round_type: string | null;
      funding_amount: string | null;
      funding_currency: string | null;
      funding_investors: string[];
    }
  >();

  const now = new Date();
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(now.getDate() - 7);
  const fourteenDaysAgo = new Date(now);
  fourteenDaysAgo.setDate(now.getDate() - 14);

  for (const event of recentEvents ?? []) {
    if (!event.company_id) continue;
    const metadata = (event.metadata_json ?? {}) as Record<string, unknown>;
    const current = jobMetricsByCompany.get(event.company_id) ?? {
      job_posts: 0,
      engineering_job_posts: 0,
      ai_job_posts: 0,
      remote_job_posts: 0,
      leadership_job_posts: 0,
      departments: new Set<string>(),
      leadership_roles: new Set<string>(),
      recent_job_posts_7d: 0,
      previous_job_posts_7d: 0,
      source_types: new Set<string>(),
    };

    current.job_posts += Math.max(1, getNumericMetadata(metadata, "job_count"));
    current.engineering_job_posts += getNumericMetadata(metadata, "engineering_job_count");
    current.ai_job_posts += getNumericMetadata(metadata, "ai_job_count");
    current.remote_job_posts += getNumericMetadata(metadata, "remote_job_count");

    if (getNumericMetadata(metadata, "engineering_job_count") === 0 && metadata.department === "engineering") {
      current.engineering_job_posts += 1;
    }
    if (getNumericMetadata(metadata, "ai_job_count") === 0 && metadata.is_ai === true) {
      current.ai_job_posts += 1;
    }
    if (getNumericMetadata(metadata, "remote_job_count") === 0 && metadata.is_remote === true) {
      current.remote_job_posts += 1;
    }
    current.leadership_job_posts += getNumericMetadata(metadata, "leadership_job_count");
    if (getNumericMetadata(metadata, "leadership_job_count") === 0 && metadata.is_leadership === true) {
      current.leadership_job_posts += 1;
    }

    getDepartmentsFromMetadata(metadata).forEach((department) => current.departments.add(department));
    getLeadershipRolesFromMetadata(metadata).forEach((role) => current.leadership_roles.add(role));
    if (typeof event.source_type === "string") current.source_types.add(event.source_type);

    const detectedAt = new Date(event.detected_at);
    const jobCount = Math.max(1, getNumericMetadata(metadata, "job_count"));
    if (detectedAt >= sevenDaysAgo && detectedAt <= now) {
      current.recent_job_posts_7d += jobCount;
    } else if (detectedAt >= fourteenDaysAgo && detectedAt < sevenDaysAgo) {
      current.previous_job_posts_7d += jobCount;
    }
    jobMetricsByCompany.set(event.company_id, current);
  }

  const companiesWithRecentJobs = Array.from(jobMetricsByCompany.keys());
  const historicalDepartmentSets = new Map<string, Set<string>>();
  if (companiesWithRecentJobs.length > 0) {
    const historicalEvents = await fetchAllRows(async (from, to) => {
      const { data, error } = await supabase
        .from("events")
        .select("company_id, metadata_json")
        .eq("event_type", "job_post_detected")
        .in("company_id", companiesWithRecentJobs)
        .lt("detected_at", sinceIso)
        .range(from, to);
      if (error) throw error;
      return data ?? [];
    });

    for (const event of historicalEvents ?? []) {
      if (!event.company_id) continue;
      const departments = getDepartmentsFromMetadata((event.metadata_json ?? {}) as Record<string, unknown>);
      if (departments.length === 0) continue;
      const known = historicalDepartmentSets.get(event.company_id) ?? new Set<string>();
      departments.forEach((department) => known.add(department));
      historicalDepartmentSets.set(event.company_id, known);
    }
  }

  const recentFundingEvents = await fetchAllRows(async (from, to) => {
    const { data, error } = await supabase
      .from("events")
      .select("company_id, metadata_json, detected_at")
      .eq("event_type", "funding_event_detected")
      .gte("detected_at", sinceIso)
      .not("company_id", "is", null)
      .order("detected_at", { ascending: false })
      .range(from, to);
    if (error) throw error;
    return data ?? [];
  });

  for (const event of recentFundingEvents ?? []) {
    if (!event.company_id || fundingContextByCompany.has(event.company_id)) continue;
    const metadata = (event.metadata_json ?? {}) as Record<string, unknown>;
    fundingContextByCompany.set(event.company_id, {
      funding_round_type: typeof metadata.funding_round_type === "string" ? metadata.funding_round_type : null,
      funding_amount: typeof metadata.funding_amount === "string" ? metadata.funding_amount : null,
      funding_currency: typeof metadata.funding_currency === "string" ? metadata.funding_currency : null,
      funding_investors: Array.isArray(metadata.investors)
        ? metadata.investors.filter((value): value is string => typeof value === "string")
        : [],
    });
  }
  const companies = await fetchAllRows(async (from, to) => {
    const { data, error } = await supabase
      .from("companies")
      .select("id")
      .range(from, to);
    if (error) throw error;
    return data ?? [];
  });

  const scoredCompanies: Array<{
    company_id: string;
    score: number;
    score_components_json: ScoreComponents;
  }> = [];

  for (const c of companies) {
    const company_id = c.id;
    const companySignals = byCompany.get(company_id) ?? [];
    const ft1000 = ft1000ByCompany.get(company_id);
    const ft1000Baseline = getFt1000Baseline(ft1000?.rank);
    const ft1000Components: ScoreComponents = ft1000
      ? {
          ft1000_listed: true,
          ft1000_rank: ft1000.rank ?? undefined,
          ft1000_points: ft1000Baseline,
        }
      : {};

    try {
      const baseScore = companySignals.length > 0
        ? calculateScore(companySignals, now)
        : { score: 0, score_components_json: {} as ScoreComponents };
      const score = Math.min(100, baseScore.score + ft1000Baseline);
      const score_components_json = {
        ...baseScore.score_components_json,
        ...ft1000Components,
      };
      const jobMetrics = jobMetricsByCompany.get(company_id);
      if (jobMetrics) {
        const knownDepartments = historicalDepartmentSets.get(company_id) ?? new Set<string>();
        const newDepartmentNames = Array.from(jobMetrics.departments).filter(
          (department) => !knownDepartments.has(department)
        );
        score_components_json.job_posts = jobMetrics.job_posts;
        score_components_json.engineering_job_posts = jobMetrics.engineering_job_posts;
        score_components_json.ai_job_posts = jobMetrics.ai_job_posts;
        score_components_json.remote_job_posts = jobMetrics.remote_job_posts;
        score_components_json.leadership_job_posts = jobMetrics.leadership_job_posts;
        score_components_json.engineering_hiring =
          !!score_components_json.engineering_hiring || jobMetrics.engineering_job_posts > 0;
        score_components_json.ai_hiring =
          !!score_components_json.ai_hiring || jobMetrics.ai_job_posts > 0;
        score_components_json.remote_hiring =
          !!score_components_json.remote_hiring || jobMetrics.remote_job_posts > 0;
        score_components_json.leadership_hiring =
          !!score_components_json.leadership_hiring || jobMetrics.leadership_job_posts > 0;
        score_components_json.leadership_roles = Array.from(jobMetrics.leadership_roles).sort();
        score_components_json.departments = Array.from(jobMetrics.departments).sort();
        score_components_json.new_department_names = newDepartmentNames;
        score_components_json.new_department_hiring =
          !!score_components_json.new_department_hiring || newDepartmentNames.length > 0;
        score_components_json.recent_job_posts_7d = jobMetrics.recent_job_posts_7d;
        score_components_json.previous_job_posts_7d = jobMetrics.previous_job_posts_7d;
        score_components_json.hiring_velocity_delta =
          jobMetrics.recent_job_posts_7d - jobMetrics.previous_job_posts_7d;
        score_components_json.hiring_velocity_up =
          jobMetrics.recent_job_posts_7d > jobMetrics.previous_job_posts_7d;
        score_components_json.engineering_share =
          jobMetrics.job_posts > 0
            ? Number((jobMetrics.engineering_job_posts / jobMetrics.job_posts).toFixed(3))
            : 0;
        score_components_json.remote_share =
          jobMetrics.job_posts > 0
            ? Number((jobMetrics.remote_job_posts / jobMetrics.job_posts).toFixed(3))
            : 0;
        score_components_json.monitored_source_types = Array.from(jobMetrics.source_types).sort();
      }
      const fundingContext = fundingContextByCompany.get(company_id);
      if (fundingContext) {
        score_components_json.funding_round_type = fundingContext.funding_round_type;
        score_components_json.funding_amount = fundingContext.funding_amount;
        score_components_json.funding_currency = fundingContext.funding_currency;
        score_components_json.funding_investors = fundingContext.funding_investors;
      }
      const confidences = companySignals
        .map((signal) => signal.confidence)
        .filter((value): value is string => typeof value === "string");
      score_components_json.highest_signal_confidence = confidences.includes("high")
        ? "high"
        : confidences.includes("medium")
          ? "medium"
          : confidences.includes("medium-low")
            ? "medium-low"
            : confidences.includes("low")
              ? "low"
              : null;
      scoredCompanies.push({
        company_id,
        score,
        score_components_json,
      });
    } catch (e) {
      console.warn("[score] Skip company", company_id, e);
    }
  }

  scoredCompanies.sort((a, b) => {
    if (a.score !== b.score) return b.score - a.score;

    const existingRankA = existingRanks.get(a.company_id) ?? Number.MAX_SAFE_INTEGER;
    const existingRankB = existingRanks.get(b.company_id) ?? Number.MAX_SAFE_INTEGER;
    if (existingRankA !== existingRankB) return existingRankA - existingRankB;

    return a.company_id.localeCompare(b.company_id);
  });

  for (const [index, company] of Array.from(scoredCompanies.entries())) {
    const rankPosition = index + 1;
    const previousRankPosition = existingRanks.get(company.company_id) ?? null;

    try {
      const { error } = await supabase.from("company_scores").upsert(
        {
          company_id: company.company_id,
          score: company.score,
          last_calculated_at: now.toISOString(),
          score_components_json: company.score_components_json,
          rank_position: rankPosition,
          previous_rank_position: previousRankPosition,
        },
        { onConflict: "company_id" }
      );
      if (error) console.warn("[score] Upsert failed", company.company_id, error.message);
    } catch (e) {
      console.warn("[score] Skip company", company.company_id, e);
    }
  }

  console.log(`[score] Updated scores for ${companies.length} companies`);
}

if (typeof process !== "undefined" && !process.env.NEXT_RUNTIME) {
  run().catch((e) => {
    console.error("[score] Fatal:", e);
    process.exit(1);
  });
}
