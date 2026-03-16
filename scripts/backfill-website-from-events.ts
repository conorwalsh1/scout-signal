/**
 * Backfill company website/domain from events when possible.
 * Uses event source_url origin (e.g. career page = company site). No search API required.
 * Run before db:enrich-web to fill in as many as possible from existing data.
 *
 * Usage:
 *   npx tsx scripts/backfill-website-from-events.ts
 *   npx tsx scripts/backfill-website-from-events.ts --dry-run
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { createServiceClient } from "../lib/supabase/service";
import { applyCompanyWebUpdate } from "../lib/company-web-source";

const BLOCKED_HOSTS = [
  "greenhouse.io",
  "lever.co",
  "workable.com",
  "linkedin.com",
  "wikipedia.org",
  "facebook.com",
  "twitter.com",
  "x.com",
  "bloomberg.com",
  "crunchbase.com",
  "techcrunch.com",
  "venturebeat.com",
  "reuters.com",
  "ft.com",
  "statista.com",
  "medium.com",
  "substack.com",
  "yahoo.com",
  "msn.com",
  "google.com",
  "bing.com",
];

function normalizeHost(url: string): string | null {
  try {
    const u = new URL(url.startsWith("http") ? url : `https://${url}`);
    return u.hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return null;
  }
}

function isBlocked(host: string): boolean {
  return BLOCKED_HOSTS.some(
    (b) => host === b || host.endsWith(`.${b}`)
  );
}

function originFromUrl(url: string): string | null {
  try {
    const u = new URL(url.startsWith("http") ? url : `https://${url}`);
    return u.origin;
  } catch {
    return null;
  }
}

async function run() {
  const supabase = createServiceClient();
  const dryRun = process.argv.includes("--dry-run");

  const { data: allCompanies, error: listError } = await supabase
    .from("companies")
    .select("id, name, website, domain");

  if (listError) {
    console.error("Failed to fetch companies:", listError.message);
    process.exit(1);
  }

  const missing = (allCompanies ?? []).filter(
    (c: { website: string | null; domain: string | null }) =>
      !(c.website ?? "").trim() || !(c.domain ?? "").trim()
  );

  console.log(`[backfill-events] Companies missing website or domain: ${missing.length}`);

  let updated = 0;
  let skipped = 0;
  const BATCH_SIZE = 250;
  const eventCandidates = new Map<string, Array<{ source_url: string; source_type: string | null }>>();

  for (let i = 0; i < missing.length; i += BATCH_SIZE) {
    const batch = missing.slice(i, i + BATCH_SIZE).map((company: { id: string }) => company.id);
    const { data: events, error: eventsError } = await supabase
      .from("events")
      .select("company_id, source_url, source_type")
      .in("company_id", batch)
      .not("source_url", "is", null)
      .order("detected_at", { ascending: false });

    if (eventsError) {
      console.error("Failed to fetch events batch:", eventsError.message);
      process.exit(1);
    }

    for (const event of events ?? []) {
      const companyId = (event as { company_id: string }).company_id;
      const list = eventCandidates.get(companyId) ?? [];
      list.push({
        source_url: (event as { source_url: string }).source_url,
        source_type: (event as { source_type: string | null }).source_type,
      });
      eventCandidates.set(companyId, list);
    }
  }

  for (const company of missing) {
    const events = eventCandidates.get(company.id)?.slice(0, 10);

    if (!events?.length) {
      skipped++;
      continue;
    }

    let website: string | null = null;
    let domain: string | null = null;

    for (const ev of events) {
      const url = (ev as { source_url: string }).source_url;
      if (!url?.startsWith("http")) continue;
      const host = normalizeHost(url);
      if (!host || isBlocked(host)) continue;
      const origin = originFromUrl(url);
      if (!origin) continue;
      website = origin;
      domain = host;
      break;
    }

    if (!website || !domain) {
      skipped++;
      continue;
    }

    if (dryRun) {
      console.log(`[dry-run] ${company.name} -> ${website}`);
      updated++;
      continue;
    }

    try {
      await applyCompanyWebUpdate({
        companyId: company.id,
        sourceType: "backfill_from_events",
        sourceValue: "event_source_url",
        confidence: "medium",
        website,
        domain,
        metadata: { script: "backfill-website-from-events" },
      });
      console.log(`  Updated: ${company.name} -> ${domain}`);
      updated++;
    } catch (err) {
      console.warn(`  Failed ${company.name}:`, err instanceof Error ? err.message : err);
      skipped++;
    }
  }

  console.log(`[backfill-events] Done. Updated: ${updated}. Skipped: ${skipped}.`);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
