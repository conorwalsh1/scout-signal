/**
 * One-time fix: companies created from funding_news with an article headline as name,
 * or with the full article URL stored as website. Sets name to source domain and
 * website/domain to the site origin (not the article URL).
 * Run with: npx tsx scripts/fix-funding-company-names.ts
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { createServiceClient } from "../lib/supabase/service";

function domainToDisplayName(url: string): string {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, "");
    const base = host.split(".").slice(-2).join(".");
    const name = base.split(".")[0];
    if (!name) return host;
    return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
  } catch {
    return "News source";
  }
}

function originAndDomain(url: string): { website: string; domain: string } | null {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, "");
    const origin = `${u.protocol}//${u.host}`;
    return { website: origin, domain: host };
  } catch {
    return null;
  }
}

function looksLikeHeadline(name: string): boolean {
  const t = name.trim();
  if (t.length < 40) return false;
  const words = t.split(/\s+/).length;
  if (words < 5) return false;
  const companySuffix = /\s+(Inc|LLC|Ltd|Corp|Co\.?|Limited|GmbH)$/i;
  if (companySuffix.test(t)) return false;
  return true;
}

/** True if URL has a path beyond the root (looks like an article). */
function isArticleUrl(url: string): boolean {
  try {
    const u = new URL(url);
    const path = (u.pathname || "/").replace(/\/$/, "") || "";
    return path.length > 1;
  } catch {
    return false;
  }
}

async function run() {
  const supabase = createServiceClient();

  const { data: events, error: eventsErr } = await supabase
    .from("events")
    .select("company_id, source_url")
    .eq("source_type", "funding_news");

  if (eventsErr) {
    console.error(eventsErr);
    process.exit(1);
  }

  const byCompany = new Map<string, string>();
  for (const e of events ?? []) {
    if (e.company_id && e.source_url) byCompany.set(e.company_id, e.source_url);
  }

  let updated = 0;
  for (const [companyId, sourceUrl] of Array.from(byCompany.entries())) {
    const { data: company, error: companyErr } = await supabase
      .from("companies")
      .select("id, name, website, domain")
      .eq("id", companyId)
      .single();

    if (companyErr || !company) continue;

    const od = originAndDomain(sourceUrl);
    const updates: { name?: string; website?: string; domain?: string; updated_at: string } = {
      updated_at: new Date().toISOString(),
    };

    if (looksLikeHeadline(company.name ?? "")) {
      updates.name = domainToDisplayName(sourceUrl);
    }
    if (od && (isArticleUrl(company.website ?? "") || isArticleUrl(sourceUrl))) {
      updates.website = od.website;
      updates.domain = od.domain;
    }

    if (Object.keys(updates).length <= 1) continue;

    const { error: updateErr } = await supabase
      .from("companies")
      .update(updates)
      .eq("id", companyId);

    if (updateErr) {
      console.warn("Update failed", companyId, updateErr.message);
      continue;
    }
    if (updates.name) console.log(`Renamed "${(company.name ?? "").slice(0, 50)}..." -> "${updates.name}"`);
    if (updates.website) console.log(`  website/domain -> ${updates.website} / ${updates.domain}`);
    updated++;
  }

  console.log("Done. Companies updated:", updated);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
