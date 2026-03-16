import { createServiceClient } from "@/lib/supabase/service";

type WebSourceConfidence = "low" | "medium" | "high" | "official" | "manual_verified";

type UpsertCompanyWebSourceInput = {
  companyId: string;
  sourceType: string;
  sourceValue?: string | null;
  confidence: WebSourceConfidence;
  website?: string | null;
  domain?: string | null;
  metadata?: Record<string, unknown>;
  verifiedAt?: string | null;
};

export async function upsertCompanyWebSource(input: UpsertCompanyWebSourceInput) {
  const supabase = createServiceClient();
  const nowIso = new Date().toISOString();

  const { error } = await supabase.from("company_web_sources").upsert(
    {
      company_id: input.companyId,
      source_type: input.sourceType,
      source_value: input.sourceValue ?? null,
      confidence: input.confidence,
      website: input.website ?? null,
      domain: input.domain ?? null,
      metadata_json: input.metadata ?? {},
      verified_at: input.verifiedAt ?? null,
      updated_at: nowIso,
    },
    { onConflict: "company_id,source_type" }
  );

  if (error) throw error;
}

export async function applyCompanyWebUpdate(input: UpsertCompanyWebSourceInput) {
  const supabase = createServiceClient();
  const nowIso = new Date().toISOString();

  const updates: Record<string, unknown> = {
    updated_at: nowIso,
  };

  if (input.website) updates.website = input.website;
  if (input.domain) updates.domain = input.domain;

  const { error: companyError } = await supabase
    .from("companies")
    .update(updates)
    .eq("id", input.companyId);

  if (companyError) throw companyError;

  await upsertCompanyWebSource({
    ...input,
    verifiedAt: input.verifiedAt ?? nowIso,
  });
}
