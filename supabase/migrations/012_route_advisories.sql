-- Dedicated route advisories for tourist-facing Routes system (Phase B)

CREATE TABLE IF NOT EXISTS route_advisories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  route_status TEXT NOT NULL DEFAULT 'Caution'
    CHECK (route_status IN ('Safe', 'Caution', 'Closed')),
  route_type TEXT NOT NULL DEFAULT 'primary'
    CHECK (route_type IN ('primary', 'alternative')),
  parent_route_id UUID REFERENCES route_advisories(id) ON DELETE SET NULL,

  from_location TEXT,
  to_location TEXT NOT NULL,
  via_location TEXT,
  affected_location TEXT,
  hazard_type TEXT,

  reason TEXT,
  safety_instructions TEXT,

  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,

  warning_starts_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  warning_ends_at TIMESTAMPTZ,

  status TEXT NOT NULL DEFAULT 'Active'
    CHECK (status IN ('Active', 'Inactive')),
  is_public BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_route_advisories_status ON route_advisories(status);
CREATE INDEX IF NOT EXISTS idx_route_advisories_public ON route_advisories(is_public) WHERE is_public = TRUE;
CREATE INDEX IF NOT EXISTS idx_route_advisories_parent ON route_advisories(parent_route_id);
CREATE INDEX IF NOT EXISTS idx_route_advisories_route_status ON route_advisories(route_status);

ALTER TABLE route_advisories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read active route advisories" ON route_advisories;
DROP POLICY IF EXISTS "Admin manage route advisories" ON route_advisories;

CREATE POLICY "Public read active route advisories" ON route_advisories
  FOR SELECT USING (is_public = TRUE OR is_admin());

CREATE POLICY "Admin manage route advisories" ON route_advisories
  FOR ALL USING (is_admin());

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE route_advisories;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE OR REPLACE FUNCTION update_route_advisories_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_route_advisories_updated_at ON route_advisories;
CREATE TRIGGER trg_route_advisories_updated_at
  BEFORE UPDATE ON route_advisories
  FOR EACH ROW EXECUTE FUNCTION update_route_advisories_updated_at();

-- One-time import from legacy dangerous_location_warnings (primary routes only)
INSERT INTO route_advisories (
  title, route_status, route_type, from_location, to_location, via_location,
  affected_location, hazard_type, reason, safety_instructions,
  latitude, longitude, warning_starts_at, warning_ends_at, status, is_public, created_at, updated_at
)
SELECT
  COALESCE(NULLIF(TRIM(COALESCE(w.current_location, '') || ' → ' || w.destination), '→ '), w.dangerous_location || ' → ' || w.destination),
  CASE w.severity WHEN 'Caution' THEN 'Caution' ELSE 'Closed' END,
  'primary',
  w.current_location,
  w.destination,
  w.dangerous_location,
  w.dangerous_location,
  w.danger_type,
  COALESCE(w.danger_type || ' reported at ' || w.dangerous_location, 'Route advisory'),
  w.safety_instructions,
  w.latitude,
  w.longitude,
  w.warning_starts_at,
  w.warning_ends_at,
  w.status,
  w.is_public,
  w.created_at,
  w.updated_at
FROM dangerous_location_warnings w
WHERE NOT EXISTS (SELECT 1 FROM route_advisories LIMIT 1);

-- Import alternatives linked to migrated primaries
INSERT INTO route_advisories (
  title, route_status, route_type, parent_route_id, from_location, to_location, via_location,
  affected_location, hazard_type, reason, safety_instructions,
  latitude, longitude, warning_starts_at, warning_ends_at, status, is_public, created_at, updated_at
)
SELECT
  w.alternative_route || ' → ' || w.destination,
  'Safe',
  'alternative',
  ra.id,
  COALESCE(w.current_location, w.dangerous_location),
  w.destination,
  w.alternative_route,
  w.dangerous_location,
  w.danger_type,
  'Official detour for ' || w.dangerous_location,
  w.safety_instructions,
  w.alt_latitude,
  w.alt_longitude,
  w.warning_starts_at,
  w.warning_ends_at,
  w.status,
  w.is_public,
  w.created_at,
  w.updated_at
FROM dangerous_location_warnings w
JOIN route_advisories ra
  ON ra.route_type = 'primary'
  AND ra.to_location = w.destination
  AND COALESCE(ra.from_location, '') = COALESCE(w.current_location, '')
  AND COALESCE(ra.affected_location, '') = COALESCE(w.dangerous_location, '')
WHERE w.alternative_route IS NOT NULL
  AND TRIM(w.alternative_route) <> ''
  AND NOT EXISTS (
    SELECT 1 FROM route_advisories alt
    WHERE alt.route_type = 'alternative'
      AND alt.parent_route_id = ra.id
      AND alt.via_location = w.alternative_route
  );
