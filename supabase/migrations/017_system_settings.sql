-- Singleton system settings (notification audience, etc.)

CREATE TABLE IF NOT EXISTS system_settings (
  id TEXT PRIMARY KEY DEFAULT 'default',
  notification_audience JSONB NOT NULL DEFAULT '{"tourists": true, "guides": true, "admins": false}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES profiles(id) ON DELETE SET NULL
);

INSERT INTO system_settings (id)
VALUES ('default')
ON CONFLICT (id) DO NOTHING;

ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin read system settings" ON system_settings;
DROP POLICY IF EXISTS "Admin update system settings" ON system_settings;

CREATE POLICY "Admin read system settings" ON system_settings
  FOR SELECT USING (is_admin());

CREATE POLICY "Admin update system settings" ON system_settings
  FOR UPDATE USING (is_admin())
  WITH CHECK (is_admin());

-- No client INSERT/DELETE; service role manages row lifecycle
