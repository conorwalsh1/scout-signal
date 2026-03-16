import type { SourceConnector } from "./types";
import type { RawIngestionEvent } from "@/types/ingestion";
import { classifyJobListing } from "@/lib/job-intelligence";
import { getActiveSourcesByType, updateSourceRegistryStatus } from "@/lib/source-registry";

const LEVER_API = "https://api.lever.co/v0/postings";

interface LeverPosting {
  id?: string;
  text?: string;
  hostedUrl?: string;
  categories?: {
    location?: string;
    team?: string;
    commitment?: string;
    allLocations?: string[];
  };
  workplaceType?: string;
}

export const leverHiringConnector: SourceConnector = {
  sourceType: "lever_hiring",

  async fetch(): Promise<RawIngestionEvent[]> {
    const events: RawIngestionEvent[] = [];
    const now = new Date().toISOString();
    const sites = await getActiveSourcesByType("lever_hiring");

    for (const site of sites) {
      try {
        const res = await fetch(`${LEVER_API}/${site.source_key}?mode=json`, {
          headers: { Accept: "application/json" },
          signal: AbortSignal.timeout(15_000),
        });
        if (!res.ok) {
          await updateSourceRegistryStatus("lever_hiring", site.source_key, "error", 0);
          continue;
        }
        const jobs = (await res.json()) as LeverPosting[];
        await updateSourceRegistryStatus("lever_hiring", site.source_key, "ok", jobs?.length ?? 0);
        for (const job of jobs ?? []) {
          const title = job.text?.trim();
          if (!title || !job.id) continue;
          const location = job.categories?.location
            ?? job.categories?.allLocations?.join(", ")
            ?? job.workplaceType
            ?? null;
          const classified = classifyJobListing({ title, location });
          events.push({
            source_type: "lever_hiring",
            source_url: job.hostedUrl ?? `https://jobs.lever.co/${site.source_key}/${job.id}`,
            external_id: `lever:${site.source_key}:${job.id}`,
            company_name_raw: site.company_name,
            company_domain: site.company_domain ?? null,
            event_type: "job_post_detected",
            metadata: {
              title,
              board_token: site.source_key,
              location,
              department: classified.department,
              departments: [classified.department],
              is_ai: classified.is_ai,
              is_remote: classified.is_remote,
              is_leadership: classified.is_leadership,
              leadership_role: classified.leadership_role,
              job_count: 1,
              listing_source: "lever",
            },
            detected_at: now,
          });
        }
      } catch {
        await updateSourceRegistryStatus("lever_hiring", site.source_key, "error", 0);
        continue;
      }
    }

    return events;
  },
};
