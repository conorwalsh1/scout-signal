-- Scout Signal: run this once in Supabase Dashboard → SQL Editor
-- Creates all tables and RLS policies. Source: migrations/20240314000000_initial_schema.sql + 20240314000001_rls_policies.sql + 20240315000000_company_sources.sql

-- ========== Initial schema ==========
CREATE TABLE IF NOT EXISTS companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  domain TEXT UNIQUE,
  website TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS index_companies_domain ON companies (domain);

CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type TEXT NOT NULL,
  source_url TEXT NOT NULL,
  external_id TEXT,
  company_name_raw TEXT NOT NULL,
  company_id UUID REFERENCES companies (id),
  event_type TEXT NOT NULL,
  metadata_json JSONB DEFAULT '{}',
  detected_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS index_events_company ON events (company_id);
CREATE INDEX IF NOT EXISTS index_events_type ON events (event_type);
CREATE INDEX IF NOT EXISTS index_events_detected_at ON events (detected_at);

CREATE TABLE IF NOT EXISTS signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies (id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES events (id),
  signal_type TEXT NOT NULL,
  weight INTEGER NOT NULL,
  confidence TEXT NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS index_signals_company ON signals (company_id);
CREATE INDEX IF NOT EXISTS index_signals_type ON signals (signal_type);
CREATE INDEX IF NOT EXISTS index_signals_time ON signals (occurred_at);

CREATE TABLE IF NOT EXISTS company_scores (
  company_id UUID PRIMARY KEY REFERENCES companies (id) ON DELETE CASCADE,
  score INTEGER NOT NULL DEFAULT 0,
  last_calculated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  score_components_json JSONB DEFAULT '{}',
  rank_position INTEGER,
  previous_rank_position INTEGER
);
CREATE INDEX IF NOT EXISTS index_company_scores_score ON company_scores (score DESC);
CREATE INDEX IF NOT EXISTS index_company_scores_rank_position ON company_scores (rank_position);

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  plan TEXT NOT NULL DEFAULT 'basic' CHECK (plan IN ('basic', 'pro')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS saved_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies (id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, company_id)
);
CREATE INDEX IF NOT EXISTS index_saved_targets_user ON saved_targets (user_id);
CREATE INDEX IF NOT EXISTS index_saved_targets_company ON saved_targets (company_id);

CREATE TABLE IF NOT EXISTS company_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies (id) ON DELETE CASCADE,
  source_type TEXT NOT NULL,
  source_external_id TEXT,
  metadata_json JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (company_id, source_type)
);
CREATE INDEX IF NOT EXISTS index_company_sources_company ON company_sources (company_id);
CREATE INDEX IF NOT EXISTS index_company_sources_type ON company_sources (source_type);

CREATE TABLE IF NOT EXISTS company_web_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies (id) ON DELETE CASCADE,
  source_type TEXT NOT NULL,
  source_value TEXT,
  confidence TEXT NOT NULL DEFAULT 'medium',
  website TEXT,
  domain TEXT,
  metadata_json JSONB DEFAULT '{}',
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (company_id, source_type)
);
CREATE INDEX IF NOT EXISTS index_company_web_sources_company ON company_web_sources (company_id);
CREATE INDEX IF NOT EXISTS index_company_web_sources_type ON company_web_sources (source_type);

CREATE TABLE IF NOT EXISTS monitored_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies (id) ON DELETE SET NULL,
  company_name TEXT NOT NULL,
  company_domain TEXT,
  source_type TEXT NOT NULL,
  source_key TEXT NOT NULL,
  source_url TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  metadata_json JSONB DEFAULT '{}',
  last_checked_at TIMESTAMPTZ,
  last_status TEXT,
  last_result_count INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (source_type, source_key)
);
CREATE INDEX IF NOT EXISTS index_monitored_sources_type ON monitored_sources (source_type);
CREATE INDEX IF NOT EXISTS index_monitored_sources_active ON monitored_sources (active);
CREATE INDEX IF NOT EXISTS index_monitored_sources_company ON monitored_sources (company_id);

CREATE TABLE IF NOT EXISTS cron_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_name TEXT NOT NULL,
  trigger_source TEXT NOT NULL,
  status TEXT NOT NULL,
  deployment_host TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ,
  details_json JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS index_cron_runs_job_name ON cron_runs (job_name);
CREATE INDEX IF NOT EXISTS index_cron_runs_started_at ON cron_runs (started_at DESC);

-- ========== RLS ==========
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_targets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read companies" ON companies FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated read company_scores" ON company_scores FOR SELECT TO authenticated USING (true);
ALTER TABLE company_sources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read company_sources" ON company_sources FOR SELECT TO authenticated USING (true);
ALTER TABLE company_web_sources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read company_web_sources" ON company_web_sources FOR SELECT TO authenticated USING (true);
ALTER TABLE monitored_sources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read monitored_sources" ON monitored_sources FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users manage own saved_targets" ON saved_targets FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own row" ON users FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users insert own row" ON users FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "Users update own row" ON users FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE signals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read events" ON events FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated read signals" ON signals FOR SELECT TO authenticated USING (true);

-- ========== User alerts ==========
CREATE TABLE IF NOT EXISTS user_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL CHECK (alert_type IN ('hiring_spike', 'funding', 'engineering_hires', 'saved_company_signal')),
  company_id UUID REFERENCES companies (id) ON DELETE CASCADE,
  channel TEXT NOT NULL DEFAULT 'email' CHECK (channel IN ('email', 'slack')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS index_user_alerts_user ON user_alerts (user_id);
CREATE INDEX IF NOT EXISTS index_user_alerts_type ON user_alerts (alert_type);
CREATE INDEX IF NOT EXISTS index_user_alerts_company ON user_alerts (company_id);
ALTER TABLE user_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own user_alerts" ON user_alerts FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
