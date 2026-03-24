/**
 * Ingestion worker: run all connectors, match companies, insert events.
 * Run with: npm run worker:ingest (or tsx workers/run-ingestion.ts)
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { createServiceClient } from "@/lib/supabase/service";
import { careerPagesConnector } from "@/lib/connectors/career-pages";
import { ft1000CareersConnector } from "@/lib/connectors/ft1000-careers";
import { greenhouseHiringConnector } from "@/lib/connectors/greenhouse-hiring";
import { leverHiringConnector } from "@/lib/connectors/lever-hiring";
import { ashbyHiringConnector } from "@/lib/connectors/ashby-hiring";
import { fundingNewsConnector } from "@/lib/connectors/funding-news";
import { fundingPagesConnector } from "@/lib/connectors/funding-pages";
import { matchCompany } from "@/lib/ingestion/company-match";
import { withRetry } from "@/lib/retry";
import { isKnownParkingUrl } from "@/lib/connectors/parked-domain-filter";
import type { RawIngestionEvent } from "@/types/ingestion";
import type { Company } from "@/types/database";

const CORE_CONNECTORS = [
  careerPagesConnector,
  greenhouseHiringConnector,
  leverHiringConnector,
  ashbyHiringConnector,
  fundingNewsConnector,
];

const HEAVY_CONNECTORS = [
  fundingPagesConnector,
];

const STATIC_CONNECTORS = [
  ft1000CareersConnector,
];

function getLogger() {
  const start = new Date().toISOString();
  return {
    start,
    log(msg: string, data?: Record<string, unknown>) {
      const out = data ? `${msg} ${JSON.stringify(data)}` : msg;
      console.log(`[ingestion ${start}] ${out}`);
    },
  };
}

function isValidRawEvent(raw: unknown): raw is RawIngestionEvent {
  if (!raw || typeof raw !== "object") return false;
  const o = raw as Record<string, unknown>;
  return (
    typeof o.source_type === "string" &&
    typeof o.source_url === "string" &&
    typeof o.company_name_raw === "string" &&
    typeof o.event_type === "string" &&
    typeof o.detected_at === "string"
  );
}

/** Use company origin/domain for website, never the full article URL. */
function deriveCompanyWebFromSourceUrl(
  sourceUrl: string | undefined,
  companyDomain: string | null | undefined
): { domain: string | null; website: string | null } {
  if (!sourceUrl?.startsWith("http")) {
    return { domain: companyDomain ?? null, website: null };
  }
  try {
    const u = new URL(sourceUrl);
    const host = u.hostname.replace(/^www\./, "");
    const origin = `${u.protocol}//${u.host}`;
    const domain = companyDomain ?? host;
    return { domain, website: origin };
  } catch {
    return { domain: companyDomain ?? null, website: sourceUrl };
  }
}

async function ensureCompany(
  supabase: ReturnType<typeof createServiceClient>,
  companies: Pick<Company, "id" | "name" | "domain">[],
  raw: RawIngestionEvent
): Promise<string> {
  const matched = matchCompany(raw, companies);
  if (matched) return matched;

  const { domain, website } = deriveCompanyWebFromSourceUrl(raw.source_url, raw.company_domain);
  const { data: inserted, error } = await supabase
    .from("companies")
    .insert({
      name: raw.company_name_raw,
      domain: domain ?? null,
      website: website ?? null,
    })
    .select("id, name, domain")
    .single();

  if (error) throw new Error(error.message ?? "Failed to upsert company");
  if (!inserted?.id) throw new Error("Failed to create company");
  companies.push({
    id: inserted.id,
    name: inserted.name ?? raw.company_name_raw,
    domain: inserted.domain ?? domain ?? null,
  });
  return inserted.id;
}

async function loadCompanies(
  supabase: ReturnType<typeof createServiceClient>
): Promise<Pick<Company, "id" | "name" | "domain">[]> {
  const { data, error } = await supabase
    .from("companies")
    .select("id, name, domain")
    .limit(5000);

  if (error) throw new Error(error.message ?? "Failed to load companies");
  return (data ?? []) as Pick<Company, "id" | "name" | "domain">[];
}

async function loadExistingEventKeys(
  supabase: ReturnType<typeof createServiceClient>,
  rawEvents: RawIngestionEvent[]
): Promise<{ externalIds: Set<string>; sourcePairs: Set<string> }> {
  const EXTERNAL_ID_BATCH_SIZE = 250;
  const externalIds = Array.from(
    new Set(rawEvents.map((raw) => raw.external_id).filter((value): value is string => Boolean(value)))
  );
  const sourcePairs = new Set<string>();

  if (externalIds.length > 0) {
    const existingExternalIds = new Set<string>();

    for (let index = 0; index < externalIds.length; index += EXTERNAL_ID_BATCH_SIZE) {
      const batch = externalIds.slice(index, index + EXTERNAL_ID_BATCH_SIZE);
      const { data, error } = await supabase
        .from("events")
        .select("external_id")
        .in("external_id", batch);
      if (error) throw new Error(error.message ?? "Failed to load existing event ids");

      for (const row of data ?? []) {
        if (row.external_id) existingExternalIds.add(row.external_id);
      }
    }

    return {
      externalIds: existingExternalIds,
      sourcePairs,
    };
  }

  for (const raw of rawEvents) {
    sourcePairs.add(`${raw.source_url}::${raw.event_type}`);
  }

  return {
    externalIds: new Set<string>(),
    sourcePairs,
  };
}

export async function run(options?: { includeStaticConnectors?: boolean }) {
  const log = getLogger();
  const supabase = createServiceClient();
  const connectors = options?.includeStaticConnectors
    ? [...CORE_CONNECTORS, ...HEAVY_CONNECTORS, ...STATIC_CONNECTORS]
    : CORE_CONNECTORS;
  const companies = await loadCompanies(supabase);
  let totalInserted = 0;
  let totalSkipped = 0;

  for (const connector of connectors) {
    let rawEvents: RawIngestionEvent[];
    try {
      rawEvents = await withRetry(() => connector.fetch(), { attempts: 3, delayMs: 2000 });
    } catch (err) {
      log.log("Connector fetch failed after retries", { sourceType: connector.sourceType, err: String(err) });
      continue;
    }
    if (!Array.isArray(rawEvents)) {
      log.log("Connector returned non-array", { sourceType: connector.sourceType });
      continue;
    }
    log.log(`Connector ${connector.sourceType} fetched ${rawEvents.length} raw events`);

    let existingEventKeys: { externalIds: Set<string>; sourcePairs: Set<string> };
    try {
      existingEventKeys = await loadExistingEventKeys(supabase, rawEvents);
    } catch (err) {
      log.log("Failed to load existing event keys", { sourceType: connector.sourceType, err: String(err) });
      continue;
    }

    for (const raw of rawEvents) {
      if (!isValidRawEvent(raw)) {
        log.log("Skipping invalid raw event", { sourceType: connector.sourceType });
        continue;
      }
      if (raw.source_url && isKnownParkingUrl(raw.source_url)) {
        log.log("Skipping parked domain", { source_url: raw.source_url, company: raw.company_name_raw });
        totalSkipped++;
        continue;
      }
      try {
        const sourcePair = `${raw.source_url}::${raw.event_type}`;
        const exists = raw.external_id
          ? existingEventKeys.externalIds.has(raw.external_id)
          : existingEventKeys.sourcePairs.has(sourcePair);
        if (exists) {
          totalSkipped++;
          continue;
        }

        const company_id = await ensureCompany(supabase, companies, raw);
        const { error } = await supabase.from("events").insert({
          source_type: connector.sourceType,
          source_url: raw.source_url,
          external_id: raw.external_id ?? null,
          company_name_raw: raw.company_name_raw,
          company_id,
          event_type: raw.event_type,
          metadata_json: raw.metadata ?? {},
          detected_at: raw.detected_at,
        });
        if (error) {
          log.log("Event insert error", { error: error.message, source_url: raw.source_url });
          continue;
        }

        if (raw.external_id) {
          existingEventKeys.externalIds.add(raw.external_id);
        } else {
          existingEventKeys.sourcePairs.add(sourcePair);
        }
        totalInserted++;
      } catch (e) {
        log.log("Event processing error", { err: String(e), source_url: raw.source_url });
      }
    }
  }

  log.log("Ingestion complete", { totalInserted, totalSkippedAlreadyExist: totalSkipped });
}

if (typeof process !== "undefined" && !process.env.NEXT_RUNTIME) {
  run().catch((err) => {
    console.error("[ingestion] Fatal:", err);
    process.exit(1);
  });
}
