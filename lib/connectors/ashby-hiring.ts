import * as cheerio from "cheerio";
import type { SourceConnector } from "./types";
import type { RawIngestionEvent } from "@/types/ingestion";
import { classifyJobListing } from "@/lib/job-intelligence";
import { getActiveSourcesByType, updateSourceRegistryStatus } from "@/lib/source-registry";

function extractJobsFromAshbyPage(html: string, slug: string): Array<{ id: string; title: string; url: string; location: string | null }> {
  const $ = cheerio.load(html);
  const jobs = new Map<string, { id: string; title: string; url: string; location: string | null }>();

  $("a[href]").each((_, element) => {
    const href = $(element).attr("href") ?? "";
    const text = $(element).text().replace(/\s+/g, " ").trim();
    const absoluteUrl = href.startsWith("http") ? href : `https://jobs.ashbyhq.com${href}`;
    const match = absoluteUrl.match(new RegExp(`jobs\\.ashbyhq\\.com/${slug}/([^/?#]+)`));
    if (!match || !text || text.length < 3) return;

    const containerText = $(element).closest("li, article, div").text().replace(/\s+/g, " ").trim();
    const locationMatch = containerText.match(/\b(remote|hybrid|[A-Z][A-Za-z]+,\s*[A-Z][A-Za-z]+)\b/i);
    jobs.set(match[1], {
      id: match[1],
      title: text,
      url: absoluteUrl,
      location: locationMatch?.[1] ?? null,
    });
  });

  return Array.from(jobs.values());
}

export const ashbyHiringConnector: SourceConnector = {
  sourceType: "ashby_hiring",

  async fetch(): Promise<RawIngestionEvent[]> {
    const events: RawIngestionEvent[] = [];
    const now = new Date().toISOString();
    const boards = await getActiveSourcesByType("ashby_hiring");

    for (const board of boards) {
      try {
        const pageUrl = `https://jobs.ashbyhq.com/${board.source_key}`;
        const res = await fetch(pageUrl, {
          headers: { "User-Agent": "ScoutSignal/1.0 (compatible; Ashby board scan)" },
          redirect: "follow",
          signal: AbortSignal.timeout(15_000),
        });
        if (!res.ok) {
          await updateSourceRegistryStatus("ashby_hiring", board.source_key, "error", 0);
          continue;
        }
        const html = await res.text();
        const jobs = extractJobsFromAshbyPage(html, board.source_key);
        await updateSourceRegistryStatus("ashby_hiring", board.source_key, "ok", jobs.length);
        for (const job of jobs) {
          const classified = classifyJobListing({ title: job.title, location: job.location });
          events.push({
            source_type: "ashby_hiring",
            source_url: job.url,
            external_id: `ashby:${board.source_key}:${job.id}`,
            company_name_raw: board.company_name,
            company_domain: board.company_domain ?? null,
            event_type: "job_post_detected",
            metadata: {
              title: job.title,
              board_token: board.source_key,
              location: job.location,
              department: classified.department,
              departments: [classified.department],
              is_ai: classified.is_ai,
              is_remote: classified.is_remote,
              is_leadership: classified.is_leadership,
              leadership_role: classified.leadership_role,
              job_count: 1,
              listing_source: "ashby",
            },
            detected_at: now,
          });
        }
      } catch {
        await updateSourceRegistryStatus("ashby_hiring", board.source_key, "error", 0);
        continue;
      }
    }

    return events;
  },
};
