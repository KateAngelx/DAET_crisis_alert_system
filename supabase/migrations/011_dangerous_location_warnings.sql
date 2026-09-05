-- Dangerous location warnings & alternative routes for tourism crisis communication

CREATE TABLE IF NOT EXISTS dangerous_location_warnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dangerous_location TEXT NOT NULL,
  danger_type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'Caution'
    CHECK (severity IN ('Dangerous', 'Caution', 'Critical')),
  warning_starts_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  warning_ends_at TIMESTAMPTZ,
  current_location TEXT,
  alternative_route TEXT NOT NULL,
  destination TEXT NOT NULL,
  safety_instructions TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  alt_latitude DOUBLE PRECISION,
  alt_longitude DOUBLE PRECISION,
  status TEXT NOT NULL DEFAULT 'Active'
    CHECK (status IN ('Active', 'Inactive')),
  is_public BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dangerous_location_warnings_status
  ON dangerous_location_warnings(status);
CREATE INDEX IF NOT EXISTS idx_dangerous_location_warnings_public
  ON dangerous_location_warnings(is_public) WHERE is_public = TRUE;

ALTER TABLE dangerous_location_warnings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read active danger warnings" ON dangerous_location_warnings;
DROP POLICY IF EXISTS "Admin manage danger warnings" ON dangerous_location_warnings;

CREATE POLICY "Public read active danger warnings" ON dangerous_location_warnings
  FOR SELECT USING (is_public = TRUE OR is_admin());

CREATE POLICY "Admin manage danger warnings" ON dangerous_location_warnings
  FOR ALL USING (is_admin());

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE dangerous_location_warnings;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE OR REPLACE FUNCTION update_dangerous_location_warnings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_dangerous_location_warnings_updated_at ON dangerous_location_warnings;
CREATE TRIGGER trg_dangerous_location_warnings_updated_at
  BEFORE UPDATE ON dangerous_location_warnings
  FOR EACH ROW EXECUTE FUNCTION update_dangerous_location_warnings_updated_at();
