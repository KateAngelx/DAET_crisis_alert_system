-- Tour Groups: Guide + Tourist + Trip/Destination relationships
-- Run in Supabase SQL Editor after 001–003 migrations.

-- ============================================================
-- TOUR GROUPS
-- ============================================================
CREATE TABLE IF NOT EXISTS tour_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guide_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  destination TEXT NOT NULL,
  trip_info TEXT,
  start_date DATE,
  end_date DATE,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tour_groups_guide ON tour_groups(guide_id);
CREATE INDEX IF NOT EXISTS idx_tour_groups_status ON tour_groups(status) WHERE status = 'active';

-- ============================================================
-- LINK ASSIGNMENTS TO TOUR GROUPS
-- ============================================================
ALTER TABLE guide_assignments
  ADD COLUMN IF NOT EXISTS tour_group_id UUID REFERENCES tour_groups(id) ON DELETE CASCADE;

-- Drop legacy unique constraint (tourist+guide only — blocks multi-trip history)
ALTER TABLE guide_assignments DROP CONSTRAINT IF EXISTS guide_assignments_tourist_id_guide_id_key;

-- One active membership per tourist per tour group
CREATE UNIQUE INDEX IF NOT EXISTS idx_guide_assignments_tourist_group_active
  ON guide_assignments(tourist_id, tour_group_id)
  WHERE status = 'active' AND tour_group_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_guide_assignments_tour_group
  ON guide_assignments(tour_group_id)
  WHERE status = 'active';

-- ============================================================
-- UPDATED_AT TRIGGER
-- ============================================================
CREATE OR REPLACE FUNCTION update_tour_groups_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_tour_groups_updated_at ON tour_groups;
CREATE TRIGGER trg_tour_groups_updated_at
  BEFORE UPDATE ON tour_groups
  FOR EACH ROW EXECUTE FUNCTION update_tour_groups_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY — TOUR GROUPS
-- ============================================================
ALTER TABLE tour_groups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin manage tour groups" ON tour_groups;
DROP POLICY IF EXISTS "Guides manage own tour groups" ON tour_groups;
DROP POLICY IF EXISTS "Tourists view own tour groups" ON tour_groups;
DROP POLICY IF EXISTS "Guides view own tour groups" ON tour_groups;

CREATE POLICY "Admin manage tour groups" ON tour_groups
  FOR ALL USING (is_admin());

CREATE POLICY "Guides manage own tour groups" ON tour_groups
  FOR ALL USING (guide_id = auth.uid() AND get_user_role() = 'guide');

CREATE POLICY "Tourists view assigned tour groups" ON tour_groups
  FOR SELECT USING (
    id IN (
      SELECT tour_group_id FROM guide_assignments
      WHERE tourist_id = auth.uid() AND status = 'active' AND tour_group_id IS NOT NULL
    )
  );

-- ============================================================
-- ROW LEVEL SECURITY — GUIDE ASSIGNMENTS (extend for guides)
-- ============================================================
DROP POLICY IF EXISTS "Guides manage own group assignments" ON guide_assignments;
DROP POLICY IF EXISTS "Guides insert own assignments" ON guide_assignments;
DROP POLICY IF EXISTS "Guides update own assignments" ON guide_assignments;

CREATE POLICY "Guides insert own assignments" ON guide_assignments
  FOR INSERT WITH CHECK (
    get_user_role() = 'guide'
    AND guide_id = auth.uid()
    AND tour_group_id IS NOT NULL
    AND tour_group_id IN (SELECT id FROM tour_groups WHERE guide_id = auth.uid() AND status = 'active')
  );

CREATE POLICY "Guides update own assignments" ON guide_assignments
  FOR UPDATE USING (
    get_user_role() = 'guide' AND guide_id = auth.uid()
  );

-- ============================================================
-- PROFILES — allow guides to search tourist accounts for assignment
-- ============================================================
DROP POLICY IF EXISTS "Guides search tourist profiles" ON profiles;
CREATE POLICY "Guides search tourist profiles" ON profiles
  FOR SELECT USING (
    get_user_role() = 'guide' AND user_type = 'tourist'
  );
