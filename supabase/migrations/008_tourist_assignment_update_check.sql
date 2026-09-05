-- Fix tourist accept/decline: UPDATE policy must allow new status active|declined
-- Without WITH CHECK, PostgreSQL defaults to USING (status = 'pending') on the new row,
-- which blocks any status change away from pending.
-- Run in Supabase SQL Editor after 007_tourist_pending_assignment_read.sql

DROP POLICY IF EXISTS "Tourists respond to pending assignments" ON guide_assignments;

CREATE POLICY "Tourists respond to pending assignments" ON guide_assignments
  FOR UPDATE
  USING (tourist_id = auth.uid() AND status = 'pending')
  WITH CHECK (
    tourist_id = auth.uid()
    AND status IN ('active', 'declined')
  );
