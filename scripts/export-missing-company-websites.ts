/**
 * Export companies still missing website/domain into a prioritized CSV for targeted cleanup.
 *
 * Usage:
 *   npm run db:export-missing-websites
 *   npm run db:export-missing-websites -- --limit 100
 *   npm run db:export-missing-websites -- --file scripts/data/missing-company-websites.csv
 */
import { config } from "dotenv";

config({ path: ".env.local" });

import { mkdirSync, writeFileSync } from "fs";
import { dirname, resolve } from "path";
import { createServiceClient } from "../lib/supabase/service";

type CompanyRow = {
  id: string;
  name: string;
  domain: string | null;
  website: string | null;
  company_sources:
    | Array<{
        source_type: string | null;
        source_external_id: string | null;
        metadata_json: Record<string, unknown> | null;
      }>
    | null;
};

function getArg(flag: string): string | null {
  const index = process.argv.indexOf(flag);
  return index >= 0 && process.argv[index + 1] ? process.argv[index + 1] : null;
}

function csvEscape(value: unknown): string {
  const stringValue = value == null ? "" : String(value);
  if (/[",\n]/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
}

function toRank(row: CompanyRow): number | null {
  const source = row.company_sources?.find((item) => item.source_type === "ft1000") ?? null;
  const externalId = source?.source_external_id;
  if (!externalId) return null;
  const parsed = Number(externalId);
  return Number.isFinite(parsed) ? parsed : null;
}

function getMetadata(row: CompanyRow): Record<string, unknown> {
  const source = row.company_sources?.find((item) => item.source_type === "ft1000") ?? null;
  return source?.metadata_json ?? {};
}

async function run() {
  const limit = Number(getArg("--limit") ?? "0");
  const filePath = resolve(
    getArg("--file") ?? "scripts/data/missing-company-websites.csv"
  );

  const supabase = createServiceClient();
  const pageSize = 1000;
  const rows: CompanyRow[] = [];

  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from("companies")
      .select(
        "id, name, domain, website, company_sources(source_type, source_external_id, metadata_json)"
      )
      .or("website.is.null,domain.is.null")
      .order("created_at", { ascending: true })
      .range(from, from + pageSize - 1);

    if (error) throw error;
    const batch = (data ?? []) as CompanyRow[];
    rows.push(...batch);
    if (batch.length < pageSize) break;
  }

  const prioritized = rows
    .map((row) => {
      const metadata = getMetadata(row);
      return {
        id: row.id,
        name: row.name,
        rank: toRank(row),
        website: row.website ?? "",
        domain: row.domain ?? "",
        headquarters: typeof metadata.headquarters === "string" ? metadata.headquarters : "",
        category: typeof metadata.category === "string" ? metadata.category : "",
        cagr: typeof metadata.cagr === "number" ? metadata.cagr : "",
      };
    })
    .sort((a, b) => {
      const aRank = a.rank ?? Number.MAX_SAFE_INTEGER;
      const bRank = b.rank ?? Number.MAX_SAFE_INTEGER;
      if (aRank !== bRank) return aRank - bRank;
      return a.name.localeCompare(b.name);
    });

  const trimmed = limit > 0 ? prioritized.slice(0, limit) : prioritized;
  const header = [
    "id",
    "name",
    "rank",
    "website",
    "domain",
    "headquarters",
    "category",
    "cagr",
  ];

  const lines = [
    header.join(","),
    ...trimmed.map((row) =>
      [
        row.id,
        row.name,
        row.rank ?? "",
        row.website,
        row.domain,
        row.headquarters,
        row.category,
        row.cagr,
      ]
        .map(csvEscape)
        .join(",")
    ),
  ];

  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(filePath, `${lines.join("\n")}\n`, "utf-8");

  console.log(
    `[export-missing-websites] Wrote ${trimmed.length} rows to ${filePath}. Remaining unresolved companies: ${rows.length}.`
  );
}

run().catch((error) => {
  console.error("[export-missing-websites] Fatal:", error);
  process.exit(1);
});
