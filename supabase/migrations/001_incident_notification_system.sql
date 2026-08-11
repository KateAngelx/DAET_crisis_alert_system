-- CONNECT-DAET: Incident Reporting, Guide Assignment & Notification System
-- Run this migration in your Supabase SQL Editor

-- ============================================================
-- EXTENSIONS
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- PROFILES (extend existing if needed)
-- ============================================================
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('admin', 'tourist', 'guide');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE IF EXISTS profiles
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- ============================================================
-- TOURIST REGISTRATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS tourist_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  destination TEXT NOT NULL DEFAULT 'Daet, Camarines Norte',
  tour_schedule JSONB DEFAULT '{}',
  registration_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (registration_status IN ('pending', 'approved', 'rejected', 'active', 'completed')),
  current_status TEXT NOT NULL DEFAULT 'registered'
    CHECK (current_status IN ('registered', 'on_tour', 'checked_in', 'emergency', 'completed')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_tourist_registrations_user ON tourist_registrations(user_id);
CREATE INDEX IF NOT EXISTS idx_tourist_registrations_status ON tourist_registrations(registration_status);

-- ============================================================
-- GUIDE ASSIGNMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS guide_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tourist_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  guide_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES profiles(id),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'removed')),
  notes TEXT,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  removed_at TIMESTAMPTZ,
  UNIQUE(tourist_id, guide_id)
);

CREATE INDEX IF NOT EXISTS idx_guide_assignments_guide ON guide_assignments(guide_id) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_guide_assignments_tourist ON guide_assignments(tourist_id) WHERE status = 'active';

-- ============================================================
-- INCIDENT REPORTS
-- ============================================================
CREATE TABLE IF NOT EXISTS incident_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference_number TEXT NOT NULL UNIQUE,
  reporter_id UUID NOT NULL REFERENCES profiles(id) ON DELETE SET NULL,
  category TEXT NOT NULL CHECK (category IN (
    'Accident', 'Medical Emergency', 'Natural Disaster', 'Missing Person',
    'Fire', 'Crime/Security Concern', 'Road/Transportation Problem',
    'Tourist Assistance', 'Weather-Related Incident', 'Other'
  )),
  description TEXT NOT NULL,
  location TEXT NOT NULL,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  severity TEXT NOT NULL DEFAULT 'Medium'
    CHECK (severity IN ('Low', 'Medium', 'High', 'Critical')),
  status TEXT NOT NULL DEFAULT 'Submitted'
    CHECK (status IN (
      'Submitted', 'Received', 'Under Review', 'Assigned', 'Responding',
      'Resolved', 'Closed', 'Rejected'
    )),
  assigned_to UUID REFERENCES profiles(id),
  admin_notes TEXT,
  response_actions TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_incident_reports_status ON incident_reports(status);
CREATE INDEX IF NOT EXISTS idx_incident_reports_severity ON incident_reports(severity);
CREATE INDEX IF NOT EXISTS idx_incident_reports_category ON incident_reports(category);
CREATE INDEX IF NOT EXISTS idx_incident_reports_reporter ON incident_reports(reporter_id);
CREATE INDEX IF NOT EXISTS idx_incident_reports_assigned ON incident_reports(assigned_to);
CREATE INDEX IF NOT EXISTS idx_incident_reports_created ON incident_reports(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_incident_reports_reference ON incident_reports(reference_number);

-- ============================================================
-- INCIDENT ATTACHMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS incident_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id UUID NOT NULL REFERENCES incident_reports(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT,
  file_size INTEGER,
  uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_incident_attachments_incident ON incident_attachments(incident_id);

-- ============================================================
-- INCIDENT HISTORY (Audit Trail)
-- ============================================================
CREATE TABLE IF NOT EXISTS incident_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id UUID NOT NULL REFERENCES incident_reports(id) ON DELETE CASCADE,
  changed_by UUID REFERENCES profiles(id),
  action TEXT NOT NULL,
  old_status TEXT,
  new_status TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_incident_history_incident ON incident_history(incident_id);

-- ============================================================
-- NOTIFICATIONS (In-App)
-- ============================================================
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  notification_type TEXT NOT NULL DEFAULT 'general',
  priority TEXT NOT NULL DEFAULT 'NORMAL'
    CHECK (priority IN ('LOW', 'NORMAL', 'HIGH', 'CRITICAL')),
  is_read BOOLEAN DEFAULT FALSE,
  related_type TEXT,
  related_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, is_read) WHERE is_read = FALSE;
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);

-- ============================================================
-- NOTIFICATION DELIVERY QUEUE
-- ============================================================
CREATE TABLE IF NOT EXISTS notification_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id UUID REFERENCES notifications(id) ON DELETE SET NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  channel TEXT NOT NULL CHECK (channel IN ('web', 'email', 'sms')),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'sent', 'delivered', 'failed', 'retrying', 'cancelled')),
  recipient TEXT NOT NULL,
  subject TEXT,
  body TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'NORMAL'
    CHECK (priority IN ('LOW', 'NORMAL', 'HIGH', 'CRITICAL')),
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  last_error TEXT,
  idempotency_key TEXT UNIQUE,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notification_deliveries_status ON notification_deliveries(status);
CREATE INDEX IF NOT EXISTS idx_notification_deliveries_pending ON notification_deliveries(status, created_at)
  WHERE status IN ('pending', 'retrying');

-- ============================================================
-- REFERENCE NUMBER GENERATOR
-- ============================================================
CREATE OR REPLACE FUNCTION generate_incident_reference()
RETURNS TEXT AS $$
DECLARE
  ref TEXT;
  exists_check BOOLEAN;
BEGIN
  LOOP
    ref := 'INC-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || UPPER(SUBSTRING(gen_random_uuid()::TEXT, 1, 6));
    SELECT EXISTS(SELECT 1 FROM incident_reports WHERE reference_number = ref) INTO exists_check;
    EXIT WHEN NOT exists_check;
  END LOOP;
  RETURN ref;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- AUTO-UPDATE TIMESTAMPS
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_incident_reports_updated ON incident_reports;
CREATE TRIGGER trg_incident_reports_updated
  BEFORE UPDATE ON incident_reports
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trg_notification_deliveries_updated ON notification_deliveries;
CREATE TRIGGER trg_notification_deliveries_updated
  BEFORE UPDATE ON notification_deliveries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trg_tourist_registrations_updated ON tourist_registrations;
CREATE TRIGGER trg_tourist_registrations_updated
  BEFORE UPDATE ON tourist_registrations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- INCIDENT STATUS CHANGE → HISTORY
-- ============================================================
CREATE OR REPLACE FUNCTION log_incident_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO incident_history (incident_id, changed_by, action, old_status, new_status, notes)
    VALUES (NEW.id, auth.uid(), 'status_change', OLD.status, NEW.status, NEW.admin_notes);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_incident_status_history ON incident_reports;
CREATE TRIGGER trg_incident_status_history
  AFTER UPDATE ON incident_reports
  FOR EACH ROW EXECUTE FUNCTION log_incident_status_change();

-- ============================================================
-- STORAGE BUCKET FOR ATTACHMENTS
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('incident-attachments', 'incident-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- HELPER: Get user role
-- ============================================================
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
  SELECT user_type FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE tourist_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE guide_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE incident_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE incident_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE incident_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_deliveries ENABLE ROW LEVEL SECURITY;

-- Tourist Registrations
CREATE POLICY "Users view own registration" ON tourist_registrations
  FOR SELECT USING (user_id = auth.uid() OR get_user_role() = 'admin'
    OR (get_user_role() = 'guide' AND user_id IN (
      SELECT tourist_id FROM guide_assignments WHERE guide_id = auth.uid() AND status = 'active'
    )));

CREATE POLICY "Users create own registration" ON tourist_registrations
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admin manage registrations" ON tourist_registrations
  FOR ALL USING (get_user_role() = 'admin');

-- Guide Assignments
CREATE POLICY "Admin manage assignments" ON guide_assignments
  FOR ALL USING (get_user_role() = 'admin');

CREATE POLICY "Guides view own assignments" ON guide_assignments
  FOR SELECT USING (guide_id = auth.uid() OR tourist_id = auth.uid());

-- Incident Reports
CREATE POLICY "Users view own reports" ON incident_reports
  FOR SELECT USING (
    reporter_id = auth.uid()
    OR get_user_role() = 'admin'
    OR (get_user_role() = 'guide' AND (
      reporter_id IN (SELECT tourist_id FROM guide_assignments WHERE guide_id = auth.uid() AND status = 'active')
      OR assigned_to = auth.uid()
    ))
  );

CREATE POLICY "Authenticated users create reports" ON incident_reports
  FOR INSERT WITH CHECK (reporter_id = auth.uid());

CREATE POLICY "Admin manage all reports" ON incident_reports
  FOR UPDATE USING (get_user_role() = 'admin');

CREATE POLICY "Admin delete reports" ON incident_reports
  FOR DELETE USING (get_user_role() = 'admin');

CREATE POLICY "Guide update assigned reports" ON incident_reports
  FOR UPDATE USING (assigned_to = auth.uid() AND get_user_role() = 'guide');

-- Incident Attachments
CREATE POLICY "View attachments for accessible incidents" ON incident_attachments
  FOR SELECT USING (
    incident_id IN (SELECT id FROM incident_reports)
  );

CREATE POLICY "Insert attachments for own reports" ON incident_attachments
  FOR INSERT WITH CHECK (
    incident_id IN (SELECT id FROM incident_reports WHERE reporter_id = auth.uid())
  );

CREATE POLICY "Admin manage attachments" ON incident_attachments
  FOR ALL USING (get_user_role() = 'admin');

-- Incident History
CREATE POLICY "View history for accessible incidents" ON incident_history
  FOR SELECT USING (
    incident_id IN (SELECT id FROM incident_reports)
  );

CREATE POLICY "System insert history" ON incident_history
  FOR INSERT WITH CHECK (true);

-- Notifications
CREATE POLICY "Users view own notifications" ON notifications
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users update own notifications" ON notifications
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "System insert notifications" ON notifications
  FOR INSERT WITH CHECK (true);

-- Notification Deliveries (admin only view)
CREATE POLICY "Admin view deliveries" ON notification_deliveries
  FOR SELECT USING (get_user_role() = 'admin' OR user_id = auth.uid());

CREATE POLICY "System manage deliveries" ON notification_deliveries
  FOR ALL USING (true);

-- Storage policies
CREATE POLICY "Authenticated upload attachments" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'incident-attachments' AND auth.role() = 'authenticated');

CREATE POLICY "Public read attachments" ON storage.objects
  FOR SELECT USING (bucket_id = 'incident-attachments');

CREATE POLICY "Users delete own attachments" ON storage.objects
  FOR DELETE USING (bucket_id = 'incident-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);

-- ============================================================
-- REALTIME
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE incident_reports;
