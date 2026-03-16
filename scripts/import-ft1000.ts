/**
 * Import FT1000 companies into companies and company_sources.
 * Run with: npx tsx scripts/import-ft1000.ts [--file path/to/ft1000.json]
 * Default file: scripts/data/ft1000.json (or ft1000.sample.json for shape).
 * Requires: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_KEY in .env.local.
 *
 * JSON shape: array of { name: string, domain?: string, website?: string, rank?: number }
 */
import { config } from "dotenv";
import { readFileSync } from "fs";
import { resolve } from "path";

config({ path: ".env.local" });

import { createServiceClient } from "../lib/supabase/service";
import { upsertCompanyWebSource } from "../lib/company-web-source";

const SOURCE_TYPE = "ft1000";
const FT1000_SOURCE_URL =
  "https://rankings.statista.com/en/fastest-growing-companies/rankings/fastest-growing-companies-europe-2025/";

interface FT1000Row {
  name: string;
  domain?: string | null;
  website?: string | null;
  rank?: number;
  metadata_json?: Record<string, unknown>;
}

function getWebsite(row: FT1000Row): string | null {
  if (row.website) return row.website;
  if (row.domain) return `https://${row.domain}`;
  return null;
}

function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[^\w\s-]/g, "")
    .trim();
}

async function findExistingCompanyId(
  supabase: ReturnType<typeof createServiceClient>,
  row: FT1000Row,
  sourceExternalId: string
): Promise<string | null> {
  if (row.domain) {
    const { data: existingByDomain } = await supabase
      .from("companies")
      .select("id")
      .eq("domain", row.domain)
      .maybeSingle();
    if (existingByDomain?.id) return existingByDomain.id;
  }

  const { data: existingSource } = await supabase
    .from("company_sources")
    .select("company_id")
    .eq("source_type", SOURCE_TYPE)
    .eq("source_external_id", sourceExternalId)
    .limit(1)
    .maybeSingle();
  if (existingSource?.company_id) return existingSource.company_id;

  const { data: existingByName } = await supabase
    .from("companies")
    .select("id, name")
    .ilike("name", row.name)
    .limit(20);
  const matchedByName = (existingByName ?? []).find(
    (company) => normalizeName(company.name) === normalizeName(row.name)
  );
  return matchedByName?.id ?? null;
}

function getFilePath(): string {
  const i = process.argv.indexOf("--file");
  if (i !== -1 && process.argv[i + 1])
    return resolve(process.cwd(), process.argv[i + 1]);
  return resolve(process.cwd(), "scripts/data/ft1000.json");
}

function loadData(filePath: string): FT1000Row[] {
  let raw: string;
  try {
    raw = readFileSync(filePath, "utf-8");
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") {
      console.error("File not found:", filePath);
      console.error("Add scripts/data/ft1000.json with 1000 rows, or run: npm run db:import-ft1000 -- --file path/to/ft1000.json");
      console.error("See scripts/data/ft1000.sample.json for the expected JSON shape.");
    }
    throw e;
  }
  const data = JSON.parse(raw);
  if (!Array.isArray(data)) throw new Error("JSON must be an array of { name, domain?, website?, rank? }");
  return data.map((row: unknown) => {
    const o = row as Record<string, unknown>;
    const name = typeof o.name === "string" ? o.name : String(o.name ?? "");
    if (!name.trim()) throw new Error("Each row must have a non-empty name");
    const metadataEntries = Object.entries(o).filter(([key]) => !["name", "domain", "website"].includes(key));
    return {
      name: name.trim(),
      domain: typeof o.domain === "string" ? o.domain.trim() || null : null,
      website: typeof o.website === "string" ? o.website.trim() || null : null,
      rank: typeof o.rank === "number" ? o.rank : undefined,
      metadata_json: Object.fromEntries(metadataEntries),
    };
  });
}

async function run() {
  const filePath = getFilePath();
  console.log("Loading", filePath, "...");
  const rows = loadData(filePath);
  console.log("Loaded", rows.length, "companies");

  const supabase = createServiceClient();
  let companiesInserted = 0;
  let sourcesInserted = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const domain = row.domain ?? null;
    const website = getWebsite(row);
    const sourceExternalId = String(row.rank ?? i + 1);

    let companyId: string;

    const existingCompanyId = await findExistingCompanyId(supabase, row, sourceExternalId);
    if (existingCompanyId) {
      companyId = existingCompanyId;
      const updatePayload: Record<string, unknown> = {
        name: row.name,
        updated_at: new Date().toISOString(),
      };
      if (domain) updatePayload.domain = domain;
      if (website) updatePayload.website = website;
      await supabase.from("companies").update(updatePayload).eq("id", companyId);
    } else {
      const { data: inserted, error } = await supabase
        .from("companies")
        .insert({ name: row.name, domain, website })
        .select("id")
        .single();
      if (error) {
        console.error("Company insert failed", row.name, error.message);
        continue;
      }
      companyId = inserted!.id;
      companiesInserted++;
    }

    if (domain || website) {
      await upsertCompanyWebSource({
        companyId,
        sourceType: "ft1000_seed",
        sourceValue: sourceExternalId,
        confidence: "high",
        website,
        domain,
        metadata: {
          name: row.name,
          rank: row.rank ?? i + 1,
        },
        verifiedAt: new Date().toISOString(),
      });
    }

    const { error: srcError } = await supabase.from("company_sources").upsert(
      {
        company_id: companyId,
        source_type: SOURCE_TYPE,
        source_external_id: sourceExternalId,
        metadata_json: {
          name: row.name,
          rank: row.rank ?? i + 1,
          ...(row.metadata_json ?? {}),
        },
      },
      { onConflict: "company_id,source_type" }
    );
    if (srcError) {
      console.error("Company source insert failed", row.name, srcError.message);
      continue;
    }
    sourcesInserted++;

    const nowIso = new Date().toISOString();
    const eventExternalId = `ft1000:${sourceExternalId}`;
    let eventId: string | null = null;
    const { data: existingEvent } = await supabase
      .from("events")
      .select("id")
      .eq("external_id", eventExternalId)
      .limit(1)
      .maybeSingle();

    if (existingEvent?.id) {
      eventId = existingEvent.id;
      await supabase
        .from("events")
        .update({
          company_name_raw: row.name,
          company_id: companyId,
          metadata_json: {
            source_type: SOURCE_TYPE,
            ...(row.metadata_json ?? {}),
          },
          detected_at: nowIso,
        })
        .eq("id", eventId);
    } else {
      const { data: insertedEvent, error: eventError } = await supabase
        .from("events")
        .insert({
          source_type: SOURCE_TYPE,
          source_url: FT1000_SOURCE_URL,
          external_id: eventExternalId,
          company_name_raw: row.name,
          company_id: companyId,
          event_type: "ft1000_listed",
          metadata_json: {
            source_type: SOURCE_TYPE,
            ...(row.metadata_json ?? {}),
          },
          detected_at: nowIso,
        })
        .select("id")
        .single();
      if (!eventError) eventId = insertedEvent?.id ?? null;
    }

    if (eventId) {
      const { data: existingSignal } = await supabase
        .from("signals")
        .select("id")
        .eq("company_id", companyId)
        .eq("event_id", eventId)
        .eq("signal_type", "ft1000_growth")
        .limit(1)
        .maybeSingle();

      if (!existingSignal?.id) {
        const rank = row.rank ?? i + 1;
        const weight = Math.max(5, 30 - Math.floor((rank - 1) / 40));
        await supabase.from("signals").insert({
          company_id: companyId,
          event_id: eventId,
          signal_type: "ft1000_growth",
          weight,
          confidence: "medium",
          occurred_at: nowIso,
        });
      }
    }

    await supabase.from("company_scores").upsert(
      { company_id: companyId, score: 0, score_components_json: {} },
      { onConflict: "company_id" }
    );
  }

  console.log("Done. Companies inserted:", companiesInserted, "| Company_sources rows:", sourcesInserted);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
