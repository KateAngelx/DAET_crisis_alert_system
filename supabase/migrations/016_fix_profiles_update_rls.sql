-- Fix infinite recursion in profiles UPDATE policy.
-- The old WITH CHECK subquery read from profiles during UPDATE evaluation, causing RLS recursion.
-- Role escalation is still blocked by trg_prevent_self_role_change.

DROP POLICY IF EXISTS "Users update own profile" ON profiles;

CREATE POLICY "Users update own profile" ON profiles
  FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());
