-- Track when an alert was marked resolved (for accurate dashboard metrics)
ALTER TABLE crisis_alerts
  ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ;

-- Best-effort backfill for existing resolved rows (no historical resolution timestamp exists)
UPDATE crisis_alerts
SET resolved_at = created_at
WHERE status = 'Resolved' AND resolved_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_crisis_alerts_resolved_at ON crisis_alerts(resolved_at DESC)
  WHERE resolved_at IS NOT NULL;
