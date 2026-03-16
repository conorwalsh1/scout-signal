import type { SourceConnector } from "./types";
import type { RawIngestionEvent } from "@/types/ingestion";
import * as cheerio from "cheerio";

/**
 * FT1000-style companies: Europe's fastest-growing (name + domain).
 * In production, replace with FT subscription data or another list source.
 */
const FT1000_STYLE_COMPANIES: { name: string; domain: string }[] = [
  { name: "Revolut", domain: "revolut.com" },
  { name: "N26", domain: "n26.com" },
  { name: "Klarna", domain: "klarna.com" },
  { name: "Spotify", domain: "spotify.com" },
  { name: "Deliveroo", domain: "deliveroo.com" },
  { name: "Wise", domain: "wise.com" },
  { name: "Monzo", domain: "monzo.com" },
  { name: "Checkout.com", domain: "checkout.com" },
  { name: "Adyen", domain: "adyen.com" },
  { name: "Farfetch", domain: "farfetch.com" },
  { name: "Darktrace", domain: "darktrace.com" },
  { name: "Graphcore", domain: "graphcore.ai" },
  { name: "Bolt", domain: "bolt.eu" },
  { name: "Vinted", domain: "vinted.com" },
  { name: "Glovo", domain: "glovoapp.com" },
  { name: "Cazoo", domain: "cazoo.co.uk" },
  { name: "OakNorth", domain: "oaknorth.com" },
  { name: "Babylon Health", domain: "babylonhealth.com" },
  { name: "Hopin", domain: "hopin.com" },
];

const CAREER_PATHS = ["/careers", "/jobs", "/career", "/job-openings", "/join-us", "/about/careers", "/work-with-us"];

function extractJobCount($: cheerio.CheerioAPI): number | null {
  const body = $("body").text();
  const match = body.match(/(\d+)\s*(?:open\s+)?(?:positions?|roles?|jobs?)\s*(?:open|available|vacancies?)?/i)
    ?? body.match(/(?:positions?|roles?|jobs?)\s*[:\s]*(\d+)/i)
    ?? body.match(/we\'?re\s+hiring\s+(\d+)/i);
  if (match) return Math.min(parseInt(match[1], 10), 500);
  const links = $('a[href*="job"], a[href*="career"], a[href*="position"], a[href*="role"]').length;
  if (links > 0) return links;
  return null;
}

export const ft1000CareersConnector: SourceConnector = {
  sourceType: "ft1000_career",

  async fetch(): Promise<RawIngestionEvent[]> {
    const events: RawIngestionEvent[] = [];
    const now = new Date().toISOString();

    for (const company of FT1000_STYLE_COMPANIES) {
      const domain = company.domain.replace(/^https?:\/\//, "").trim();
      const baseUrl = `https://${domain}`;
      let jobCount: number | null = null;
      let sourceUrl = baseUrl;

      for (const path of CAREER_PATHS) {
        try {
          const url = `${baseUrl}${path}`;
          const res = await fetch(url, {
            headers: { "User-Agent": "ScoutSignal/1.0 (compatible; career-page scan)" },
            redirect: "follow",
            signal: AbortSignal.timeout(10_000),
          });
          if (!res.ok) continue;
          const html = await res.text();
          const $ = cheerio.load(html);
          const count = extractJobCount($);
          if (count != null) {
            jobCount = count;
            sourceUrl = url;
            break;
          }
        } catch {
          continue;
        }
      }

      if (jobCount == null) jobCount = 1;
      const title = `${company.name} — ${jobCount} open role${jobCount !== 1 ? "s" : ""}`;
      events.push({
        source_type: "ft1000_career",
        source_url: sourceUrl,
        external_id: `ft1000:${domain}:${now.slice(0, 10)}`,
        company_name_raw: company.name,
        company_domain: domain,
        event_type: "job_post_detected",
        metadata: { title, job_count: jobCount, listing_source: "ft1000" },
        detected_at: now,
      });
    }

    return events;
  },
};
