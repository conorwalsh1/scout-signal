/**
 * Fetch FT1000 ranking data and write scripts/data/ft1000.json.
 *
 * Default source URL points at the latest fully published ranking page
 * we know about as of 2026-03-15. Override with --url if needed.
 *
 * Run with:
 *   npm run db:fetch-ft1000
 *   npm run db:fetch-ft1000 -- --url https://...
 *   npm run db:fetch-ft1000 -- --out scripts/data/ft1000.json
 */
import { writeFileSync } from "fs";
import { resolve } from "path";
import { chromium, type Page } from "playwright";

interface FT1000Row {
  name: string;
  domain?: string | null;
  website?: string | null;
  rank?: number;
  headquarters?: string | null;
  category?: string | null;
  cagr?: number;
  founding_year?: number;
  revenue_2023_in_eur?: number;
  revenue_2020_in_eur?: number;
  employees_2023?: number;
  employees_2020?: number;
}

const DEFAULT_URL =
  "https://rankings.statista.com/en/fastest-growing-companies/rankings/fastest-growing-companies-europe-2025/";
const DEFAULT_OUT = "scripts/data/ft1000.json";

interface RankingApiRow {
  rank?: number;
  name?: string | number;
  cagr?: number;
  headquarters?: string;
  category?: string;
  revenue_2023_in_eur?: number;
  revenue_2020_in_eur?: number;
  employees_2023?: number;
  employees_2020?: number;
  founding_year?: number;
}

interface RankingApiPayload {
  pagination?: {
    page?: number;
    page_size?: number;
    total_items?: number;
    total_pages?: number;
  };
  data?: RankingApiRow[];
}

function getArg(flag: string): string | null {
  const index = process.argv.indexOf(flag);
  return index >= 0 && process.argv[index + 1] ? process.argv[index + 1] : null;
}

function normalizeUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (/^[a-z0-9.-]+\.[a-z]{2,}/i.test(trimmed)) return `https://${trimmed}`;
  return null;
}

function hostnameFromValue(value: string | null | undefined): string | null {
  const url = normalizeUrl(value);
  if (!url) return null;
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return null;
  }
}

function pickString(record: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

function pickNumber(record: Record<string, unknown>, keys: string[]): number | undefined {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && /^\d+$/.test(value.trim())) return Number(value.trim());
  }
  return undefined;
}

function normalizeCandidate(record: Record<string, unknown>): FT1000Row | null {
  const name = pickString(record, [
    "company",
    "companyName",
    "name",
    "title",
    "company_name",
    "Company",
    "Name",
  ]);
  if (!name) return null;

  const websiteRaw = pickString(record, [
    "website",
    "url",
    "homepage",
    "domain",
    "web",
    "Website",
    "URL",
  ]);
  const website = normalizeUrl(websiteRaw);
  const domain = hostnameFromValue(websiteRaw);
  const rank = pickNumber(record, [
    "rank",
    "position",
    "place",
    "ranking",
    "Rank",
    "Position",
  ]);

  return {
    name,
    domain,
    website,
    rank,
  };
}

function collectObjectArrays(value: unknown, arrays: Record<string, unknown>[][] = []): Record<string, unknown>[][] {
  if (Array.isArray(value)) {
    if (value.every((item) => item && typeof item === "object" && !Array.isArray(item))) {
      arrays.push(value as Record<string, unknown>[]);
    }
    for (const item of value) collectObjectArrays(item, arrays);
    return arrays;
  }

  if (value && typeof value === "object") {
    for (const nested of Object.values(value as Record<string, unknown>)) {
      collectObjectArrays(nested, arrays);
    }
  }

  return arrays;
}

function scoreArray(items: Record<string, unknown>[]): number {
  let score = 0;
  for (const item of items.slice(0, 20)) {
    const keys = Object.keys(item);
    if (keys.some((key) => /company|name/i.test(key))) score += 3;
    if (keys.some((key) => /rank|position|place/i.test(key))) score += 3;
    if (keys.some((key) => /website|url|domain|homepage/i.test(key))) score += 2;
  }
  return score + Math.min(items.length, 1000) / 100;
}

function normalizeRowsFromPayloads(payloads: unknown[]): FT1000Row[] {
  const arrays = payloads.flatMap((payload) => collectObjectArrays(payload));
  const rankedArrays = arrays
    .map((items) => ({
      items,
      score: scoreArray(items),
    }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score);

  const best = rankedArrays[0]?.items ?? [];
  return dedupeRows(best.map(normalizeCandidate).filter((row): row is FT1000Row => !!row));
}

function dedupeRows(rows: FT1000Row[]): FT1000Row[] {
  const seen = new Set<string>();
  const normalized = rows
    .filter((row) => row.name.trim().length > 1)
    .sort((a, b) => (a.rank ?? Number.MAX_SAFE_INTEGER) - (b.rank ?? Number.MAX_SAFE_INTEGER));

  const deduped: FT1000Row[] = [];
  for (const row of normalized) {
    const key = `${row.rank ?? "na"}:${row.name.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(row);
  }
  return deduped;
}

function rowsFromApiPayload(payloads: RankingApiPayload[]): FT1000Row[] {
  return dedupeRows(
    payloads.flatMap((payload) =>
      (payload.data ?? [])
        .map((row) => {
          const name =
            typeof row.name === "string"
              ? row.name.trim()
              : typeof row.name === "number"
                ? String(row.name)
                : "";
          return {
            name,
            rank: typeof row.rank === "number" ? row.rank : undefined,
            domain: null,
            website: null,
            headquarters: typeof row.headquarters === "string" ? row.headquarters : null,
            category: typeof row.category === "string" ? row.category : null,
            cagr: typeof row.cagr === "number" ? row.cagr : undefined,
            founding_year: typeof row.founding_year === "number" ? row.founding_year : undefined,
            revenue_2023_in_eur: typeof row.revenue_2023_in_eur === "number" ? row.revenue_2023_in_eur : undefined,
            revenue_2020_in_eur: typeof row.revenue_2020_in_eur === "number" ? row.revenue_2020_in_eur : undefined,
            employees_2023: typeof row.employees_2023 === "number" ? row.employees_2023 : undefined,
            employees_2020: typeof row.employees_2020 === "number" ? row.employees_2020 : undefined,
          };
        })
        .filter((row) => row.name)
    )
  );
}

async function clickIfVisible(page: Page, selectors: string[]) {
  for (const selector of selectors) {
    const locator = page.locator(selector).first();
    if (await locator.count()) {
      try {
        await locator.click({ timeout: 2_000 });
        return;
      } catch {
        continue;
      }
    }
  }
}

async function extractRowsFromDom(page: Page): Promise<FT1000Row[]> {
  return page.evaluate(() => {
    const rows: FT1000Row[] = [];
    const seen = new Set<string>();

    const tableRows = Array.from(document.querySelectorAll("table tbody tr, [role='row']"));
    for (const row of tableRows) {
      const cells = Array.from(row.querySelectorAll("td, [role='cell']"))
        .map((cell) => cell.textContent?.trim() ?? "")
        .filter(Boolean);
      if (cells.length < 2) continue;

      const rank = /^\d+$/.test(cells[0] ?? "") ? Number(cells[0]) : undefined;
      const name = cells.find((cell, index) => index > 0 && /[a-z]/i.test(cell));
      const link = row.querySelector<HTMLAnchorElement>("a[href]");
      const website = link?.href?.startsWith("http") ? link.href : null;
      const domain = website ? new URL(website).hostname.replace(/^www\./, "").toLowerCase() : null;

      if (!name) continue;
      const key = `${rank ?? "na"}:${name.toLowerCase()}`;
      if (seen.has(key)) continue;
      seen.add(key);
      rows.push({ name, rank, website, domain });
    }

    return rows;
  });
}

async function run() {
  const sourceUrl = getArg("--url") ?? DEFAULT_URL;
  const outFile = resolve(process.cwd(), getArg("--out") ?? DEFAULT_OUT);

  console.log("Fetching FT1000 data from", sourceUrl);
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  });

  const jsonPayloads: unknown[] = [];
  let firstTableUrl: string | null = null;
  let firstTablePayload: RankingApiPayload | null = null;
  page.on("response", async (response) => {
    try {
      const url = response.url();
      const contentType = response.headers()["content-type"] ?? "";
      if (!contentType.includes("application/json")) return;
      const payload = await response.json();
      jsonPayloads.push(payload);

      if (!firstTableUrl && url.includes("/api/ranking/table-data")) {
        firstTableUrl = url;
        firstTablePayload = payload as RankingApiPayload;
      }
    } catch {
      // Ignore non-JSON or inaccessible responses.
    }
  });

  await page.goto(sourceUrl, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.waitForTimeout(4_000);

  await clickIfVisible(page, [
    "text=Accept",
    "text=I agree",
    "button:has-text('Accept')",
    "button:has-text('Agree')",
    "[aria-label='Accept']",
  ]);
  await clickIfVisible(page, [
    "text=Explore ranking",
    "button:has-text('Explore ranking')",
    "a:has-text('Explore ranking')",
    "text=Show ranking",
  ]);

  for (let i = 0; i < 5; i++) {
    await page.mouse.wheel(0, 2500);
    await page.waitForTimeout(1_500);
  }

  let rows: FT1000Row[] = [];
  const tablePayload = firstTablePayload as RankingApiPayload | null;
  const totalPages = tablePayload?.pagination?.total_pages ?? 0;

  if (firstTableUrl && totalPages > 0) {
    const baseApiUrl = new URL(firstTableUrl);
    const apiPayloads: RankingApiPayload[] = [];

    for (let pageNumber = 1; pageNumber <= totalPages; pageNumber++) {
      baseApiUrl.searchParams.set("page", String(pageNumber));
      const response = await fetch(baseApiUrl.toString(), {
        headers: {
          Accept: "application/json",
          Referer: sourceUrl,
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        },
      });
      if (!response.ok) {
        throw new Error(`Ranking API request failed for page ${pageNumber}: ${response.status}`);
      }
      apiPayloads.push((await response.json()) as RankingApiPayload);
    }

    rows = rowsFromApiPayload(apiPayloads);
  }

  if (rows.length === 0) {
    rows = normalizeRowsFromPayloads(jsonPayloads);
  }
  if (rows.length === 0) {
    rows = dedupeRows(await extractRowsFromDom(page));
  }

  await browser.close();

  if (rows.length === 0) {
    throw new Error(
      "Could not extract FT1000 rows from the page. Try passing --url explicitly or inspect the source page structure."
    );
  }

  const hydrated = rows.map((row, index) => ({
    name: row.name,
    domain: row.domain ?? null,
    website: row.website ?? (row.domain ? `https://${row.domain}` : null),
    rank: row.rank ?? index + 1,
    headquarters: row.headquarters ?? null,
    category: row.category ?? null,
    cagr: row.cagr,
    founding_year: row.founding_year,
    revenue_2023_in_eur: row.revenue_2023_in_eur,
    revenue_2020_in_eur: row.revenue_2020_in_eur,
    employees_2023: row.employees_2023,
    employees_2020: row.employees_2020,
  }));

  writeFileSync(outFile, `${JSON.stringify(hydrated, null, 2)}\n`, "utf-8");
  console.log(`Wrote ${hydrated.length} companies to ${outFile}`);
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
