-- Tourists must read guide + tour group details for pending assignment requests
-- Run after 006_assignment_requests.sql

DROP POLICY IF EXISTS "Tourists view assigned tour groups" ON tour_groups;
CREATE POLICY "Tourists view assigned tour groups" ON tour_groups
  FOR SELECT USING (
    id IN (
      SELECT tour_group_id FROM guide_assignments
      WHERE tourist_id = auth.uid()
        AND status IN ('active', 'pending')
        AND tour_group_id IS NOT NULL
    )
  );

DROP POLICY IF EXISTS "Tourists view assigned guide profiles" ON profiles;
CREATE POLICY "Tourists view assigned guide profiles" ON profiles
  FOR SELECT USING (
    id IN (
      SELECT guide_id FROM guide_assignments
      WHERE tourist_id = auth.uid() AND status IN ('active', 'pending')
    )
  );
