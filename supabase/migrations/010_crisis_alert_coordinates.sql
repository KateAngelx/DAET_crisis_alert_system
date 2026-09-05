-- Store geocoded coordinates on crisis alerts for accurate map pinning
ALTER TABLE crisis_alerts
  ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;
