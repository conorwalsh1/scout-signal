import { config } from "dotenv";

config({ path: ".env.local" });

import { createServiceClient } from "../lib/supabase/service";
import { upsertCompanyWebSource } from "../lib/company-web-source";

async function run() {
  const supabase = createServiceClient();
  const pageSize = 1000;
  let updated = 0;

  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from("companies")
      .select("id, name, domain, website")
      .not("domain", "is", null)
      .not("website", "is", null)
      .order("created_at", { ascending: true })
      .range(from, from + pageSize - 1);

    if (error) throw error;

    const batch = (data ?? []) as Array<{
      id: string;
      name: string;
      domain: string | null;
      website: string | null;
    }>;

    for (const company of batch) {
      await upsertCompanyWebSource({
        companyId: company.id,
        sourceType: "company_record_backfill",
        sourceValue: company.name,
        confidence: "medium",
        website: company.website,
        domain: company.domain,
        metadata: {
          reason: "existing_company_record",
        },
        verifiedAt: new Date().toISOString(),
      });
      updated++;
    }

    if (batch.length < pageSize) break;
  }

  console.log(`[web-sources] Backfilled provenance for ${updated} companies`);
}

run().catch((error) => {
  console.error("[web-sources] Fatal:", error);
  process.exit(1);
});
