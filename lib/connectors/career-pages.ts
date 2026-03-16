import type { SourceConnector } from "./types";
import type { RawIngestionEvent } from "@/types/ingestion";
import { createServiceClient } from "@/lib/supabase/service";
import * as cheerio from "cheerio";

const CAREER_PATHS = ["/careers", "/jobs", "/career", "/job-openings", "/join-us", "/about/careers", "/work-with-us"];

function extractJobCount($: cheerio.CheerioAPI): number | null {
  const body = $("body").text();
  const match =
    body.match(/(\d+)\s*(?:open\s+)?(?:positions?|roles?|jobs?)\s*(?:open|available|vacancies?)?/i) ??
    body.match(/(?:positions?|roles?|jobs?)\s*[:\s]*(\d+)/i) ??
    body.match(/we\'?re\s+hiring\s+(\d+)/i);
  if (match) return Math.min(parseInt(match[1], 10), 500);
  const links = $('a[href*="job"], a[href*="career"], a[href*="position"], a[href*="role"]').length;
  if (links > 0) return links;
  return null;
}

export const careerPagesConnector: SourceConnector = {
  sourceType: "career_page",

  async fetch(): Promise<RawIngestionEvent[]> {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("monitored_sources")
      .select("id, company_id, company_name, company_domain, source_url, active")
      .eq("source_type", "career_page")
      .eq("active", true);

    if (error || !data?.length) return [];

    const events: RawIngestionEvent[] = [];
    const nowIso = new Date().toISOString();

    for (const row of data) {
      const baseUrl =
        (row.source_url && row.source_url.startsWith("http")
          ? row.source_url
          : row.company_domain
          ? `https://${row.company_domain}`
          : null) ?? null;
      if (!baseUrl) continue;

      let jobCount: number | null = null;
      let usedUrl = baseUrl;
      let foundCareerPage = false;

      for (const path of CAREER_PATHS) {
        try {
          const url = baseUrl.endsWith("/") ? `${baseUrl.slice(0, -1)}${path}` : `${baseUrl}${path}`;
          const res = await fetch(url, {
            headers: { "User-Agent": "ScoutSignal/1.0 (compatible; career-page scan)" },
            redirect: "follow",
            signal: AbortSignal.timeout(10_000),
          });
          if (!res.ok) continue;
          foundCareerPage = true;
          const html = await res.text();
          const $ = cheerio.load(html);
          const count = extractJobCount($);
          if (count != null) {
            jobCount = count;
            usedUrl = url;
            break;
          }
        } catch {
          continue;
        }
      }

      if (!foundCareerPage) {
        continue;
      }

      if (jobCount == null) {
        jobCount = 1;
      }

      const title = `${row.company_name} — ${jobCount} open role${jobCount !== 1 ? "s" : ""}`;
      const domain =
        row.company_domain ??
        (() => {
          try {
            const u = new URL(usedUrl);
            return u.hostname.replace(/^www\./, "");
          } catch {
            return null;
          }
        })();

      events.push({
        source_type: "career_page",
        source_url: usedUrl,
        external_id: `career_page:${row.id}:${nowIso.slice(0, 10)}`,
        company_name_raw: row.company_name,
        company_domain: domain ?? undefined,
        event_type: "job_post_detected",
        metadata: {
          title,
          job_count: jobCount,
          listing_source: "career_page",
        },
        detected_at: nowIso,
      });
    }

    return events;
  },
};
