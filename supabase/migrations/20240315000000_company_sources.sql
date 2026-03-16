-- company_sources: which companies came from which list/source (e.g. FT1000).
-- See docs/BACKEND_STRUCTURE.md; used by FT1000 import.

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

ALTER TABLE company_sources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read company_sources"
  ON company_sources FOR SELECT TO authenticated USING (true);
