import type { RawIngestionEvent } from "@/types/ingestion";

/**
 * A source connector fetches from an external source and returns
 * normalized raw events. It does not touch the database.
 */
export interface SourceConnector {
  readonly sourceType: string;
  fetch(): Promise<RawIngestionEvent[]>;
}
