import type { Event } from "@/types/database";
import type { Confidence } from "@/types/database";
import { SIGNAL_WEIGHTS, type SignalType } from "./weights";

export interface SignalCandidate {
  company_id: string;
  event_id: string;
  signal_type: SignalType;
  weight: number;
  confidence: Confidence;
  occurred_at: string;
}

const EVENT_TO_SIGNAL: Record<string, { type: SignalType; confidence: Confidence }> = {
  job_post_detected: { type: "job_post", confidence: "high" },
  funding_event_detected: { type: "funding_event", confidence: "medium" },
};

/**
 * Map a single event to one or more signal candidates.
 * hiring_spike is produced by a separate pass over recent job_post events per company.
 */
export function eventToSignals(event: Event): SignalCandidate[] {
  const mapped = EVENT_TO_SIGNAL[event.event_type];
  if (!mapped || !event.company_id) return [];
  const signals: SignalCandidate[] = [
    {
      company_id: event.company_id,
      event_id: event.id,
      signal_type: mapped.type,
      weight: SIGNAL_WEIGHTS[mapped.type],
      confidence: mapped.confidence,
      occurred_at: event.detected_at,
    },
  ];

  const metadata = (event.metadata_json ?? {}) as Record<string, unknown>;
  const engineeringCount =
    typeof metadata.engineering_job_count === "number"
      ? metadata.engineering_job_count
      : metadata.department === "engineering"
        ? 1
        : 0;
  const aiCount =
    typeof metadata.ai_job_count === "number"
      ? metadata.ai_job_count
      : metadata.is_ai === true
        ? 1
        : 0;
  const remoteCount =
    typeof metadata.remote_job_count === "number"
      ? metadata.remote_job_count
      : metadata.is_remote === true
        ? 1
        : 0;
  const leadershipCount =
    typeof metadata.leadership_job_count === "number"
      ? metadata.leadership_job_count
      : metadata.is_leadership === true
        ? 1
        : 0;

  if (mapped.type === "job_post" && engineeringCount > 0) {
    signals.push({
      company_id: event.company_id,
      event_id: event.id,
      signal_type: "engineering_hiring",
      weight: SIGNAL_WEIGHTS.engineering_hiring,
      confidence: "medium",
      occurred_at: event.detected_at,
    });
  }

  if (mapped.type === "job_post" && aiCount > 0) {
    signals.push({
      company_id: event.company_id,
      event_id: event.id,
      signal_type: "ai_hiring",
      weight: SIGNAL_WEIGHTS.ai_hiring,
      confidence: "medium",
      occurred_at: event.detected_at,
    });
  }

  if (mapped.type === "job_post" && remoteCount > 0) {
    signals.push({
      company_id: event.company_id,
      event_id: event.id,
      signal_type: "remote_hiring",
      weight: SIGNAL_WEIGHTS.remote_hiring,
      confidence: "low",
      occurred_at: event.detected_at,
    });
  }

  if (mapped.type === "job_post" && leadershipCount > 0) {
    signals.push({
      company_id: event.company_id,
      event_id: event.id,
      signal_type: "leadership_hiring",
      weight: SIGNAL_WEIGHTS.leadership_hiring,
      confidence: "medium",
      occurred_at: event.detected_at,
    });
  }

  return signals;
}
