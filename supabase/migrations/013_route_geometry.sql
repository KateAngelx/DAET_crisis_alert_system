-- Phase C: route path geometry (waypoints / polylines) for route_advisories

ALTER TABLE route_advisories
  ADD COLUMN IF NOT EXISTS route_path JSONB DEFAULT NULL;

COMMENT ON COLUMN route_advisories.route_path IS
  'Ordered waypoints [{lat, lng}, ...] for map polylines and GPX export';

CREATE INDEX IF NOT EXISTS idx_route_advisories_has_path
  ON route_advisories ((route_path IS NOT NULL))
  WHERE route_path IS NOT NULL;
