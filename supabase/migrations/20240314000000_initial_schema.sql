-- Scout Signal initial schema
-- See docs/BACKEND_STRUCTURE.md for authority.

-- Companies: unique company entity
CREATE TABLE IF NOT EXISTS companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  domain TEXT UNIQUE,
  website TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS index_companies_domain ON companies (domain);

-- Events: raw detected occurrences (immutable)
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

-- Signals: recruiter-relevant interpretations of events
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

-- Company scores: calculated hiring score per company
CREATE TABLE IF NOT EXISTS company_scores (
  company_id UUID PRIMARY KEY REFERENCES companies (id) ON DELETE CASCADE,
  score INTEGER NOT NULL DEFAULT 0,
  last_calculated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  score_components_json JSONB DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS index_company_scores_score ON company_scores (score DESC);

-- Users: application users (mirrors Supabase Auth for app logic)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  plan TEXT NOT NULL DEFAULT 'basic' CHECK (plan IN ('basic', 'pro')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Saved targets: user watchlist of companies
CREATE TABLE IF NOT EXISTS saved_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies (id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, company_id)
);

CREATE INDEX IF NOT EXISTS index_saved_targets_user ON saved_targets (user_id);
CREATE INDEX IF NOT EXISTS index_saved_targets_company ON saved_targets (company_id);
