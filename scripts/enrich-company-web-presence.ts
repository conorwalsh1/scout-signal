/**
 * Enrich companies with website/domain data by searching the public web.
 *
 * The script groups duplicate company names so one search can update multiple rows.
 * Logos are derived in the UI from the resolved website/domain, so this script only
 * persists `website` and `domain`.
 *
 * Usage:
 *   npm run db:enrich-web
 *   npm run db:enrich-web -- --limit 100
 *   npm run db:enrich-web -- --offset 100
 *   npm run db:enrich-web -- --dry-run
 */
import { config } from "dotenv";

config({ path: ".env.local" });

import * as cheerio from "cheerio";
import { existsSync, readFileSync, writeFileSync } from "fs";
import { resolve } from "path";
import { createServiceClient } from "../lib/supabase/service";
import { applyCompanyWebUpdate } from "../lib/company-web-source";
import { withRetry } from "../lib/retry";

type CompanyRow = {
  id: string;
  name: string;
  domain: string | null;
  website: string | null;
  updated_at?: string;
};

type SourceMetadata = {
  headquarters?: string;
  category?: string;
};

type SearchResult = {
  title: string;
  url: string;
  domain: string;
};

type GroupedCompanies = {
  key: string;
  rows: CompanyRow[];
};

type ProgressState = {
  nextIndex: number;
  updatedCompanies: number;
  searched: number;
  skipped: number;
  lastProcessedKey: string | null;
  updatedAt: string;
};

const SERPAPI_URL = "https://serpapi.com/search.json";
const SERPAPI_KEY = process.env.SERPAPI_KEY ?? "";
const DUCKDUCKGO_HTML_URL = "https://html.duckduckgo.com/html/";
const DEFAULT_CHECKPOINT_PATH = resolve(
  process.cwd(),
  "scripts/data/enrich-web-progress.json"
);
const BLOCKED_DOMAINS = [
  "linkedin.com",
  "wikipedia.org",
  "facebook.com",
  "instagram.com",
  "x.com",
  "twitter.com",
  "youtube.com",
  "bloomberg.com",
  "crunchbase.com",
  "pitchbook.com",
  "glassdoor.com",
  "indeed.com",
  "rocketreach.co",
  "zoominfo.com",
  "companieshouse.gov.uk",
  "ft.com",
  "statista.com",
  "app.getresponse.com",
];

function getArg(flag: string): string | null {
  const index = process.argv.indexOf(flag);
  return index >= 0 && process.argv[index + 1] ? process.argv[index + 1] : null;
}

function hasFlag(flag: string): boolean {
  return process.argv.includes(flag);
}

function getCheckpointPath(): string {
  const custom = getArg("--checkpoint");
  return custom ? resolve(process.cwd(), custom) : DEFAULT_CHECKPOINT_PATH;
}

function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^\w\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeHostname(value: string): string | null {
  try {
    const url = value.startsWith("http") ? new URL(value) : new URL(`https://${value}`);
    return url.hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return null;
  }
}

function isBlockedDomain(domain: string): boolean {
  return BLOCKED_DOMAINS.some((blocked) => domain === blocked || domain.endsWith(`.${blocked}`));
}

function getSearchQuery(companyName: string, hints?: SourceMetadata): string {
  return [companyName, hints?.headquarters, "official website"].filter(Boolean).join(" ");
}

function scoreCandidate(companyName: string, result: SearchResult): number {
  const normalizedCompany = normalizeName(companyName);
  const normalizedTitle = normalizeName(result.title);
  const normalizedDomain = normalizeName(result.domain.replace(/\.[a-z]{2,}$/i, ""));
  let score = 0;

  if (normalizedTitle.includes(normalizedCompany)) score += 6;
  if (normalizedDomain.includes(normalizedCompany)) score += 8;

  const companyTokens = normalizedCompany.split(" ").filter((token) => token.length > 2);
  for (const token of companyTokens) {
    if (normalizedTitle.includes(token)) score += 1;
    if (normalizedDomain.includes(token)) score += 2;
  }

  if (/official|home/i.test(result.title)) score += 2;
  return score;
}

function countMatchingCompanyTokens(companyName: string, value: string): number {
  const normalizedCompany = normalizeName(companyName);
  const normalizedValue = normalizeName(value);
  const tokens = normalizedCompany.split(" ").filter((token) => token.length > 2);
  return tokens.filter((token) => normalizedValue.includes(token)).length;
}

async function inspectHomepage(url: string): Promise<{
  finalUrl: string;
  title: string;
  siteName: string;
} | null> {
  try {
    const response = await withRetry(
      () =>
        fetch(url, {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
          },
          redirect: "follow",
          signal: AbortSignal.timeout(12_000),
        }),
      { attempts: 2, delayMs: 1000 }
    );

    if (!response.ok) return null;
    const html = await response.text();
    const $ = cheerio.load(html);
    const title = $("title").text().trim();
    const siteName =
      $('meta[property="og:site_name"]').attr("content")?.trim()
      ?? $('meta[name="application-name"]').attr("content")?.trim()
      ?? "";

    return {
      finalUrl: response.url,
      title,
      siteName,
    };
  } catch {
    return null;
  }
}

async function searchCompanyWebsite(
  companyName: string,
  hints?: SourceMetadata
): Promise<SearchResult | null> {
  if (!SERPAPI_KEY) {
    throw new Error("SERPAPI_KEY is not configured");
  }

  const query = getSearchQuery(companyName, hints);
  const url = new URL(SERPAPI_URL);
  url.searchParams.set("engine", "google");
  url.searchParams.set("q", query);
  url.searchParams.set("api_key", SERPAPI_KEY);
  url.searchParams.set("hl", "en");
  url.searchParams.set("gl", "us");
  url.searchParams.set("google_domain", "google.com");
  url.searchParams.set("num", "5");

  const response = await withRetry(() => fetch(url, { signal: AbortSignal.timeout(15_000) }), {
    attempts: 3,
    delayMs: 1000,
  });

  if (!response.ok) {
    throw new Error(`Search failed for ${companyName}: ${response.status}`);
  }

  const payload = (await response.json()) as {
    error?: string;
    organic_results?: Array<{
      title?: string;
      link?: string;
    }>;
  };

  if (payload.error) {
    throw new Error(`Search failed for ${companyName}: ${payload.error}`);
  }

  return scoreSearchResults(companyName, hints, payload.organic_results?.map((result) => ({
    title: result.title?.trim() || "",
    link: result.link ?? "",
  })) ?? []);
}

async function searchCompanyWebsiteWithDuckDuckGo(
  companyName: string,
  hints?: SourceMetadata
): Promise<SearchResult | null> {
  const query = getSearchQuery(companyName, hints);
  const body = new URLSearchParams({
    q: query,
    kl: "us-en",
  });

  const response = await withRetry(
    () =>
      fetch(DUCKDUCKGO_HTML_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        },
        body: body.toString(),
        signal: AbortSignal.timeout(15_000),
      }),
    { attempts: 2, delayMs: 1000 }
  );

  if (!response.ok) {
    throw new Error(`DuckDuckGo search failed for ${companyName}: ${response.status}`);
  }

  const html = await response.text();
  const $ = cheerio.load(html);
  const scrapedResults: Array<{ title: string; link: string }> = [];

  $("a.result__a, .result__title a, a[href*='uddg=']").each((_, element) => {
    const href = $(element).attr("href") ?? "";
    let link = href;

    try {
      const parsed = new URL(href, DUCKDUCKGO_HTML_URL);
      const uddg = parsed.searchParams.get("uddg");
      if (uddg) link = decodeURIComponent(uddg);
    } catch {
      link = href;
    }

    scrapedResults.push({
      title: $(element).text().trim(),
      link,
    });
  });

  return scoreSearchResults(companyName, hints, scrapedResults);
}

async function scoreSearchResults(
  companyName: string,
  hints: SourceMetadata | undefined,
  rawResults: Array<{ title: string; link: string }>
): Promise<SearchResult | null> {
  const results: SearchResult[] = [];
  for (const result of rawResults) {
    const link = result.link ?? "";
    const domain = normalizeHostname(link);
    if (!domain || isBlockedDomain(domain)) continue;

    const origin = (() => {
      try {
        return new URL(link).origin;
      } catch {
        return link;
      }
    })();

    results.push({
      title: result.title?.trim() || domain,
      url: origin,
      domain,
    });
  }

  const deduped = Array.from(
    new Map(results.map((result) => [result.domain, result])).values()
  );
  const scored: Array<SearchResult & { score: number; verifiedCompanyMatch: boolean }> = [];

  for (const result of deduped.slice(0, 5)) {
    let score = scoreCandidate(companyName, result);
    let verifiedCompanyMatch =
      normalizeName(result.domain.replace(/\.[a-z]{2,}$/i, "")).includes(normalizeName(companyName))
      || countMatchingCompanyTokens(companyName, result.title) >= 2;
    const homepage = await inspectHomepage(result.url);
    if (homepage) {
      const title = normalizeName(homepage.title);
      const siteName = normalizeName(homepage.siteName);
      const normalizedCompany = normalizeName(companyName);

      if (title.includes(normalizedCompany)) score += 8;
      if (siteName.includes(normalizedCompany)) score += 8;
      if (
        title.includes(normalizedCompany)
        || siteName.includes(normalizedCompany)
        || countMatchingCompanyTokens(companyName, homepage.title) >= 2
        || countMatchingCompanyTokens(companyName, homepage.siteName) >= 2
      ) {
        verifiedCompanyMatch = true;
      }

      if (hints?.headquarters) {
        const headquarters = normalizeName(hints.headquarters);
        if (title.includes(headquarters) || siteName.includes(headquarters)) score += 1;
      }

      result.url = homepage.finalUrl;
      result.domain = normalizeHostname(homepage.finalUrl) ?? result.domain;
      result.title = homepage.title || result.title;
    }

    scored.push({ ...result, score, verifiedCompanyMatch });
  }

  scored.sort((a, b) => b.score - a.score);
  const best = scored[0];
  if (!best) return null;
  return best.verifiedCompanyMatch && best.score >= 8 ? best : null;
}

async function searchCompanyWebsiteWithFallback(
  companyName: string,
  hints?: SourceMetadata
): Promise<SearchResult | null> {
  try {
    return await searchCompanyWebsite(companyName, hints);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!message.includes("429")) {
      throw error;
    }
  }

  return searchCompanyWebsiteWithDuckDuckGo(companyName, hints);
}

async function fetchAllCompanies(): Promise<CompanyRow[]> {
  const supabase = createServiceClient();
  const rows: CompanyRow[] = [];
  const pageSize = 1000;

  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from("companies")
      .select("id, name, domain, website, updated_at")
      .order("created_at", { ascending: true })
      .range(from, from + pageSize - 1);

    if (error) throw error;
    const batch = (data ?? []) as CompanyRow[];
    rows.push(...batch);
    if (batch.length < pageSize) break;
  }

  return rows;
}

async function fetchSourceHints(): Promise<Map<string, SourceMetadata>> {
  const supabase = createServiceClient();
  const hints = new Map<string, SourceMetadata>();
  const pageSize = 1000;

  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from("company_sources")
      .select("company_id, metadata_json")
      .eq("source_type", "ft1000")
      .range(from, from + pageSize - 1);

    if (error) throw error;
    const batch = (data ?? []) as Array<{
      company_id: string;
      metadata_json: Record<string, unknown> | null;
    }>;

    for (const row of batch) {
      const metadata = row.metadata_json ?? {};
      hints.set(row.company_id, {
        headquarters:
          typeof metadata.headquarters === "string" ? metadata.headquarters : undefined,
        category:
          typeof metadata.category === "string" ? metadata.category : undefined,
      });
    }

    if (batch.length < pageSize) break;
  }

  return hints;
}

function pickCanonicalRow(rows: CompanyRow[]): CompanyRow {
  return [...rows].sort((a, b) => {
    const aHasSite = Number(Boolean(a.website || a.domain));
    const bHasSite = Number(Boolean(b.website || b.domain));
    if (aHasSite !== bHasSite) return bHasSite - aHasSite;

    const aUpdated = new Date(a.updated_at ?? 0).getTime();
    const bUpdated = new Date(b.updated_at ?? 0).getTime();
    return bUpdated - aUpdated;
  })[0];
}

function loadCheckpoint(checkpointPath: string): ProgressState | null {
  if (!existsSync(checkpointPath)) return null;

  try {
    return JSON.parse(readFileSync(checkpointPath, "utf-8")) as ProgressState;
  } catch {
    return null;
  }
}

function saveCheckpoint(checkpointPath: string, state: ProgressState) {
  writeFileSync(checkpointPath, `${JSON.stringify(state, null, 2)}\n`, "utf-8");
}

function clearCheckpoint(checkpointPath: string) {
  saveCheckpoint(checkpointPath, {
    nextIndex: 0,
    updatedCompanies: 0,
    searched: 0,
    skipped: 0,
    lastProcessedKey: null,
    updatedAt: new Date().toISOString(),
  });
}

async function run() {
  const supabase = createServiceClient();
  const dryRun = hasFlag("--dry-run");
  const limit = Number(getArg("--limit") ?? "0");
  const offset = Number(getArg("--offset") ?? "0");
  const resume = hasFlag("--resume");
  const checkpointPath = getCheckpointPath();
  const checkpoint = resume ? loadCheckpoint(checkpointPath) : null;

  const companies = await fetchAllCompanies();
  const sourceHints = await fetchSourceHints();
  const grouped = new Map<string, CompanyRow[]>();

  for (const company of companies) {
    const key = normalizeName(company.name);
    const list = grouped.get(key) ?? [];
    list.push(company);
    grouped.set(key, list);
  }

  let groups = Array.from(grouped.entries())
    .map(([key, rows]) => ({ key, rows }))
    .filter(({ rows }) => rows.some((row) => !row.website || !row.domain))
    .sort((a, b) => a.key.localeCompare(b.key));

  const startIndex = checkpoint ? checkpoint.nextIndex : offset;
  groups = groups.slice(startIndex, limit > 0 ? startIndex + limit : undefined);

  let searched = checkpoint?.searched ?? 0;
  let updatedCompanies = checkpoint?.updatedCompanies ?? 0;
  let skipped = checkpoint?.skipped ?? 0;
  let processed = 0;

  for (const group of groups) {
    const { key, rows } = group;
    const sample = rows[0];
    const canonical = pickCanonicalRow(rows);
    const hint = rows
      .map((row) => sourceHints.get(row.id))
      .find(Boolean);
    const existing = rows.find((row) => row.website && row.domain);
    let website = existing?.website ?? null;
    let domain = existing?.domain ?? null;
    const currentIndex = startIndex + processed;

    if (!website || !domain) {
      searched++;
      try {
        const result = await searchCompanyWebsiteWithFallback(sample.name, hint);
        if (!result) {
          skipped++;
          saveCheckpoint(checkpointPath, {
            nextIndex: currentIndex + 1,
            updatedCompanies,
            searched,
            skipped,
            lastProcessedKey: key,
            updatedAt: new Date().toISOString(),
          });
          processed++;
          continue;
        }
        website = result.url;
        domain = result.domain;
      } catch (error) {
        console.warn("[enrich-web] Search failed", sample.name, String(error));
        skipped++;
        saveCheckpoint(checkpointPath, {
          nextIndex: currentIndex + 1,
          updatedCompanies,
          searched,
          skipped,
          lastProcessedKey: key,
          updatedAt: new Date().toISOString(),
        });
        processed++;
        continue;
      }
    }

    if (!website || !domain) {
      skipped++;
      saveCheckpoint(checkpointPath, {
        nextIndex: currentIndex + 1,
        updatedCompanies,
        searched,
        skipped,
        lastProcessedKey: key,
        updatedAt: new Date().toISOString(),
      });
      processed++;
      continue;
    }

    if (dryRun) {
      const wouldUpdate = rows.filter(
        (row) => !row.website || !row.domain || row.website !== website || row.domain !== domain
      );
      console.log(
        JSON.stringify({
          name: sample.name,
          website,
          domain,
          wouldUpdateCount: wouldUpdate.length,
          companyIds: wouldUpdate.map((row) => row.id),
        })
      );
      updatedCompanies += wouldUpdate.length;
      saveCheckpoint(checkpointPath, {
        nextIndex: currentIndex + 1,
        updatedCompanies,
        searched,
        skipped,
        lastProcessedKey: key,
        updatedAt: new Date().toISOString(),
      });
      processed++;
      continue;
    }

    const rowsNeedingUpdate = rows.filter(
      (row) => !row.website || !row.domain || row.website !== website || row.domain !== domain
    );
    if (rowsNeedingUpdate.length > 0) {
      try {
        for (const row of rowsNeedingUpdate) {
          await applyCompanyWebUpdate({
            companyId: row.id,
            sourceType: "search_enrichment",
            sourceValue: sample.name,
            confidence: "medium",
            website,
            domain,
            metadata: {
              company_name: sample.name,
              search_provider: "serpapi_duckduckgo_fallback",
            },
          });
        }
        updatedCompanies += rowsNeedingUpdate.length;
      } catch (error) {
        console.warn(
          "[enrich-web] Update failed",
          sample.name,
          error instanceof Error ? error.message : String(error)
        );
        skipped++;
        saveCheckpoint(checkpointPath, {
          nextIndex: currentIndex + 1,
          updatedCompanies,
          searched,
          skipped,
          lastProcessedKey: key,
          updatedAt: new Date().toISOString(),
        });
        processed++;
        continue;
      }
    }

    saveCheckpoint(checkpointPath, {
      nextIndex: currentIndex + 1,
      updatedCompanies,
      searched,
      skipped,
      lastProcessedKey: key,
      updatedAt: new Date().toISOString(),
    });
    processed++;
  }

  if (!dryRun && groups.length > 0 && processed === groups.length) {
    clearCheckpoint(checkpointPath);
  }

  console.log(
    `[enrich-web] Groups processed this run: ${processed}. Searches run total: ${searched}. Companies updated total: ${updatedCompanies}. Skipped total: ${skipped}. Checkpoint: ${checkpointPath}.`
  );
}

run().catch((error) => {
  console.error("[enrich-web] Fatal:", error);
  process.exit(1);
});
