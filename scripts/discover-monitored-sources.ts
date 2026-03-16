import { config } from "dotenv";
config({ path: ".env.local" });

import * as cheerio from "cheerio";
import { existsSync, readFileSync, writeFileSync } from "fs";
import { resolve } from "path";
import { createServiceClient } from "@/lib/supabase/service";
import { upsertMonitoredSource } from "@/lib/source-registry";

type SupportedSourceType = "greenhouse_hiring" | "lever_hiring" | "ashby_hiring";

type DiscoveredSource = {
  source_type: SupportedSourceType;
  source_key: string;
  source_url: string;
};

const CAREER_PATHS = [
  "/careers",
  "/jobs",
  "/career",
  "/join-us",
  "/about/careers",
  "/work-with-us",
  "/company/careers",
];

const CAREERS_HOST_PREFIXES = [
  "careers",
  "jobs",
  "join",
  "work",
  "workwithus",
  "talent",
];

const DEFAULT_CHECKPOINT_PATH = resolve(
  process.cwd(),
  "scripts/data/discover-sources-progress.json"
);

type ProgressState = {
  nextIndex: number;
  processed: number;
  discovered: number;
  lastCompanyName: string | null;
  updatedAt: string;
};

function parseArgs() {
  const args = process.argv.slice(2);
  const limitIndex = args.indexOf("--limit");
  const limit = limitIndex >= 0 ? Number(args[limitIndex + 1] ?? "25") : 25;
  const dryRun = args.includes("--dry-run");
  const concurrencyIndex = args.indexOf("--concurrency");
  const concurrency = concurrencyIndex >= 0 ? Number(args[concurrencyIndex + 1] ?? "5") : 5;
  const resume = args.includes("--resume");
  return {
    limit: Number.isFinite(limit) && limit > 0 ? limit : 25,
    dryRun,
    resume,
    concurrency: Number.isFinite(concurrency) && concurrency > 0 ? Math.min(10, concurrency) : 5,
  };
}

function normalizeUrl(input: string | null | undefined): string | null {
  if (!input) return null;
  try {
    return new URL(input.startsWith("http") ? input : `https://${input}`).toString();
  } catch {
    return null;
  }
}

function unique<T>(values: T[]): T[] {
  return Array.from(new Set(values));
}

function discoverSourceFromUrl(rawUrl: string): DiscoveredSource | null {
  const url = normalizeUrl(rawUrl);
  if (!url) return null;
  const parsed = new URL(url);
  const host = parsed.hostname.replace(/^www\./, "").toLowerCase();
  const pathParts = parsed.pathname.split("/").filter(Boolean);

  if (host === "boards.greenhouse.io" && pathParts[0]) {
    return {
      source_type: "greenhouse_hiring",
      source_key: pathParts[0],
      source_url: `https://boards.greenhouse.io/${pathParts[0]}`,
    };
  }

  if (host === "jobs.lever.co" && pathParts[0]) {
    return {
      source_type: "lever_hiring",
      source_key: pathParts[0],
      source_url: `https://jobs.lever.co/${pathParts[0]}`,
    };
  }

  if (host === "jobs.ashbyhq.com" && pathParts[0]) {
    return {
      source_type: "ashby_hiring",
      source_key: pathParts[0],
      source_url: `https://jobs.ashbyhq.com/${pathParts[0]}`,
    };
  }

  return null;
}

async function fetchHtml(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, {
      headers: { "User-Agent": "ScoutSignal/1.0 (compatible; source discovery)" },
      redirect: "follow",
      signal: AbortSignal.timeout(8_000),
    });
    if (!response.ok) return null;
    return await response.text();
  } catch {
    return null;
  }
}

function getCheckpointPath(): string {
  return DEFAULT_CHECKPOINT_PATH;
}

function loadProgress(path: string): ProgressState | null {
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, "utf8")) as ProgressState;
  } catch {
    return null;
  }
}

function saveProgress(path: string, state: ProgressState): void {
  writeFileSync(path, JSON.stringify(state, null, 2));
}

function extractDiscoveriesFromHtml(body: string): string[] {
  const candidates: string[] = [];
  const embeddedPatterns = [
    /https?:\/\/boards\.greenhouse\.io\/[A-Za-z0-9_-]+/g,
    /https?:\/\/jobs\.lever\.co\/[A-Za-z0-9_-]+/g,
    /https?:\/\/jobs\.ashbyhq\.com\/[A-Za-z0-9_-]+/g,
    /api\.lever\.co\/v0\/postings\/([A-Za-z0-9_-]+)/g,
    /boards-api\.greenhouse\.io\/v1\/boards\/([A-Za-z0-9_-]+)/g,
  ];
  for (const pattern of embeddedPatterns) {
    for (const match of Array.from(body.matchAll(pattern))) {
      const raw = match[0];
      const key = match[1];
      if (raw.startsWith("http")) {
        candidates.push(raw);
        continue;
      }
      if (pattern.source.includes("lever") && key) {
        candidates.push(`https://jobs.lever.co/${key}`);
      }
      if (pattern.source.includes("greenhouse") && key) {
        candidates.push(`https://boards.greenhouse.io/${key}`);
      }
    }
  }
  for (const match of Array.from(body.matchAll(/https?:\/\/(?:boards\.greenhouse\.io|jobs\.lever\.co|jobs\.ashbyhq\.com)\/[A-Za-z0-9_-]+/g))) {
    candidates.push(match[0]);
  }
  return candidates;
}

async function collectDiscoveries(baseWebsite: string): Promise<DiscoveredSource[]> {
  const base = new URL(baseWebsite);
  const rootDomain = base.hostname.replace(/^www\./, "");
  const pages = unique([
    baseWebsite,
    ...CAREER_PATHS.map((path) => new URL(path, baseWebsite).toString()),
    ...CAREERS_HOST_PREFIXES.map((prefix) => `${base.protocol}//${prefix}.${rootDomain}`),
  ]);
  const candidates: string[] = [];
  const discoveries = new Map<string, DiscoveredSource>();

  for (const pageUrl of pages) {
    const html = await fetchHtml(pageUrl);
    if (!html) continue;
    const $ = cheerio.load(html);
    $("a[href], iframe[src], script[src]").each((_, element) => {
      const href = $(element).attr("href") ?? $(element).attr("src");
      if (!href) return;
      let absolute: string | null = null;
      try {
        absolute = normalizeUrl(new URL(href, pageUrl).toString());
      } catch {
        absolute = null;
      }
      if (absolute) candidates.push(absolute);
    });
    const body = $.html();
    for (const raw of extractDiscoveriesFromHtml(body)) {
      candidates.push(raw);
    }
    for (const rawUrl of unique(candidates)) {
      const source = discoverSourceFromUrl(rawUrl);
      if (!source) continue;
      discoveries.set(`${source.source_type}:${source.source_key}`, source);
    }
    if (discoveries.size > 0) {
      return Array.from(discoveries.values());
    }
  }

  for (const rawUrl of unique(candidates)) {
    const source = discoverSourceFromUrl(rawUrl);
    if (!source) continue;
    discoveries.set(`${source.source_type}:${source.source_key}`, source);
  }

  return Array.from(discoveries.values());
}

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let nextIndex = 0;

  async function runWorker() {
    while (nextIndex < items.length) {
      const currentIndex = nextIndex++;
      results[currentIndex] = await worker(items[currentIndex], currentIndex);
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => runWorker()));
  return results;
}

async function run() {
  const { limit, dryRun, resume, concurrency } = parseArgs();
  const supabase = createServiceClient();
  const checkpointPath = getCheckpointPath();
  const progress = resume ? loadProgress(checkpointPath) : null;

  const { data: companies, error } = await supabase
    .from("companies")
    .select("id, name, website, domain")
    .not("website", "is", null)
    .order("updated_at", { ascending: false })
    .limit(limit * 5);

  if (error) throw error;

  const allRows = (companies ?? [])
    .filter((row) => typeof row.website === "string" && row.website.length > 0)
    .slice(0, Math.max(limit, (progress?.nextIndex ?? 0) + limit)) as Array<{
      id: string;
      name: string;
      website: string;
      domain: string | null;
    }>;
  const startIndex = progress?.nextIndex ?? 0;
  const rows = allRows.slice(startIndex, startIndex + limit);

  let discoveredCount = progress?.discovered ?? 0;
  const results = await mapWithConcurrency(rows, concurrency, async (company) => {
    const discoveries = await collectDiscoveries(company.website);
    for (const source of discoveries) {
      if (!dryRun) {
        await upsertMonitoredSource({
          company_name: company.name,
          company_domain: company.domain,
          source_type: source.source_type,
          source_key: source.source_key,
          source_url: source.source_url,
          metadata_json: {
            discovered_from: "website_scan",
            company_id: company.id,
            website: company.website,
          },
          active: true,
        });
      }
    }
    return { company, discoveries };
  });

  for (let offset = 0; offset < results.length; offset += 1) {
    const { company, discoveries } = results[offset];
    if (discoveries.length > 0) {
      for (const source of discoveries) {
        if (dryRun) {
          console.log(`[dry-run] ${company.name} -> ${source.source_type} ${source.source_key}`);
        }
      }
      discoveredCount += discoveries.length;
    }
    saveProgress(checkpointPath, {
      nextIndex: startIndex + offset + 1,
      processed: startIndex + offset + 1,
      discovered: discoveredCount,
      lastCompanyName: company.name,
      updatedAt: new Date().toISOString(),
    });
  }

  console.log(
    `[source-discovery] Processed ${rows.length} companies from index ${startIndex}. Discovered ${discoveredCount} source entries${dryRun ? " (dry run)" : ""}.`
  );
}

run().catch((error) => {
  console.error("[source-discovery] Fatal:", error);
  process.exit(1);
});
