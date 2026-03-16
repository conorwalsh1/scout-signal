-- User alerts: notify when companies trigger signals (email; Slack later)
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

CREATE POLICY "Users manage own user_alerts" ON user_alerts
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
