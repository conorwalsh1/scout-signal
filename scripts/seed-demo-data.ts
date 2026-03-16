/**
 * Seed demo data: companies, events, signals, company_scores.
 * Run with: npm run db:seed (or npx tsx scripts/seed-demo-data.ts from project root)
 * Loads .env.local and requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_KEY.
 */
import { config } from "dotenv";

config({ path: ".env.local" });

import { createServiceClient } from "../lib/supabase/service";

const DEMO_COMPANIES = [
  { name: "Acme Corp", domain: "acme.example.com", website: "https://acme.example.com" },
  { name: "Beta Labs", domain: "betalabs.io", website: "https://betalabs.io" },
  { name: "Gamma Inc", domain: "gamma-inc.com", website: "https://gamma-inc.com" },
];

async function seed() {
  const supabase = createServiceClient();
  const now = new Date();
  const recent = new Date(now);
  recent.setDate(recent.getDate() - 2);

  console.log("Ensuring demo companies...");
  const companyIds: string[] = [];
  for (const c of DEMO_COMPANIES) {
    const { data: existing } = await supabase
      .from("companies")
      .select("id")
      .eq("domain", c.domain)
      .maybeSingle();

    if (existing?.id) {
      companyIds.push(existing.id);
      continue;
    }

    const { data, error } = await supabase
      .from("companies")
      .insert({ name: c.name, domain: c.domain, website: c.website })
      .select("id")
      .single();
    if (error) {
      console.error("Company insert failed", c.name, error.message);
      continue;
    }
    if (data?.id) companyIds.push(data.id);
  }

  if (companyIds.length === 0) {
    throw new Error("Could not resolve any demo companies.");
  }

  console.log("Seeding events...");
  const eventIds: string[] = [];
  for (let i = 0; i < companyIds.length; i++) {
    const company_id = companyIds[i];
    const baseUrl = DEMO_COMPANIES[i]?.website ?? "https://example.com";
    for (let j = 0; j < 3; j++) {
      const source_url = `${baseUrl}/jobs/${j}`;
      const { data: existingEvent } = await supabase
        .from("events")
        .select("id")
        .eq("company_id", company_id)
        .eq("source_url", source_url)
        .maybeSingle();

      if (existingEvent?.id) {
        eventIds.push(existingEvent.id);
        continue;
      }

      const { data, error } = await supabase
        .from("events")
        .insert({
          source_type: "career_page",
          source_url,
          company_name_raw: DEMO_COMPANIES[i]?.name ?? "Company",
          company_id,
          event_type: "job_post_detected",
          metadata_json: { title: `Job ${j + 1}` },
          detected_at: new Date(recent.getTime() + j * 3600000).toISOString(),
        })
        .select("id")
        .single();
      if (!error && data?.id) eventIds.push(data.id);
    }
  }

  console.log("Seeding signals...");
  const events = eventIds.length;
  let signalCount = 0;
  for (let i = 0; i < companyIds.length; i++) {
    const company_id = companyIds[i];
    const evId = eventIds[i * 3];
    if (!evId) continue;
    const { data: existingSignal } = await supabase
      .from("signals")
      .select("id")
      .eq("company_id", company_id)
      .eq("event_id", evId)
      .eq("signal_type", "job_post")
      .maybeSingle();

    if (existingSignal?.id) {
      signalCount++;
      continue;
    }

    const { error } = await supabase.from("signals").insert({
      company_id,
      event_id: evId,
      signal_type: "job_post",
      weight: 35,
      confidence: "high",
      occurred_at: recent.toISOString(),
    });
    if (!error) signalCount++;
  }
  if (companyIds.length >= 2) {
    const lastEventId = eventIds[eventIds.length - 1];
    const lastCompanyId = companyIds[companyIds.length - 1];
    if (lastEventId && lastCompanyId) {
      const { data: existingSpike } = await supabase
        .from("signals")
        .select("id")
        .eq("company_id", lastCompanyId)
        .eq("event_id", lastEventId)
        .eq("signal_type", "hiring_spike")
        .maybeSingle();

      if (!existingSpike?.id) {
        await supabase.from("signals").insert({
          company_id: lastCompanyId,
          event_id: lastEventId,
          signal_type: "hiring_spike",
          weight: 70,
          confidence: "medium",
          occurred_at: recent.toISOString(),
        });
      }
      signalCount++;
    }
  }

  console.log("Seeding company_scores...");
  for (const company_id of companyIds) {
    const score = company_id === companyIds[0] ? 75 : company_id === companyIds[1] ? 45 : 35;
    await supabase.from("company_scores").upsert(
      {
        company_id,
        score,
        last_calculated_at: now.toISOString(),
        score_components_json: { job_posts: 2, hiring_spike: false, funding_event: false, demo_seed: true },
      },
      { onConflict: "company_id" }
    );
  }

  console.log("Done. Companies:", companyIds.length, "Events:", events, "Signals:", signalCount);
}

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});
