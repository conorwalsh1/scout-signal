import type { SourceConnector } from "./types";
import type { RawIngestionEvent } from "@/types/ingestion";

/**
 * Placeholder connector for public company career pages.
 * Returns empty array until a real source (e.g. list of URLs) is configured.
 * Replace with Cheerio/Playwright fetching when ready.
 */
export const careerPagesConnector: SourceConnector = {
  sourceType: "career_page",

  async fetch(): Promise<RawIngestionEvent[]> {
    // TODO: Load config (e.g. list of company career page URLs), fetch each, parse jobs.
    return [];
  },
};
