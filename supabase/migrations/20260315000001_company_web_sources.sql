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

CREATE INDEX IF NOT EXISTS index_company_web_sources_company
  ON company_web_sources (company_id);
CREATE INDEX IF NOT EXISTS index_company_web_sources_type
  ON company_web_sources (source_type);

ALTER TABLE company_web_sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read company_web_sources"
  ON company_web_sources FOR SELECT TO authenticated USING (true);
