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

ALTER TABLE monitored_sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read monitored_sources"
  ON monitored_sources FOR SELECT TO authenticated USING (true);
