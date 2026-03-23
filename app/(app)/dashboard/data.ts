/**
 * Server-only data fetchers for dashboard/saved. Do not add "use server".
 * Import from this file only in Server Components (e.g. page.tsx).
 */
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { ensureAppUser } from "@/lib/auth/ensure-user";
import { isAdmin } from "@/lib/auth/admin";
import { feedLimit, savedLimit, normalizePlan, type Plan } from "@/lib/plan-gating";
import { dedupeCompaniesByName, filterLiveCompanies, sortCompaniesForDisplay } from "@/lib/company-selection";
import { filterLaunchReadyCompanies } from "@/lib/beta-readiness";
import { PRO_ONLY_BADGES, getCompanyBadgesForPlan } from "@/lib/badges";
import type { BadgeId } from "@/lib/badges";
import type { ScoreComponents } from "@/types/database";

export type RecentHeadline = {
  id: string;
  source_url: string;
  detected_at: string;
  event_type: string;
  company_name_raw: string;
  title: string | null;
};

/** Five most recent events with source URLs (for dashboard news feed). */
export async function getRecentSignalHeadlines(limit = 5): Promise<RecentHeadline[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("events")
    .select("id, source_url, detected_at, event_type, company_name_raw, metadata_json")
    .not("source_url", "is", null)
    .like("source_url", "http%")
    .order("detected_at", { ascending: false })
    .limit(limit);

  if (error) return [];
  const rows = (data ?? []) as Array<{
    id: string;
    source_url: string;
    detected_at: string;
    event_type: string;
    company_name_raw: string;
    metadata_json: Record<string, unknown> | null;
  }>;
  return rows.map((r) => {
    const meta = r.metadata_json ?? {};
    let title: string | null = typeof meta.title === "string" ? meta.title : null;
    if (!title && typeof meta.funding_round_type === "string") {
      title = `${r.company_name_raw} — ${meta.funding_round_type.replace(/_/g, " ")} funding`;
    }
    if (!title && typeof meta.job_count === "number") {
      const n = meta.job_count;
      title = `${r.company_name_raw} — ${n} open role${n !== 1 ? "s" : ""}`;
    }
    return {
      id: r.id,
      source_url: r.source_url,
      detected_at: r.detected_at,
      event_type: r.event_type,
      company_name_raw: r.company_name_raw,
      title: title || null,
    };
  });
}

/** Total companies in DB (for dashboard/landing). Uses service client for public count. */
export async function getCompaniesCount(): Promise<number | null> {
  try {
    const supabase = createServiceClient();
    const { count } = await supabase.from("companies").select("id", { count: "exact", head: true });
    return count ?? null;
  } catch {
    return null;
  }
}

const ADMIN_FEED_LIMIT = 10_000;

async function getUserPlan(supabase: Awaited<ReturnType<typeof createClient>>, userId: string): Promise<Plan> {
  const { data } = await supabase.from("users").select("plan").eq("id", userId).single();
  return normalizePlan(data?.plan);
}

export async function getDashboardFeed(limit = 50) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) await ensureAppUser(supabase, user.id, user.email ?? "");
  const plan = user ? await getUserPlan(supabase, user.id) : "free";
  const cappedLimit = isAdmin(user?.email) ? ADMIN_FEED_LIMIT : feedLimit(plan);
  const { data: companies, error } = await supabase
    .from("companies")
    .select(`
      id,
      name,
      domain,
      website,
      updated_at,
      company_scores ( score, last_calculated_at, score_components_json, rank_position, previous_rank_position )
    `)
    .order("updated_at", { ascending: false })
    .limit(limit * 2);

  if (error) throw new Error(error.message ?? "Failed to load dashboard feed");

  const withScores = (companies ?? [])
    .map((c: Record<string, unknown>) => {
      const scores = c.company_scores as Array<{
        score: number;
        last_calculated_at: string;
        score_components_json: Record<string, unknown>;
        rank_position?: number | null;
        previous_rank_position?: number | null;
      }> | null;
      const first = Array.isArray(scores) ? scores[0] : scores;
      if (!first) return null;
      const scoreComponents = first.score_components_json ?? {};
      return {
        id: c.id,
        name: c.name,
        domain: c.domain,
        website: c.website,
        updated_at: c.updated_at,
        score: first.score,
        last_calculated_at: first.last_calculated_at,
        rank_position: first.rank_position ?? null,
        previous_rank_position: first.previous_rank_position ?? null,
        score_components_json: typeof scoreComponents === "object" && scoreComponents !== null ? { ...scoreComponents } : {},
      };
    })
    .filter(Boolean) as Array<{
      id: string;
      name: string;
      domain: string | null;
      website: string | null;
      updated_at: string;
      score: number;
      last_calculated_at: string;
      rank_position: number | null;
      previous_rank_position: number | null;
      score_components_json: Record<string, unknown>;
    }>;

  const deduped = dedupeCompaniesByName(filterLaunchReadyCompanies(filterLiveCompanies(withScores)));
  const feed = sortCompaniesForDisplay(deduped, "score").slice(0, cappedLimit);
  const feedLimitReached = deduped.length > cappedLimit;
  return { feed, plan, feedLimitReached };
}

export async function getSavedCompanyIds(): Promise<string[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data } = await supabase
    .from("saved_targets")
    .select("company_id")
    .eq("user_id", user.id);
  return (data ?? []).map((r) => r.company_id);
}

export async function getSavedCompanies() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { companies: [], plan: "free" as Plan, savedLimitReached: false };
  await ensureAppUser(supabase, user.id, user.email ?? "");
  const plan = await getUserPlan(supabase, user.id);
  const { data: rows } = await supabase
    .from("saved_targets")
    .select("company_id")
    .eq("user_id", user.id);
  const ids = (rows ?? []).map((r) => r.company_id);
  if (ids.length === 0) return { companies: [], plan, savedLimitReached: false };
  const { data: companies } = await supabase
    .from("companies")
    .select(`
      id, name, domain, website, updated_at,
      company_scores ( score, last_calculated_at, score_components_json, rank_position, previous_rank_position )
    `)
    .in("id", ids);
  type SavedCompanyRow = {
    id: string;
    name: string;
    domain: string | null;
    website: string | null;
      updated_at: string;
      score: number;
      last_calculated_at: string;
      rank_position: number | null;
      previous_rank_position: number | null;
      score_components_json: Record<string, unknown>;
  };
  const withScores: SavedCompanyRow[] = (companies ?? []).map((c: Record<string, unknown>) => {
    const scores = c.company_scores as Array<{
      score: number;
      last_calculated_at: string;
      score_components_json: Record<string, unknown>;
      rank_position?: number | null;
      previous_rank_position?: number | null;
    }> | null;
    const first = Array.isArray(scores) ? scores[0] : null;
    const scoreComponents = first?.score_components_json ?? {};
    return {
      id: c.id as string,
      name: c.name as string,
      domain: c.domain as string | null,
      website: c.website as string | null,
      updated_at: c.updated_at as string,
      score: first?.score ?? 0,
      last_calculated_at: first?.last_calculated_at ?? "",
      rank_position: first?.rank_position ?? null,
      previous_rank_position: first?.previous_rank_position ?? null,
      score_components_json: typeof scoreComponents === "object" && scoreComponents !== null ? { ...scoreComponents } : {},
    };
  });
  const deduped = dedupeCompaniesByName(filterLiveCompanies(withScores));
  const sorted = sortCompaniesForDisplay(deduped, "score");
  const cap = savedLimit(plan);
  const savedLimitReached = sorted.length >= cap;
  return { companies: sorted.slice(0, cap), plan, savedLimitReached };
}

export type CompaniesListItem = {
  id: string;
  name: string;
  domain: string | null;
  website: string | null;
  updated_at: string;
  score: number;
  last_calculated_at: string;
  rank_position: number | null;
  previous_rank_position: number | null;
  score_components_json: Record<string, unknown>;
};

export async function getCompaniesList(options?: {
  search?: string;
  sort?: "score" | "updated" | "rank";
  badge?: BadgeId;
}): Promise<{ companies: CompaniesListItem[]; plan: Plan }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) await ensureAppUser(supabase, user.id, user.email ?? "");
  const plan = user ? await getUserPlan(supabase, user.id) : "free";
  const cappedLimit = isAdmin(user?.email) ? ADMIN_FEED_LIMIT : feedLimit(plan);
  const sort = options?.sort ?? "rank";
  if (options?.badge && plan !== "pro" && PRO_ONLY_BADGES.includes(options.badge)) {
    return { companies: [], plan };
  }

  if (sort === "rank") {
    const service = createServiceClient();
    const rankFetchLimit = Math.min(cappedLimit * 2, 1000);
    const { data: scoreRows, error: scoreError } = await service
      .from("company_scores")
      .select("company_id, score, last_calculated_at, score_components_json, rank_position, previous_rank_position")
      .not("rank_position", "is", null)
      .order("rank_position", { ascending: true })
      .limit(rankFetchLimit);

    if (scoreError) throw new Error(scoreError.message ?? "Failed to load company scores");
    const orderedIds = (scoreRows ?? []).map((r) => r.company_id);
    if (orderedIds.length === 0) return { companies: [], plan };

    const BATCH_SIZE = 100;
    const companyMap = new Map<string, { id: string; name: string | null; domain: string | null; website: string | null; updated_at: string }>();
    for (let i = 0; i < orderedIds.length; i += BATCH_SIZE) {
      const batch = orderedIds.slice(i, i + BATCH_SIZE);
      let q = supabase.from("companies").select("id, name, domain, website, updated_at").in("id", batch);
      if (options?.search?.trim()) {
        q = q.ilike("name", `%${options.search.trim()}%`);
      }
      const { data: batchData, error: batchError } = await q;
      if (batchError) throw new Error(batchError.message ?? "Failed to load companies");
      for (const c of batchData ?? []) {
        companyMap.set(c.id, c);
      }
    }
    const scoreByCompany = new Map(
      (scoreRows ?? []).map((r) => [
        r.company_id,
        {
          score: r.score,
          last_calculated_at: r.last_calculated_at,
          score_components_json: (r.score_components_json ?? {}) as Record<string, unknown>,
          rank_position: r.rank_position ?? null,
          previous_rank_position: r.previous_rank_position ?? null,
        },
      ])
    );

    // Preserve global rank order from company_scores → orderedIds.
    // We build a flat withScores array in that exact order, then
    // optionally apply search/badge filters without re-sorting.
    const withScores: CompaniesListItem[] = [];
    const seenNames = new Set<string>();
    for (const companyId of orderedIds) {
      const company = companyMap.get(companyId);
      const scoreRow = scoreByCompany.get(companyId);
      if (!company || !scoreRow) continue;
      const companyName = company.name?.trim();
      if (!companyName) continue;
      const nameKey = companyName.toLowerCase();
      if (seenNames.has(nameKey)) continue;
      seenNames.add(nameKey);
      if (options?.search?.trim() && !companyName.toLowerCase().includes(options.search.trim().toLowerCase())) continue;
      withScores.push({
        id: company.id,
        name: companyName,
        domain: company.domain,
        website: company.website,
        updated_at: company.updated_at,
        score: scoreRow.score,
        last_calculated_at: scoreRow.last_calculated_at,
        rank_position: scoreRow.rank_position,
        previous_rank_position: scoreRow.previous_rank_position,
        score_components_json: scoreRow.score_components_json,
      });
    }
    // For explicit rank ordering, keep the true global ranking from company_scores.
    // Do NOT run additional "live"/"launch ready" filters here, otherwise the list
    // will appear to start at #4, #5, #6, etc. instead of #1, #2, #3….
    let out = withScores.slice(0, cappedLimit);
    if (options?.badge) {
      const badge = options.badge;
      out = out.filter((c) =>
        getCompanyBadgesForPlan(c.score_components_json as ScoreComponents, { score: c.score, plan }).includes(badge)
      );
    }
    return { companies: out, plan };
  }

  let query = supabase
    .from("companies")
    .select(`
      id,
      name,
      domain,
      website,
      updated_at,
      company_scores ( score, last_calculated_at, score_components_json, rank_position, previous_rank_position )
    `)
    .order("updated_at", { ascending: false })
    .limit(cappedLimit * 2);

  if (options?.search?.trim()) {
    query = query.ilike("name", `%${options.search.trim()}%`);
  }

  const { data: companies, error } = await query;

  if (error) throw new Error(error.message ?? "Failed to load companies list");

  const withScores = (companies ?? [])
    .map((c: Record<string, unknown>) => {
      const scores = c.company_scores as Array<{
        score: number;
        last_calculated_at: string;
        score_components_json: Record<string, unknown>;
        rank_position?: number | null;
        previous_rank_position?: number | null;
      }> | null;
      const first = Array.isArray(scores) ? scores[0] : scores;
      if (!first) return null;
      const scoreComponents = first.score_components_json ?? {};
      return {
        id: c.id,
        name: c.name,
        domain: c.domain,
        website: c.website,
        updated_at: c.updated_at,
        score: first.score,
        last_calculated_at: first.last_calculated_at,
        rank_position: first.rank_position ?? null,
        previous_rank_position: first.previous_rank_position ?? null,
        score_components_json: typeof scoreComponents === "object" && scoreComponents !== null ? { ...scoreComponents } : {},
      };
    })
    .filter(Boolean) as CompaniesListItem[];

  let list = filterLaunchReadyCompanies(filterLiveCompanies(withScores));
  if (options?.badge) {
    const badge = options.badge;
    list = list.filter((c) =>
      getCompanyBadgesForPlan(c.score_components_json as ScoreComponents, { score: c.score, plan }).includes(badge)
    );
  }
  const deduped = dedupeCompaniesByName(list);
  const sorted = sortCompaniesForDisplay(deduped, sort);
  return { companies: sorted.slice(0, cappedLimit), plan };
}
