/**
 * Signal worker: process recent events without signals, generate and insert signals.
 * Also detect hiring_spike from multiple job_post events in a rolling window.
 * Run after ingestion. Run with: tsx workers/run-signals.ts
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { createServiceClient } from "@/lib/supabase/service";
import { eventToSignals } from "@/lib/signal-engine/event-to-signal";
import { SIGNAL_WEIGHTS } from "@/lib/signal-engine/weights";
import { getDepartmentsFromMetadata } from "@/lib/job-intelligence";
import type { Event } from "@/types/database";

const ROLLING_DAYS = 7;
const MIN_JOBS_FOR_SPIKE = 3;

export async function run() {
  const supabase = createServiceClient();
  const since = new Date();
  since.setDate(since.getDate() - ROLLING_DAYS);
  const sinceIso = since.toISOString();

  let events: unknown[];
  const { data: eventsData, error: fetchErr } = await supabase
    .from("events")
    .select("*")
    .gte("detected_at", sinceIso)
    .not("company_id", "is", null)
    .order("detected_at", { ascending: true });

  if (fetchErr) throw fetchErr;
  events = eventsData ?? [];
  const eventList = Array.isArray(events) ? (events as Event[]) : [];

  // Existing signals for dedup
  const { data: existingSignals } = await supabase
    .from("signals")
    .select("event_id, company_id, signal_type")
    .gte("occurred_at", sinceIso);
  const existingSet = new Set(
    (existingSignals ?? []).flatMap((s) => {
      const key = `${s.event_id}:${s.company_id}:${s.signal_type}`;
      return s.signal_type === "hiring_spike"
        ? [key, `company:${s.company_id}:hiring_spike`]
        : s.signal_type === "new_department_hiring"
          ? [key, `company:${s.company_id}:new_department_hiring`]
        : [key];
    })
  );

  const toInsert: Array<{
    company_id: string;
    event_id: string;
    signal_type: string;
    weight: number;
    confidence: string;
    occurred_at: string;
  }> = [];

  for (const event of eventList) {
    try {
      const candidates = eventToSignals(event as Event);
      for (const c of candidates) {
        const key = `${c.event_id}:${c.company_id}:${c.signal_type}`;
        if (existingSet.has(key)) continue;
        existingSet.add(key);
        toInsert.push({
          company_id: c.company_id,
          event_id: c.event_id,
          signal_type: c.signal_type,
          weight: c.weight,
          confidence: c.confidence,
          occurred_at: c.occurred_at,
        });
      }
    } catch (e) {
      console.warn("[signals] Skip event", (event as { id?: string }).id, e);
    }
  }

  // Hiring spike: companies with >= MIN_JOBS_FOR_SPIKE job_post in window
  const jobCountByCompany = new Map<string, number>();
  const recentJobEventsByCompany = new Map<string, Event[]>();
  for (const e of eventList) {
    if (e.event_type !== "job_post_detected" || !e.company_id) continue;
    jobCountByCompany.set(e.company_id, (jobCountByCompany.get(e.company_id) ?? 0) + 1);
    const list = recentJobEventsByCompany.get(e.company_id) ?? [];
    list.push(e);
    recentJobEventsByCompany.set(e.company_id, list);
  }
  for (const [company_id, count] of Array.from(jobCountByCompany.entries())) {
    if (count < MIN_JOBS_FOR_SPIKE) continue;
    if (existingSet.has(`company:${company_id}:hiring_spike`)) continue;
    const lastEvent = eventList.filter((e) => e.company_id === company_id).pop();
    if (!lastEvent) continue;
    existingSet.add(`company:${company_id}:hiring_spike`);
    toInsert.push({
      company_id,
      event_id: lastEvent.id,
      signal_type: "hiring_spike",
      weight: 70,
      confidence: "medium",
      occurred_at: lastEvent.detected_at,
    });
  }

  const companyIds = Array.from(recentJobEventsByCompany.keys());
  if (companyIds.length > 0) {
    const { data: olderJobEvents, error: olderErr } = await supabase
      .from("events")
      .select("company_id, metadata_json")
      .eq("event_type", "job_post_detected")
      .in("company_id", companyIds)
      .lt("detected_at", sinceIso);
    if (olderErr) throw olderErr;

    const historicalDepartments = new Map<string, Set<string>>();
    for (const row of olderJobEvents ?? []) {
      if (!row.company_id) continue;
      const departments = getDepartmentsFromMetadata((row.metadata_json ?? {}) as Record<string, unknown>);
      if (departments.length === 0) continue;
      const set = historicalDepartments.get(row.company_id) ?? new Set<string>();
      departments.forEach((department) => set.add(department));
      historicalDepartments.set(row.company_id, set);
    }

    for (const [company_id, companyEvents] of Array.from(recentJobEventsByCompany.entries())) {
      if (existingSet.has(`company:${company_id}:new_department_hiring`)) continue;
      const priorDepartments = historicalDepartments.get(company_id) ?? new Set<string>();
      const newDepartments = new Set<string>();

      for (const event of companyEvents) {
        const departments = getDepartmentsFromMetadata((event.metadata_json ?? {}) as Record<string, unknown>);
        for (const department of departments) {
          if (!priorDepartments.has(department)) {
            newDepartments.add(department);
          }
        }
      }

      if (newDepartments.size === 0) continue;
      const lastEvent = companyEvents[companyEvents.length - 1];
      existingSet.add(`company:${company_id}:new_department_hiring`);
      toInsert.push({
        company_id,
        event_id: lastEvent.id,
        signal_type: "new_department_hiring",
        weight: SIGNAL_WEIGHTS.new_department_hiring,
        confidence: "medium",
        occurred_at: lastEvent.detected_at,
      });
    }
  }

  if (toInsert.length === 0) {
    console.log("[signals] No new signals to insert");
    return;
  }

  const { error: insertErr } = await supabase.from("signals").insert(toInsert);
  if (insertErr) throw insertErr;
  console.log(`[signals] Inserted ${toInsert.length} signals`);
}

if (typeof process !== "undefined" && !process.env.NEXT_RUNTIME) {
  run().catch((e) => {
    console.error("[signals] Fatal:", e);
    process.exit(1);
  });
}
