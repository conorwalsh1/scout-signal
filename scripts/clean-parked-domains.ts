/**
 * Removes events, signals, and companies sourced from parked/for-sale domains.
 * Run: npm run db:clean-parked
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { createServiceClient } from "@/lib/supabase/service";

const PARKING_HOSTS = [
  "hugedomains.com",
  "godaddy.com",
  "afternic.com",
  "sedo.com",
  "dan.com",
  "undeveloped.com",
  "bodis.com",
  "parkingcrew.net",
  "above.com",
  "domainmarket.com",
  "buydomains.com",
  "namecheap.com",
  "fabulous.com",
  "domainlore.co.uk",
  "networksolutions.com",
  "parked.com",
  "register.com",
  "domainnamesales.com",
  "domainname.com",
  "domainnameshop.com",
];

function isParkedSourceUrl(url: string | null): boolean {
  if (!url) return false;
  try {
    const host = new URL(url).hostname.replace(/^www\./, "").toLowerCase();
    return PARKING_HOSTS.some((p) => host === p || host.endsWith(`.${p}`));
  } catch {
    return false;
  }
}

async function main() {
  const supabase = createServiceClient();

  console.log("Scanning events for parked domain sources...");
  const { data: events, error } = await supabase
    .from("events")
    .select("id, source_url, company_id, company_name_raw")
    .not("source_url", "is", null);

  if (error) {
    console.error("Failed to load events:", error.message);
    process.exit(1);
  }

  const parkedEvents = (events ?? []).filter((e) => isParkedSourceUrl(e.source_url));
  console.log(`Found ${parkedEvents.length} events from parked domains`);

  if (parkedEvents.length === 0) {
    console.log("Nothing to clean.");
    return;
  }

  const parkedEventIds = parkedEvents.map((e) => e.id);
  const affectedCompanyIds = new Set(parkedEvents.map((e) => e.company_id).filter(Boolean) as string[]);

  // Delete signals linked to these events
  const { count: signalCount } = await supabase
    .from("signals")
    .delete({ count: "exact" })
    .in("event_id", parkedEventIds);
  console.log(`Deleted ${signalCount ?? 0} signals from parked sources`);

  // Delete the events themselves
  const { count: eventCount } = await supabase
    .from("events")
    .delete({ count: "exact" })
    .in("id", parkedEventIds);
  console.log(`Deleted ${eventCount ?? 0} parked events`);

  // Check if any affected companies now have zero events — if so, remove them
  let orphanCount = 0;
  for (const companyId of Array.from(affectedCompanyIds)) {
    const { count } = await supabase
      .from("events")
      .select("id", { count: "exact", head: true })
      .eq("company_id", companyId);

    if (count === 0) {
      // Remove scores, saved targets, and the company itself
      await supabase.from("company_scores").delete().eq("company_id", companyId);
      await supabase.from("saved_targets").delete().eq("company_id", companyId);
      const { error: delErr } = await supabase.from("companies").delete().eq("id", companyId);
      if (!delErr) orphanCount++;
    }
  }
  console.log(`Removed ${orphanCount} orphaned companies (no remaining events)`);
  console.log("Done.");
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
