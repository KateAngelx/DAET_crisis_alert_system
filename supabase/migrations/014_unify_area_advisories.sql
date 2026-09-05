-- Unify area hazards into route_advisories (advisory_kind: route | area)

ALTER TABLE route_advisories
  ADD COLUMN IF NOT EXISTS advisory_kind TEXT NOT NULL DEFAULT 'route'
  CHECK (advisory_kind IN ('route', 'area'));

CREATE INDEX IF NOT EXISTS idx_route_advisories_kind ON route_advisories(advisory_kind);

-- Import legacy area hazards (preserve IDs for existing notifications)
INSERT INTO route_advisories (
  id, advisory_kind, title, route_status, route_type,
  from_location, to_location, via_location, affected_location, hazard_type,
  safety_instructions, latitude, longitude,
  warning_starts_at, warning_ends_at, status, is_public, created_at, updated_at
)
SELECT
  w.id,
  'area',
  w.dangerous_location,
  CASE w.severity WHEN 'Caution' THEN 'Caution' ELSE 'Closed' END,
  'primary',
  w.current_location,
  w.destination,
  w.alternative_route,
  w.dangerous_location,
  w.danger_type,
  w.safety_instructions,
  w.latitude,
  w.longitude,
  w.warning_starts_at,
  w.warning_ends_at,
  w.status,
  COALESCE(w.is_public, TRUE),
  w.created_at,
  w.updated_at
FROM dangerous_location_warnings w
WHERE NOT EXISTS (SELECT 1 FROM route_advisories ra WHERE ra.id = w.id)
ON CONFLICT (id) DO NOTHING;
