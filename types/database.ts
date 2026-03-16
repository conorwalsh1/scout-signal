/**
 * Database types for Scout Signal.
 * Schema authority: docs/BACKEND_STRUCTURE.md
 */

export type Plan = "free" | "basic" | "pro";

export interface Company {
  id: string;
  name: string;
  domain: string | null;
  website: string | null;
  created_at: string;
  updated_at: string;
}

export interface Event {
  id: string;
  source_type: string;
  source_url: string;
  external_id: string | null;
  company_name_raw: string;
  company_id: string | null;
  event_type: string;
  metadata_json: Record<string, unknown>;
  detected_at: string;
  created_at: string;
}

export type SignalType =
  | "job_post"
  | "hiring_spike"
  | "funding_event"
  | "engineering_hiring"
  | "ai_hiring"
  | "remote_hiring"
  | "new_department_hiring"
  | "leadership_hiring";
export type Confidence = "high" | "medium" | "medium-low" | "low";

export interface Signal {
  id: string;
  company_id: string;
  event_id: string;
  signal_type: SignalType;
  weight: number;
  confidence: Confidence;
  occurred_at: string;
  created_at: string;
}

export interface ScoreComponents {
  job_posts?: number;
  engineering_job_posts?: number;
  ai_job_posts?: number;
  remote_job_posts?: number;
  leadership_job_posts?: number;
  hiring_spike?: boolean;
  engineering_hiring?: boolean;
  ai_hiring?: boolean;
  remote_hiring?: boolean;
  new_department_hiring?: boolean;
  leadership_hiring?: boolean;
  leadership_roles?: string[];
  departments?: string[];
  new_department_names?: string[];
  funding_event?: boolean;
  funding_round_type?: string | null;
  funding_amount?: string | null;
  funding_currency?: string | null;
  funding_investors?: string[];
  ft1000_listed?: boolean;
  ft1000_rank?: number;
  recent_job_posts_7d?: number;
  previous_job_posts_7d?: number;
  hiring_velocity_delta?: number;
  hiring_velocity_up?: boolean;
  engineering_share?: number;
  remote_share?: number;
  monitored_source_types?: string[];
  highest_signal_confidence?: string | null;
  /** Points from job-post signals (0–100 scale; display as /10). */
  job_points?: number;
  /** Points from hiring-spike signals (0–100 scale). */
  hiring_spike_points?: number;
  /** Points from engineering hiring signals (0–100 scale). */
  engineering_hiring_points?: number;
  /** Points from AI hiring signals (0–100 scale). */
  ai_hiring_points?: number;
  /** Points from remote hiring signals (0–100 scale). */
  remote_hiring_points?: number;
  /** Points from new-department hiring signals (0–100 scale). */
  new_department_hiring_points?: number;
  /** Points from leadership-hiring signals (0–100 scale). */
  leadership_hiring_points?: number;
  /** Points from funding-event signals (0–100 scale). */
  funding_points?: number;
  /** Points from FT1000 listing (0–100 scale). */
  ft1000_points?: number;
  [key: string]: unknown;
}

export interface CompanyScore {
  company_id: string;
  score: number;
  last_calculated_at: string;
  score_components_json: ScoreComponents;
  rank_position?: number | null;
  previous_rank_position?: number | null;
}

export interface CompanySource {
  id: string;
  company_id: string;
  source_type: string;
  source_external_id: string | null;
  metadata_json: Record<string, unknown>;
  created_at: string;
}

export interface CompanyWebSource {
  id: string;
  company_id: string;
  source_type: string;
  source_value: string | null;
  confidence: "low" | "medium" | "high" | "official" | "manual_verified" | string;
  website: string | null;
  domain: string | null;
  metadata_json: Record<string, unknown>;
  verified_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface MonitoredSource {
  id: string;
  company_id: string | null;
  company_name: string;
  company_domain: string | null;
  source_type: string;
  source_key: string;
  source_url: string | null;
  active: boolean;
  metadata_json: Record<string, unknown>;
  last_checked_at: string | null;
  last_status: string | null;
  last_result_count: number | null;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string;
  email: string;
  plan: Plan;
  created_at: string;
}

export type UserAlertType = "hiring_spike" | "funding" | "engineering_hires" | "saved_company_signal";
export type UserAlertChannel = "email" | "slack";

export interface UserAlert {
  id: string;
  user_id: string;
  alert_type: UserAlertType;
  company_id: string | null;
  channel: UserAlertChannel;
  created_at: string;
}

export interface SavedTarget {
  id: string;
  user_id: string;
  company_id: string;
  created_at: string;
}

/** Company with score for dashboard feed */
export interface CompanyWithScore extends Company {
  score: number;
  last_calculated_at: string;
  score_components_json: ScoreComponents;
  rank_position?: number | null;
  previous_rank_position?: number | null;
}
