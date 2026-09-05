-- Restrict private in-app notifications to authenticated users only.
-- Inserts are service-role only (via API routes); guests cannot read or create records.

DROP POLICY IF EXISTS "Users view own notifications" ON notifications;
DROP POLICY IF EXISTS "Users update own notifications" ON notifications;
DROP POLICY IF EXISTS "System insert notifications" ON notifications;

CREATE POLICY "Authenticated users view own notifications" ON notifications
  FOR SELECT
  USING (auth.uid() IS NOT NULL AND user_id = auth.uid());

CREATE POLICY "Authenticated users update own notifications" ON notifications
  FOR UPDATE
  USING (auth.uid() IS NOT NULL AND user_id = auth.uid())
  WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid());

-- No INSERT policy for authenticated/anon roles — service role bypasses RLS.

DROP POLICY IF EXISTS "Admin view deliveries" ON notification_deliveries;
DROP POLICY IF EXISTS "System manage deliveries" ON notification_deliveries;

CREATE POLICY "Authenticated users view own deliveries" ON notification_deliveries
  FOR SELECT
  USING (auth.uid() IS NOT NULL AND user_id = auth.uid());

CREATE POLICY "Admin view all deliveries" ON notification_deliveries
  FOR SELECT
  USING (get_user_role() = 'admin');

-- No INSERT/UPDATE/DELETE policies for notification_deliveries on client roles.
