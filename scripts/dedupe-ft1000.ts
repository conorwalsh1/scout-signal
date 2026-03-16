/**
 * Consolidate duplicate FT1000 imports by rank, keeping one canonical company per rank.
 *
 * Safe to rerun:
 * - picks one canonical company per FT1000 rank
 * - moves related rows from duplicate companies onto the canonical company
 * - keeps the strongest available company/site/score metadata
 * - deletes duplicate FT1000 company rows afterward
 *
 * Usage:
 *   npm run db:dedupe-ft1000
 *   npm run db:dedupe-ft1000 -- --dry-run
 */
import { config } from "dotenv";
import { readFileSync } from "fs";
import { resolve } from "path";

config({ path: ".env.local" });

import { createServiceClient } from "../lib/supabase/service";

interface FT1000Row {
  name: string;
  domain?: string | null;
  website?: string | null;
  rank?: number;
  [key: string]: unknown;
}

interface CompanyRecord {
  id: string;
  name: string;
  domain: string | null;
  website: string | null;
  created_at: string;
  updated_at: string;
}

interface SourceRow {
  id: string;
  company_id: string;
  source_external_id: string | null;
  metadata_json: Record<string, unknown> | null;
  companies: CompanyRecord[] | CompanyRecord | null;
}

interface ScoreRow {
  company_id: string;
  score: number;
  last_calculated_at: string;
  score_components_json: Record<string, unknown> | null;
}

interface CandidateRow {
  company: CompanyRecord;
  sourceRow: SourceRow | null;
}

type Supabase = ReturnType<typeof createServiceClient>;

function hasFlag(flag: string): boolean {
  return process.argv.includes(flag);
}

function getCompany(row: SourceRow): CompanyRecord | null {
  if (!row.companies) return null;
  return Array.isArray(row.companies) ? row.companies[0] ?? null : row.companies;
}

function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^\w\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function metadataSize(row: SourceRow): number {
  return Object.keys(row.metadata_json ?? {}).length;
}

function hasSite(company: CompanyRecord | null): boolean {
  return Boolean(company?.website || company?.domain);
}

function loadFt1000Rows(): Map<string, FT1000Row> {
  const filePath = resolve(process.cwd(), "scripts/data/ft1000.json");
  const rows = JSON.parse(readFileSync(filePath, "utf-8")) as FT1000Row[];
  return new Map(rows.map((row, index) => [String(row.rank ?? index + 1), row]));
}

async function loadAllFt1000SourceRows(supabase: Supabase): Promise<SourceRow[]> {
  const pageSize = 1000;
  const rows: SourceRow[] = [];

  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from("company_sources")
      .select(`
        id,
        company_id,
        source_external_id,
        metadata_json,
        companies:company_id (
          id,
          name,
          domain,
          website,
          created_at,
          updated_at
        )
      `)
      .eq("source_type", "ft1000")
      .order("created_at", { ascending: true })
      .range(from, from + pageSize - 1);

    if (error) throw error;

    const batch = (data ?? []) as unknown as SourceRow[];
    rows.push(...batch);
    if (batch.length < pageSize) break;
  }

  return rows;
}

async function loadScoresByCompanyId(supabase: Supabase): Promise<Map<string, ScoreRow>> {
  const pageSize = 1000;
  const scores = new Map<string, ScoreRow>();

  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from("company_scores")
      .select("company_id, score, last_calculated_at, score_components_json")
      .range(from, from + pageSize - 1);

    if (error) throw error;

    const batch = (data ?? []) as ScoreRow[];
    for (const row of batch) {
      scores.set(row.company_id, row);
    }
    if (batch.length < pageSize) break;
  }

  return scores;
}

async function loadAllCompanies(supabase: Supabase): Promise<CompanyRecord[]> {
  const pageSize = 1000;
  const rows: CompanyRecord[] = [];

  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from("companies")
      .select("id, name, domain, website, created_at, updated_at")
      .order("created_at", { ascending: true })
      .range(from, from + pageSize - 1);

    if (error) throw error;

    const batch = (data ?? []) as CompanyRecord[];
    rows.push(...batch);
    if (batch.length < pageSize) break;
  }

  return rows;
}

function pickCanonicalCandidate(
  rows: CandidateRow[],
  scoresByCompanyId: Map<string, ScoreRow>
): CandidateRow {
  return [...rows].sort((a, b) => {
    const companyA = a.company;
    const companyB = b.company;

    const scoreA = scoresByCompanyId.get(companyA.id)?.score ?? 0;
    const scoreB = scoresByCompanyId.get(companyB.id)?.score ?? 0;
    if (scoreA !== scoreB) return scoreB - scoreA;

    const aHasSite = Number(hasSite(companyA));
    const bHasSite = Number(hasSite(companyB));
    if (aHasSite !== bHasSite) return bHasSite - aHasSite;

    const aMeta = a.sourceRow ? metadataSize(a.sourceRow) : 0;
    const bMeta = b.sourceRow ? metadataSize(b.sourceRow) : 0;
    if (aMeta !== bMeta) return bMeta - aMeta;

    const aUpdated = new Date(companyA.updated_at).getTime();
    const bUpdated = new Date(companyB.updated_at).getTime();
    if (aUpdated !== bUpdated) return bUpdated - aUpdated;

    const aCreated = new Date(companyA.created_at).getTime();
    const bCreated = new Date(companyB.created_at).getTime();
    return aCreated - bCreated;
  })[0];
}

function buildCanonicalCompanyUpdate(
  rank: string,
  companies: CompanyRecord[],
  truth: FT1000Row | undefined
): { name: string; domain: string | null; website: string | null; updated_at: string } {
  const domain = truth?.domain ?? companies.find((company) => company.domain)?.domain ?? null;
  const website =
    truth?.website
    ?? companies.find((company) => company.website)?.website
    ?? (domain ? `https://${domain}` : null);

  return {
    name: truth?.name ?? companies[0]?.name ?? `FT1000 company ${rank}`,
    domain,
    website,
    updated_at: new Date().toISOString(),
  };
}

function buildCanonicalMetadata(rank: string, truth: FT1000Row | undefined, rows: SourceRow[]) {
  const richestMetadata = [...rows]
    .map((row) => row.metadata_json ?? {})
    .sort((a, b) => Object.keys(b).length - Object.keys(a).length)[0] ?? {};

  return {
    ...richestMetadata,
    ...(truth ?? {}),
    name: truth?.name ?? (richestMetadata.name as string | undefined) ?? getCompany(rows[0])?.name ?? "",
    rank: Number(rank),
  };
}

function pickBestScore(companyIds: string[], scoresByCompanyId: Map<string, ScoreRow>): ScoreRow | null {
  const scores = companyIds
    .map((companyId) => scoresByCompanyId.get(companyId))
    .filter(Boolean) as ScoreRow[];

  if (scores.length === 0) return null;

  return [...scores].sort((a, b) => {
    if (a.score !== b.score) return b.score - a.score;
    return new Date(b.last_calculated_at).getTime() - new Date(a.last_calculated_at).getTime();
  })[0];
}

async function mergeSavedTargets(
  supabase: Supabase,
  canonicalCompanyId: string,
  duplicateCompanyId: string,
  dryRun: boolean
) {
  const { data, error } = await supabase
    .from("saved_targets")
    .select("user_id")
    .eq("company_id", duplicateCompanyId);

  if (error) throw error;
  if (!data?.length) return;

  if (dryRun) return;

  const { error: upsertError } = await supabase.from("saved_targets").upsert(
    data.map((row) => ({
      user_id: row.user_id,
      company_id: canonicalCompanyId,
    })),
    { onConflict: "user_id,company_id" }
  );
  if (upsertError) throw upsertError;

  const { error: deleteError } = await supabase
    .from("saved_targets")
    .delete()
    .eq("company_id", duplicateCompanyId);
  if (deleteError) throw deleteError;
}

async function run() {
  const dryRun = hasFlag("--dry-run");
  const supabase = createServiceClient();
  const sourceOfTruth = loadFt1000Rows();
  const [sourceRows, scoresByCompanyId, allCompanies] = await Promise.all([
    loadAllFt1000SourceRows(supabase),
    loadScoresByCompanyId(supabase),
    loadAllCompanies(supabase),
  ]);

  const companiesByNormalizedName = new Map<string, CompanyRecord[]>();
  for (const company of allCompanies) {
    const key = normalizeName(company.name);
    const list = companiesByNormalizedName.get(key) ?? [];
    list.push(company);
    companiesByNormalizedName.set(key, list);
  }

  const grouped = new Map<string, SourceRow[]>();
  for (const row of sourceRows) {
    const rank = row.source_external_id ?? String(row.metadata_json?.rank ?? "");
    if (!rank) continue;
    const list = grouped.get(rank) ?? [];
    list.push(row);
    grouped.set(rank, list);
  }

  let duplicateGroups = 0;
  let duplicateCompanies = 0;
  let savedTargetsMoved = 0;
  let eventsMoved = 0;
  let signalsMoved = 0;
  let companyScoresMerged = 0;

  for (const [rank, rows] of Array.from(grouped.entries())) {
    if (rows.length <= 1) continue;

    const truth = sourceOfTruth.get(rank);
    const sourceCompanies = rows.map(getCompany).filter(Boolean) as CompanyRecord[];
    const groupCompanyIds = new Set(sourceCompanies.map((company) => company.id));
    const groupName = truth?.name ?? sourceCompanies[0]?.name ?? "";
    const extraCompanies = (companiesByNormalizedName.get(normalizeName(groupName)) ?? [])
      .filter((company) => !groupCompanyIds.has(company.id));

    const candidates: CandidateRow[] = [
      ...rows
        .map((row) => {
          const company = getCompany(row);
          return company ? { company, sourceRow: row } : null;
        })
        .filter(Boolean) as CandidateRow[],
      ...extraCompanies.map((company) => ({ company, sourceRow: null })),
    ];

    const canonical = pickCanonicalCandidate(candidates, scoresByCompanyId);
    const canonicalCompany = canonical.company;
    const canonicalSourceRow = canonical.sourceRow ?? candidates.find((row) => row.sourceRow)?.sourceRow ?? null;
    if (!canonicalSourceRow) continue;

    const duplicateCompanyRows = candidates
      .map((candidate) => candidate.company)
      .filter((company) => company.id !== canonicalCompany.id);
    const duplicateCompanyIds = duplicateCompanyRows.map((company) => company.id);
    if (duplicateCompanyIds.length === 0) continue;

    duplicateGroups++;
    duplicateCompanies += duplicateCompanyIds.length;

    const companyUpdate = buildCanonicalCompanyUpdate(
      rank,
      candidates.map((candidate) => candidate.company),
      truth
    );
    const sourceMetadata = buildCanonicalMetadata(rank, truth, rows);
    const bestScore = pickBestScore(
      candidates.map((candidate) => candidate.company.id),
      scoresByCompanyId
    );

    if (dryRun) {
      console.log(
        JSON.stringify({
          rank,
          canonicalCompanyId: canonicalCompany.id,
          canonicalName: canonicalCompany.name,
          duplicateCompanyIds,
          companyUpdate,
          bestScore,
        })
      );
      continue;
    }

    const { error: updateSourceError } = await supabase
      .from("company_sources")
      .update({
        company_id: canonicalCompany.id,
        source_external_id: rank,
        metadata_json: sourceMetadata,
      })
      .eq("id", canonicalSourceRow.id);
    if (updateSourceError) throw updateSourceError;

    if (bestScore) {
      const { error: upsertScoreError } = await supabase.from("company_scores").upsert(
        {
          company_id: canonicalCompany.id,
          score: bestScore.score,
          last_calculated_at: bestScore.last_calculated_at,
          score_components_json: bestScore.score_components_json ?? {},
        },
        { onConflict: "company_id" }
      );
      if (upsertScoreError) throw upsertScoreError;
      companyScoresMerged++;
    }

    for (const duplicateCompanyId of duplicateCompanyIds) {
      await mergeSavedTargets(supabase, canonicalCompany.id, duplicateCompanyId, false);
      const { data: movedSavedTargets } = await supabase
        .from("saved_targets")
        .select("id")
        .eq("company_id", canonicalCompany.id);
      savedTargetsMoved += movedSavedTargets?.length ?? 0;

      const { count: movedEvents, error: eventsError } = await supabase
        .from("events")
        .update({ company_id: canonicalCompany.id }, { count: "exact" })
        .eq("company_id", duplicateCompanyId);
      if (eventsError) throw eventsError;
      eventsMoved += movedEvents ?? 0;

      const { count: movedSignals, error: signalsError } = await supabase
        .from("signals")
        .update({ company_id: canonicalCompany.id }, { count: "exact" })
        .eq("company_id", duplicateCompanyId);
      if (signalsError) throw signalsError;
      signalsMoved += movedSignals ?? 0;

      const { error: deleteScoreError } = await supabase
        .from("company_scores")
        .delete()
        .eq("company_id", duplicateCompanyId);
      if (deleteScoreError) throw deleteScoreError;

      const { error: deleteCompanyError } = await supabase
        .from("companies")
        .delete()
        .eq("id", duplicateCompanyId);
      if (deleteCompanyError) throw deleteCompanyError;
    }

    const { error: updateCompanyError } = await supabase
      .from("companies")
      .update(companyUpdate)
      .eq("id", canonicalCompany.id);
    if (updateCompanyError) throw updateCompanyError;
  }

  console.log(
    dryRun
      ? `Dry run complete. Duplicate rank groups found: ${duplicateGroups}. Duplicate companies to delete: ${duplicateCompanies}.`
      : `Done. Duplicate rank groups fixed: ${duplicateGroups}. Duplicate companies deleted: ${duplicateCompanies}. Events moved: ${eventsMoved}. Signals moved: ${signalsMoved}. Score rows merged: ${companyScoresMerged}. Saved targets moved: ${savedTargetsMoved}.`
  );
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
