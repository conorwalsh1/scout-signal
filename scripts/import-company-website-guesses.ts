/**
 * Import website/domain guesses from a scraped CSV and write validated matches
 * into companies + company_web_sources.
 *
 * Expected CSV headers:
 *   id,name,domain,website,created_at,updated_at
 *
 * Usage:
 *   npm run db:import-website-guesses -- --file /path/to/companies_with_websites_guess.csv
 *   npm run db:import-website-guesses -- --file /path/to/file.csv --dry-run
 *   npm run db:import-website-guesses -- --file /path/to/file.csv --verify-live
 *   npm run db:import-website-guesses -- --file /path/to/file.csv --overwrite
 */
import { config } from "dotenv";

config({ path: ".env.local" });

import { existsSync, readFileSync } from "fs";
import { resolve } from "path";
import { createServiceClient } from "../lib/supabase/service";
import { applyCompanyWebUpdate } from "../lib/company-web-source";

type CsvRow = {
  id: string;
  name: string;
  domain: string | null;
  website: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type CompanyRow = {
  id: string;
  name: string;
  domain: string | null;
  website: string | null;
};

type HomepageCheck = {
  finalUrl: string;
  title: string;
};

type Confidence = "medium" | "high";

const BLOCKED_DOMAINS = [
  "greenhouse.io",
  "lever.co",
  "workable.com",
  "linkedin.com",
  "facebook.com",
  "instagram.com",
  "x.com",
  "twitter.com",
  "youtube.com",
  "wikipedia.org",
  "bloomberg.com",
  "crunchbase.com",
  "pitchbook.com",
  "glassdoor.com",
  "indeed.com",
  "ft.com",
  "statista.com",
  "google.com",
  "bing.com",
];

function getArg(flag: string): string | null {
  const index = process.argv.indexOf(flag);
  return index >= 0 && process.argv[index + 1] ? process.argv[index + 1] : null;
}

function hasFlag(flag: string): boolean {
  return process.argv.includes(flag);
}

function getMinConfidence(): Confidence {
  const value = (getArg("--min-confidence") ?? "medium").trim().toLowerCase();
  return value === "high" ? "high" : "medium";
}

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const next = line[i + 1];

    if (char === '"' && inQuotes && next === '"') {
      current += '"';
      i++;
      continue;
    }

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === "," && !inQuotes) {
      out.push(current);
      current = "";
      continue;
    }

    current += char;
  }

  out.push(current);
  return out.map((value) => value.trim());
}

function readCsvRows(filePath: string): CsvRow[] {
  const absolutePath = resolve(filePath);
  if (!existsSync(absolutePath)) {
    throw new Error(`CSV file not found: ${absolutePath}`);
  }

  const lines = readFileSync(absolutePath, "utf-8")
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0);

  if (lines.length < 2) return [];

  const header = parseCsvLine(lines[0] ?? "");
  const indexByHeader = new Map(header.map((value, index) => [value, index]));

  return lines.slice(1).map((line) => {
    const cells = parseCsvLine(line);
    const get = (key: string) => {
      const index = indexByHeader.get(key);
      return typeof index === "number" ? cells[index] ?? "" : "";
    };

    const clean = (value: string) => {
      const trimmed = value.trim();
      return trimmed.length > 0 ? trimmed : null;
    };

    return {
      id: get("id"),
      name: get("name"),
      domain: clean(get("domain")),
      website: clean(get("website")),
      created_at: clean(get("created_at")),
      updated_at: clean(get("updated_at")),
    };
  });
}

function normalizeName(value: string): string {
  return value
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^\w\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeDomain(value: string | null): string | null {
  if (!value) return null;
  try {
    const input = value.startsWith("http") ? value : `https://${value}`;
    return new URL(input).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return null;
  }
}

function normalizeWebsite(value: string | null, domainHint?: string | null): string | null {
  const input = value ?? domainHint;
  if (!input) return null;

  try {
    const parsed = new URL(input.startsWith("http") ? input : `https://${input}`);
    return parsed.origin.endsWith("/") ? parsed.origin : `${parsed.origin}/`;
  } catch {
    return null;
  }
}

function isBlockedDomain(domain: string): boolean {
  return BLOCKED_DOMAINS.some((blocked) => domain === blocked || domain.endsWith(`.${blocked}`));
}

function isUsableDomain(domain: string): boolean {
  if (!/^[a-z0-9.-]+$/.test(domain)) return false;
  if (!domain.includes(".")) return false;
  if (domain.startsWith(".") || domain.endsWith(".")) return false;
  if (domain.includes("..")) return false;
  const parts = domain.split(".");
  const tld = parts[parts.length - 1] ?? "";
  return tld.length >= 2;
}

function tokenMatches(companyName: string, candidate: string): number {
  const companyTokens = normalizeName(companyName).split(" ").filter((token) => token.length > 2);
  const normalizedCandidate = normalizeName(candidate);
  return companyTokens.filter((token) => normalizedCandidate.includes(token)).length;
}

function looksLikeCompanyMatch(companyName: string, domain: string): boolean {
  const normalizedCompany = normalizeName(companyName);
  const withoutTld = domain.replace(/\.[a-z]{2,}$/i, "").replace(/[.-]/g, " ");

  if (normalizeName(withoutTld).includes(normalizedCompany)) return true;
  return tokenMatches(companyName, withoutTld) >= 1;
}

async function verifyHomepage(website: string): Promise<HomepageCheck | null> {
  try {
    const response = await fetch(website, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(12_000),
    });

    if (!response.ok) return null;
    const html = await response.text();
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = titleMatch?.[1]?.trim() ?? "";

    return {
      finalUrl: response.url,
      title,
    };
  } catch {
    return null;
  }
}

async function fetchCompanies(ids: string[]): Promise<Map<string, CompanyRow>> {
  const supabase = createServiceClient();
  const out = new Map<string, CompanyRow>();
  const batchSize = 250;

  for (let i = 0; i < ids.length; i += batchSize) {
    const batch = ids.slice(i, i + batchSize);
    const { data, error } = await supabase
      .from("companies")
      .select("id, name, domain, website")
      .in("id", batch);

    if (error) throw error;

    for (const row of (data ?? []) as CompanyRow[]) {
      out.set(row.id, row);
    }
  }

  return out;
}

async function run() {
  const file = getArg("--file");
  if (!file) {
    throw new Error("Missing --file /path/to/companies_with_websites_guess.csv");
  }

  const dryRun = hasFlag("--dry-run");
  const overwrite = hasFlag("--overwrite");
  const verifyLive = hasFlag("--verify-live");
  const minConfidence = getMinConfidence();
  const rows = readCsvRows(file);
  const companyMap = await fetchCompanies(rows.map((row) => row.id));

  let accepted = 0;
  let skipped = 0;
  let failedVerification = 0;

  for (const row of rows) {
    if (!row.id || !row.name) {
      skipped++;
      continue;
    }

    const company = companyMap.get(row.id);
    if (!company) {
      skipped++;
      continue;
    }

    if (!overwrite && company.website && company.domain) {
      skipped++;
      continue;
    }

    const domain = normalizeDomain(row.domain) ?? normalizeDomain(row.website);
    const website = normalizeWebsite(row.website, domain);

    if (
      !domain ||
      !website ||
      !isUsableDomain(domain) ||
      isBlockedDomain(domain) ||
      !looksLikeCompanyMatch(company.name, domain)
    ) {
      skipped++;
      continue;
    }

    let confidence: Confidence = "medium";
    let verification: HomepageCheck | null = null;

    if (verifyLive) {
      verification = await verifyHomepage(website);
      if (!verification) {
        failedVerification++;
        skipped++;
        continue;
      }

      const verifiedDomain = normalizeDomain(verification.finalUrl);
      if (
        !verifiedDomain ||
        !isUsableDomain(verifiedDomain) ||
        isBlockedDomain(verifiedDomain) ||
        !looksLikeCompanyMatch(company.name, verifiedDomain)
      ) {
        failedVerification++;
        skipped++;
        continue;
      }

      if (tokenMatches(company.name, verification.title) >= 1 || tokenMatches(company.name, verifiedDomain) >= 2) {
        confidence = "high";
      }
    } else if (tokenMatches(company.name, domain) >= 2) {
      confidence = "high";
    }

    if (minConfidence === "high" && confidence !== "high") {
      skipped++;
      continue;
    }

    if (dryRun) {
      console.log(
        JSON.stringify({
          id: company.id,
          name: company.name,
          website,
          domain,
          confidence,
          verified: verification?.finalUrl ?? null,
          minConfidence,
        })
      );
      accepted++;
      continue;
    }

    await applyCompanyWebUpdate({
      companyId: company.id,
      sourceType: "scraped_csv_guess",
      sourceValue: row.website ?? row.domain ?? row.name,
      confidence,
      website,
      domain,
      metadata: {
        source_file: resolve(file),
        imported_name: row.name,
        verify_live: verifyLive,
        verified_final_url: verification?.finalUrl ?? null,
        verified_title: verification?.title ?? null,
      },
    });

    accepted++;
    console.log(`updated ${company.name} -> ${domain}`);
  }

  console.log(
    `[import-website-guesses] Done. Accepted: ${accepted}. Skipped: ${skipped}. Failed verification: ${failedVerification}. Min confidence: ${minConfidence}.`
  );
}

run().catch((error) => {
  console.error("[import-website-guesses] Fatal:", error);
  process.exit(1);
});
