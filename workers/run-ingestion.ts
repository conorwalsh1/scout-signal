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
import { matchCompany } from "@/lib/ingestion/company-match";
import { withRetry } from "@/lib/retry";
import type { RawIngestionEvent } from "@/types/ingestion";
import type { Company } from "@/types/database";

const CONNECTORS = [
  careerPagesConnector,
  ft1000CareersConnector,
  greenhouseHiringConnector,
  leverHiringConnector,
  ashbyHiringConnector,
  fundingNewsConnector,
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
  raw: RawIngestionEvent
): Promise<string> {
  const { data: existing } = await supabase
    .from("companies")
    .select("id, name, domain")
    .limit(5000);

  const companies = (existing ?? []) as Pick<Company, "id" | "name" | "domain">[];
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
    .select("id")
    .single();

  if (error) throw new Error(error.message ?? "Failed to upsert company");
  if (!inserted?.id) throw new Error("Failed to create company");
  return inserted.id;
}

async function eventExists(
  supabase: ReturnType<typeof createServiceClient>,
  source_url: string,
  event_type: string,
  external_id: string | null
): Promise<boolean> {
  if (external_id) {
    const { data } = await supabase
      .from("events")
      .select("id")
      .eq("external_id", external_id)
      .limit(1)
      .single();
    return !!data;
  }
  const { data } = await supabase
    .from("events")
    .select("id")
    .eq("source_url", source_url)
    .eq("event_type", event_type)
    .limit(1)
    .single();
  return !!data;
}

export async function run() {
  const log = getLogger();
  const supabase = createServiceClient();
  let totalInserted = 0;
  let totalSkipped = 0;

  for (const connector of CONNECTORS) {
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

    for (const raw of rawEvents) {
      if (!isValidRawEvent(raw)) {
        log.log("Skipping invalid raw event", { sourceType: connector.sourceType });
        continue;
      }
      try {
        const exists = await eventExists(
            supabase,
            raw.source_url,
            raw.event_type,
            raw.external_id ?? null
          );
          if (exists) {
            totalSkipped++;
            continue;
          }

          const company_id = await ensureCompany(supabase, raw);
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
