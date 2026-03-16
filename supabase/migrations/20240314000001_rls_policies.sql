-- RLS: allow authenticated users to read companies and company_scores,
-- and to manage their own saved_targets. Workers use service role (bypasses RLS).

ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_targets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read companies"
  ON companies FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated read company_scores"
  ON company_scores FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users manage own saved_targets"
  ON saved_targets FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users table: users can read/insert/update their own row (signup mirror)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own row"
  ON users FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users insert own row"
  ON users FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "Users update own row"
  ON users FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Events and signals: read-only for authenticated (dashboard may show event summary)
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE signals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read events"
  ON events FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated read signals"
  ON signals FOR SELECT TO authenticated USING (true);
