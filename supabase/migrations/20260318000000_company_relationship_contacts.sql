-- Relationship assist: per-user contacts linked to a company
CREATE TABLE IF NOT EXISTS company_relationship_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies (id) ON DELETE CASCADE,
  contact_name TEXT NOT NULL,
  role TEXT,
  company TEXT,
  relationship_to_you TEXT,
  could_make_intro TEXT NOT NULL DEFAULT 'maybe' CHECK (could_make_intro IN ('yes', 'maybe', 'no')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS index_company_relationship_contacts_user ON company_relationship_contacts (user_id);
CREATE INDEX IF NOT EXISTS index_company_relationship_contacts_company ON company_relationship_contacts (company_id);
CREATE INDEX IF NOT EXISTS index_company_relationship_contacts_user_company ON company_relationship_contacts (user_id, company_id);

ALTER TABLE company_relationship_contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own company_relationship_contacts"
  ON company_relationship_contacts
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

