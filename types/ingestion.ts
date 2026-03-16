/**
 * Raw event shape produced by source connectors.
 * Used before normalization and insert into events table.
 */
export interface RawIngestionEvent {
  source_type: string;
  source_url: string;
  external_id?: string | null;
  company_name_raw: string;
  company_domain?: string | null;
  event_type: string;
  metadata?: Record<string, unknown>;
  detected_at: string; // ISO timestamp
}
