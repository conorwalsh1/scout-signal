import { createServiceClient } from "@/lib/supabase/service";
import type { MonitoredSource } from "@/types/database";
import { DEFAULT_MONITORED_SOURCES, type DefaultMonitoredSource } from "./defaults";

export interface ResolvedMonitoredSource {
  company_name: string;
  company_domain: string | null;
  source_type: string;
  source_key: string;
  source_url: string | null;
  metadata_json: Record<string, unknown>;
}

function normalizeSource(row: Partial<MonitoredSource> | DefaultMonitoredSource): ResolvedMonitoredSource {
  return {
    company_name: row.company_name ?? "",
    company_domain: row.company_domain ?? null,
    source_type: row.source_type ?? "",
    source_key: row.source_key ?? "",
    source_url: row.source_url ?? null,
    metadata_json: (row.metadata_json ?? {}) as Record<string, unknown>,
  };
}

export async function getActiveSourcesByType(sourceType: string): Promise<ResolvedMonitoredSource[]> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("monitored_sources")
    .select("company_name, company_domain, source_type, source_key, source_url, metadata_json")
    .eq("source_type", sourceType)
    .eq("active", true)
    .order("company_name", { ascending: true });

  if (!error && (data?.length ?? 0) > 0) {
    return (data ?? []).map((row) => normalizeSource(row));
  }

  return DEFAULT_MONITORED_SOURCES
    .filter((row) => row.source_type === sourceType)
    .map((row) => normalizeSource(row));
}

export async function upsertDefaultMonitoredSources(): Promise<number> {
  const supabase = createServiceClient();
  const rows = DEFAULT_MONITORED_SOURCES.map((row) => ({
    company_name: row.company_name,
    company_domain: row.company_domain ?? null,
    source_type: row.source_type,
    source_key: row.source_key,
    source_url: row.source_url ?? null,
    active: true,
    metadata_json: row.metadata_json ?? {},
  }));
  const { error } = await supabase.from("monitored_sources").upsert(rows, {
    onConflict: "source_type,source_key",
  });
  if (error) throw error;
  return rows.length;
}

export async function upsertMonitoredSource(source: {
  company_name: string;
  company_domain?: string | null;
  source_type: string;
  source_key: string;
  source_url?: string | null;
  metadata_json?: Record<string, unknown>;
  active?: boolean;
}): Promise<void> {
  const supabase = createServiceClient();
  const { error } = await supabase.from("monitored_sources").upsert(
    {
      company_name: source.company_name,
      company_domain: source.company_domain ?? null,
      source_type: source.source_type,
      source_key: source.source_key,
      source_url: source.source_url ?? null,
      active: source.active ?? true,
      metadata_json: source.metadata_json ?? {},
      updated_at: new Date().toISOString(),
    },
    { onConflict: "source_type,source_key" }
  );
  if (error) throw error;
}

export async function updateSourceRegistryStatus(
  sourceType: string,
  sourceKey: string,
  status: "ok" | "error",
  resultCount: number
): Promise<void> {
  const supabase = createServiceClient();
  const { error } = await supabase
    .from("monitored_sources")
    .update({
      last_checked_at: new Date().toISOString(),
      last_status: status,
      last_result_count: resultCount,
      updated_at: new Date().toISOString(),
    })
    .eq("source_type", sourceType)
    .eq("source_key", sourceKey);

  if (error) {
    console.warn("[source-registry] status update failed", sourceType, sourceKey, error.message);
  }
}
