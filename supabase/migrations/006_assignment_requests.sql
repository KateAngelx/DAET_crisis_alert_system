-- Assignment request flow: Guide invites → Tourist confirms → Active assignment
-- Run in Supabase SQL Editor after 005_tour_group_routes.sql

-- ============================================================
-- EXTEND GUIDE ASSIGNMENTS STATUS
-- ============================================================
ALTER TABLE guide_assignments
  ADD COLUMN IF NOT EXISTS responded_at TIMESTAMPTZ;

ALTER TABLE guide_assignments DROP CONSTRAINT IF EXISTS guide_assignments_status_check;
ALTER TABLE guide_assignments
  ADD CONSTRAINT guide_assignments_status_check
  CHECK (status IN ('pending', 'active', 'declined', 'removed'));

-- Legacy rows: treat old 'active' as active, anything else stays as-is
UPDATE guide_assignments SET status = 'removed' WHERE status NOT IN ('pending', 'active', 'declined', 'removed');

-- Drop legacy unique (blocks re-invite after decline)
ALTER TABLE guide_assignments DROP CONSTRAINT IF EXISTS guide_assignments_tourist_id_guide_id_key;

-- One active assignment per tourist globally
DROP INDEX IF EXISTS idx_guide_assignments_one_active_per_tourist;
CREATE UNIQUE INDEX idx_guide_assignments_one_active_per_tourist
  ON guide_assignments(tourist_id)
  WHERE status = 'active';

-- One pending invite per tourist per tour group
DROP INDEX IF EXISTS idx_guide_assignments_one_pending_per_group;
CREATE UNIQUE INDEX idx_guide_assignments_one_pending_per_group
  ON guide_assignments(tourist_id, tour_group_id)
  WHERE status = 'pending';

-- Update member count index from 004 to only count active
DROP INDEX IF EXISTS idx_guide_assignments_tourist_group_active;
CREATE UNIQUE INDEX idx_guide_assignments_tourist_group_active
  ON guide_assignments(tourist_id, tour_group_id)
  WHERE status = 'active' AND tour_group_id IS NOT NULL;

-- ============================================================
-- ROW LEVEL SECURITY — ASSIGNMENT REQUESTS
-- ============================================================
DROP POLICY IF EXISTS "Guides insert own assignments" ON guide_assignments;
DROP POLICY IF EXISTS "Guides insert pending assignments" ON guide_assignments;
DROP POLICY IF EXISTS "Tourists respond to pending assignments" ON guide_assignments;
DROP POLICY IF EXISTS "Tourists view own assignments" ON guide_assignments;

CREATE POLICY "Guides insert pending assignments" ON guide_assignments
  FOR INSERT WITH CHECK (
    get_user_role() = 'guide'
    AND guide_id = auth.uid()
    AND status = 'pending'
    AND tour_group_id IS NOT NULL
    AND tour_group_id IN (
      SELECT id FROM tour_groups WHERE guide_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY "Tourists respond to pending assignments" ON guide_assignments
  FOR UPDATE USING (
    tourist_id = auth.uid() AND status = 'pending'
  );

CREATE POLICY "Tourists view own assignments" ON guide_assignments
  FOR SELECT USING (tourist_id = auth.uid());

-- Guides can view registrations for available tourist discovery
DROP POLICY IF EXISTS "Guides view available tourist registrations" ON tourist_registrations;
CREATE POLICY "Guides view available tourist registrations" ON tourist_registrations
  FOR SELECT USING (
    get_user_role() = 'guide'
    AND registration_status IN ('pending', 'approved', 'active')
    AND current_status IN ('registered', 'on_tour', 'checked_in')
  );
