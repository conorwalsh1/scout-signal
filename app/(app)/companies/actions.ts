"use server";

import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { revalidatePath } from "next/cache";
import { ensureAppUser } from "@/lib/auth/ensure-user";
import { isAdmin } from "@/lib/auth/admin";

export async function getCompanyById(companyId: string) {
  const supabase = await createClient();
  const { data: company, error } = await supabase
    .from("companies")
    .select(
      "id, name, domain, website, created_at, updated_at, company_scores ( score, last_calculated_at, score_components_json, rank_position, previous_rank_position ), company_sources ( source_type, source_external_id, metadata_json ), company_web_sources ( source_type, source_value, confidence, website, domain, metadata_json, verified_at )"
    )
    .eq("id", companyId)
    .single();

  if (error || !company) return null;
  // Supabase can return 1:1 relations as single object; normalize to array
  const rawScores = company.company_scores as
    | Array<{ score: number; last_calculated_at: string; score_components_json: Record<string, unknown>; rank_position?: number | null; previous_rank_position?: number | null }>
    | { score: number; last_calculated_at: string; score_components_json: Record<string, unknown>; rank_position?: number | null; previous_rank_position?: number | null }
    | null
    | undefined;
  const scores = Array.isArray(rawScores) ? rawScores : rawScores ? [rawScores] : [];
  let first:
    | { score: number; last_calculated_at: string; score_components_json: Record<string, unknown>; rank_position?: number | null; previous_rank_position?: number | null }
    | undefined = scores[0];
  // If join didn't return score (e.g. relation shape), fetch company_scores directly
  if (!first) {
    const { data: scoreRow } = await supabase
      .from("company_scores")
      .select("score, last_calculated_at, score_components_json, rank_position, previous_rank_position")
      .eq("company_id", companyId)
      .maybeSingle();
    first = scoreRow ?? undefined;
  }
  const rawSources = company.company_sources;
  const sources = Array.isArray(rawSources) ? rawSources : rawSources ? [rawSources] : [];
  const rawWebSources = (company as Record<string, unknown>).company_web_sources;
  const webSources = Array.isArray(rawWebSources)
    ? rawWebSources
    : rawWebSources
      ? [rawWebSources]
      : [];
  return {
    id: company.id,
    name: company.name,
    domain: company.domain,
    website: company.website,
    created_at: company.created_at,
    updated_at: company.updated_at,
    score: first?.score ?? 0,
    last_calculated_at: first?.last_calculated_at ?? "",
    score_components_json: first?.score_components_json ?? {},
    rank_position: first?.rank_position ?? null,
    previous_rank_position: first?.previous_rank_position ?? null,
    company_sources: sources,
    company_web_sources: webSources,
  };
}

export async function getCompanySignals(companyId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("signals")
    .select("id, signal_type, weight, confidence, occurred_at")
    .eq("company_id", companyId)
    .order("occurred_at", { ascending: false })
    .limit(20);
  return data ?? [];
}

export async function getCompanyEvents(companyId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("events")
    .select("id, event_type, source_url, detected_at, metadata_json")
    .eq("company_id", companyId)
    .order("detected_at", { ascending: false })
    .limit(20);
  return data ?? [];
}

/** Job-post events for hiring velocity (last 30 days). */
export async function getCompanyJobPostEventsLast30Days(companyId: string) {
  const supabase = await createClient();
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 30);
  const { data } = await supabase
    .from("events")
    .select("id, detected_at, metadata_json")
    .eq("company_id", companyId)
    .eq("event_type", "job_post_detected")
    .gte("detected_at", cutoff.toISOString())
    .order("detected_at", { ascending: true })
    .limit(500);
  return data ?? [];
}

/** Rank context for a company: current rank and total ranked companies. */
export async function getCompanyRankContext(companyId: string): Promise<{ rank: number | null; totalRanked: number }> {
  const supabase = createServiceClient();
  const [{ data: row }, { count }] = await Promise.all([
    supabase
      .from("company_scores")
      .select("rank_position")
      .eq("company_id", companyId)
      .maybeSingle(),
    supabase
      .from("company_scores")
      .select("company_id", { count: "exact", head: true })
      .not("rank_position", "is", null),
  ]);
  const rank = row && typeof row.rank_position === "number" ? row.rank_position : null;
  return { rank, totalRanked: count ?? 0 };
}

export async function saveCompany(companyId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };
  await ensureAppUser(supabase, user.id, user.email ?? "");
  const { error } = await supabase.from("saved_targets").insert({
    user_id: user.id,
    company_id: companyId,
  });
  if (error) return { error: error.message };
  revalidatePath("/dashboard");
  revalidatePath("/saved");
  revalidatePath(`/companies/${companyId}`);
  return {};
}

export async function unsaveCompany(companyId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };
  const { error } = await supabase
    .from("saved_targets")
    .delete()
    .eq("user_id", user.id)
    .eq("company_id", companyId);
  if (error) return { error: error.message };
  revalidatePath("/dashboard");
  revalidatePath("/saved");
  revalidatePath(`/companies/${companyId}`);
  return {};
}

export async function isCompanySaved(companyId: string): Promise<boolean> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  const { data } = await supabase
    .from("saved_targets")
    .select("id")
    .eq("user_id", user.id)
    .eq("company_id", companyId)
    .maybeSingle();
  return !!data;
}

/** Number of companies the current user has saved (tracked). */
export async function getSavedCompaniesCount(): Promise<number> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return 0;
  const { count } = await supabase
    .from("saved_targets")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);
  return count ?? 0;
}

export async function isAdminUser(): Promise<boolean> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return isAdmin(user?.email ?? null);
}

/** Admin only: delete a company and its events (cascades handle signals, scores, sources, saved). */
export async function deleteCompany(companyId: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };
  if (!isAdmin(user.email)) return { error: "Forbidden" };

  const service = createServiceClient();
  const { error: eventsErr } = await service.from("events").delete().eq("company_id", companyId);
  if (eventsErr) return { error: eventsErr.message };
  const { error: companyErr } = await service.from("companies").delete().eq("id", companyId);
  if (companyErr) return { error: companyErr.message };

  revalidatePath("/dashboard");
  revalidatePath("/companies");
  return {};
}
