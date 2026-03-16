import { decayFactor } from "./decay";
import { SIGNAL_WEIGHTS } from "@/lib/signal-engine/weights";
import type { SignalType } from "@/lib/signal-engine/weights";
import type { ScoreComponents } from "@/types/database";

export interface SignalRow {
  signal_type: string;
  weight: number;
  occurred_at: string;
}

/**
 * Compute company score from signals with recency decay.
 * Returns score (0–100 capped for display), components for explanation, and per-category points for breakdown.
 */
export function calculateScore(signals: SignalRow[], now: Date = new Date()): {
  score: number;
  score_components_json: ScoreComponents;
} {
  let total = 0;
  let job_points = 0;
  let hiring_spike_points = 0;
  let engineering_hiring_points = 0;
  let ai_hiring_points = 0;
  let remote_hiring_points = 0;
  let new_department_hiring_points = 0;
  let leadership_hiring_points = 0;
  let funding_points = 0;
  const components: ScoreComponents = {
    job_posts: 0,
    hiring_spike: false,
    engineering_hiring: false,
    ai_hiring: false,
    remote_hiring: false,
    new_department_hiring: false,
    leadership_hiring: false,
    funding_event: false,
  };

  for (const s of signals) {
    const factor = decayFactor(s.occurred_at, now);
    if (factor === 0) continue;
    const contribution = Math.round(s.weight * factor);
    total += contribution;

    if (s.signal_type === "job_post") {
      components.job_posts = (components.job_posts ?? 0) + 1;
      job_points += contribution;
    }
    if (s.signal_type === "hiring_spike") {
      components.hiring_spike = true;
      hiring_spike_points += contribution;
    }
    if (s.signal_type === "engineering_hiring") {
      components.engineering_hiring = true;
      engineering_hiring_points += contribution;
    }
    if (s.signal_type === "ai_hiring") {
      components.ai_hiring = true;
      ai_hiring_points += contribution;
    }
    if (s.signal_type === "remote_hiring") {
      components.remote_hiring = true;
      remote_hiring_points += contribution;
    }
    if (s.signal_type === "new_department_hiring") {
      components.new_department_hiring = true;
      new_department_hiring_points += contribution;
    }
    if (s.signal_type === "leadership_hiring") {
      components.leadership_hiring = true;
      leadership_hiring_points += contribution;
    }
    if (s.signal_type === "funding_event") {
      components.funding_event = true;
      funding_points += contribution;
    }
  }

  // Diversity bonus: reward companies with multiple distinct signal types
  const distinctSignalFlags = [
    components.hiring_spike,
    components.engineering_hiring,
    components.ai_hiring,
    components.remote_hiring,
    components.new_department_hiring,
    components.leadership_hiring,
    components.funding_event,
  ].filter(Boolean).length;
  const diversityBonus = distinctSignalFlags > 1 ? (distinctSignalFlags - 1) * 3 : 0;

  // Non‑linear scaling: turn raw points into a 0–100 score with
  // more nuance in the mid‑range and less bunching at 10.0/10.
  const raw = Math.max(0, total + diversityBonus);
  const scaled = 1 - Math.exp(-raw / 80); // 0 when raw=0, ->1 as raw grows
  const score = Math.min(100, Math.round(scaled * 100));
  components.job_points = Math.round(job_points);
  components.hiring_spike_points = Math.round(hiring_spike_points);
  components.engineering_hiring_points = Math.round(engineering_hiring_points);
  components.ai_hiring_points = Math.round(ai_hiring_points);
  components.remote_hiring_points = Math.round(remote_hiring_points);
  components.new_department_hiring_points = Math.round(new_department_hiring_points);
  components.leadership_hiring_points = Math.round(leadership_hiring_points);
  components.funding_points = Math.round(funding_points);
  return { score, score_components_json: components };
}
