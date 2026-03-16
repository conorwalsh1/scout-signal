import type { SourceConnector } from "./types";
import type { RawIngestionEvent } from "@/types/ingestion";
import { classifyJobListing } from "@/lib/job-intelligence";
import { getActiveSourcesByType, updateSourceRegistryStatus } from "@/lib/source-registry";

const GREENHOUSE_API = "https://boards-api.greenhouse.io/v1/boards";

interface GreenhouseJobsResponse {
  jobs?: Array<{ id: number; title: string; absolute_url?: string; location?: { name?: string } }>;
  meta?: { total?: number };
}

export const greenhouseHiringConnector: SourceConnector = {
  sourceType: "greenhouse_hiring",

  async fetch(): Promise<RawIngestionEvent[]> {
    const events: RawIngestionEvent[] = [];
    const now = new Date().toISOString();
    const boards = await getActiveSourcesByType("greenhouse_hiring");

    for (const board of boards) {
      const boardToken = board.source_key;
      const companyName = board.company_name;
      try {
        const res = await fetch(`${GREENHOUSE_API}/${boardToken}/jobs`, {
          headers: { Accept: "application/json" },
          signal: AbortSignal.timeout(15_000),
        });
        if (!res.ok) {
          await updateSourceRegistryStatus("greenhouse_hiring", boardToken, "error", 0);
          continue;
        }
        const data = (await res.json()) as GreenhouseJobsResponse;
        const jobs = data.jobs ?? [];
        const total = data.meta?.total ?? jobs.length;
        await updateSourceRegistryStatus("greenhouse_hiring", boardToken, "ok", total);
        if (total === 0) continue;

        const boardUrl = `https://boards.greenhouse.io/${boardToken}`;
        for (const job of jobs) {
          const classified = classifyJobListing({
            title: job.title,
            location: job.location?.name ?? null,
          });
          const title = job.title.trim() || `${companyName} role`;
          events.push({
            source_type: "greenhouse_hiring",
            source_url: job.absolute_url ?? boardUrl,
            external_id: `greenhouse:${job.id}`,
            company_name_raw: companyName,
            company_domain: board.company_domain ?? null,
            event_type: "job_post_detected",
            metadata: {
              title,
              board_token: boardToken,
              location: job.location?.name ?? null,
              department: classified.department,
              departments: [classified.department],
              is_ai: classified.is_ai,
              is_remote: classified.is_remote,
              is_leadership: classified.is_leadership,
              leadership_role: classified.leadership_role,
              job_count: 1,
            },
            detected_at: now,
          });
        }
      } catch {
        await updateSourceRegistryStatus("greenhouse_hiring", boardToken, "error", 0);
        // Skip this board on fetch/parse errors
      }
    }

    return events;
  },
};
