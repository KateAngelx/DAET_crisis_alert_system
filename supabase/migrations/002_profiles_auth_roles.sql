-- CONNECT-DAET: Role System & Row Level Security (FINAL)
-- Run in Supabase SQL Editor. Self-contained — includes get_user_role() and all role policies.
--
-- ROLES: tourist | guide | admin
-- RULE:  Public registration always creates role = tourist.
--        Admin/Guide promotion is manual in Supabase only (see bottom of file).

-- ============================================================
-- PROFILES
-- ============================================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  phone TEXT,
  email TEXT,
  nationality TEXT DEFAULT 'Filipino',
  user_type TEXT NOT NULL DEFAULT 'tourist'
    CHECK (user_type IN ('tourist', 'guide', 'admin')),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS nationality TEXT DEFAULT 'Filipino';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

DO $$ BEGIN
  ALTER TABLE profiles ADD COLUMN user_type TEXT NOT NULL DEFAULT 'tourist';
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- Fix any invalid roles
UPDATE profiles SET user_type = 'tourist'
WHERE user_type IS NULL OR user_type NOT IN ('tourist', 'guide', 'admin');

-- ============================================================
-- CRISIS ALERTS (if not exists)
-- ============================================================
CREATE TABLE IF NOT EXISTS crisis_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  location TEXT,
  type TEXT NOT NULL DEFAULT 'General',
  severity TEXT NOT NULL DEFAULT 'Low'
    CHECK (severity IN ('Low', 'Medium', 'High', 'Critical')),
  status TEXT NOT NULL DEFAULT 'Active'
    CHECK (status IN ('Active', 'Resolved')),
  is_public BOOLEAN DEFAULT TRUE,
  channels JSONB DEFAULT '{"email": true, "sms": true, "app": true}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_crisis_alerts_status ON crisis_alerts(status);
CREATE INDEX IF NOT EXISTS idx_crisis_alerts_public ON crisis_alerts(is_public) WHERE is_public = TRUE;

-- ============================================================
-- ROLE HELPER FUNCTIONS
-- ============================================================
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
  SELECT user_type FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;

CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT get_user_role() = 'admin';
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;

CREATE OR REPLACE FUNCTION is_guide()
RETURNS BOOLEAN AS $$
  SELECT get_user_role() = 'guide';
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;

CREATE OR REPLACE FUNCTION is_tourist()
RETURNS BOOLEAN AS $$
  SELECT get_user_role() = 'tourist';
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;

-- ============================================================
-- PROFILES: SIGNUP TRIGGER (always tourist — ignores metadata role)
-- ============================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, phone, email, nationality, user_type)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
    NEW.raw_user_meta_data->>'phone',
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'nationality', 'Filipino'),
    'tourist'
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
    phone = COALESCE(EXCLUDED.phone, profiles.phone),
    email = COALESCE(EXCLUDED.email, profiles.email);
    -- NEVER update user_type on conflict — role changes are manual in Supabase only
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Prevent direct role escalation via column trigger
CREATE OR REPLACE FUNCTION prevent_self_role_change()
RETURNS TRIGGER AS $$
BEGIN
  IF auth.uid() = OLD.id
     AND NEW.user_type IS DISTINCT FROM OLD.user_type
     AND NOT is_admin() THEN
    RAISE EXCEPTION 'Role changes must be performed by an administrator in Supabase';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_prevent_self_role_change ON profiles;
CREATE TRIGGER trg_prevent_self_role_change
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION prevent_self_role_change();

-- ============================================================
-- PROFILES: RLS
-- ============================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own profile" ON profiles;
DROP POLICY IF EXISTS "Admin read all profiles" ON profiles;
DROP POLICY IF EXISTS "Guide read assigned tourists" ON profiles;
DROP POLICY IF EXISTS "Users insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users update own profile" ON profiles;
DROP POLICY IF EXISTS "Admin update all profiles" ON profiles;

-- SELECT: own profile
CREATE POLICY "Users read own profile" ON profiles
  FOR SELECT USING (id = auth.uid());

-- SELECT: admin sees all
CREATE POLICY "Admin read all profiles" ON profiles
  FOR SELECT USING (is_admin());

-- SELECT: guide sees assigned tourists (requires guide_assignments from 001)
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'guide_assignments'
  ) THEN
    DROP POLICY IF EXISTS "Guide read assigned tourists" ON profiles;
    EXECUTE $policy$
      CREATE POLICY "Guide read assigned tourists" ON profiles
        FOR SELECT USING (
          is_guide() AND id IN (
            SELECT tourist_id FROM guide_assignments
            WHERE guide_id = auth.uid() AND status = 'active'
          )
        )
    $policy$;
  END IF;
END $$;

-- INSERT: self-registration must be tourist only
CREATE POLICY "Users insert own profile" ON profiles
  FOR INSERT WITH CHECK (id = auth.uid() AND user_type = 'tourist');

-- UPDATE: users may edit own info but NOT role (enforced by trigger + WITH CHECK)
CREATE POLICY "Users update own profile" ON profiles
  FOR UPDATE USING (id = auth.uid())
  WITH CHECK (
    id = auth.uid()
    AND user_type = (SELECT p.user_type FROM public.profiles p WHERE p.id = auth.uid())
  );

-- UPDATE: admin may change any profile including roles (via Supabase dashboard / service role)
CREATE POLICY "Admin update all profiles" ON profiles
  FOR UPDATE USING (is_admin());

-- ============================================================
-- CRISIS ALERTS: RLS
-- ============================================================
ALTER TABLE crisis_alerts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read active alerts" ON crisis_alerts;
DROP POLICY IF EXISTS "Admin manage alerts" ON crisis_alerts;

-- Anyone (including anon) can read public active alerts
CREATE POLICY "Public read active alerts" ON crisis_alerts
  FOR SELECT USING (is_public = TRUE OR is_admin());

-- Only admin can create, update, delete alerts
CREATE POLICY "Admin manage alerts" ON crisis_alerts
  FOR ALL USING (is_admin());

-- ============================================================
-- INCIDENT REPORTS: tighten INSERT (requires 001 migration tables)
-- ============================================================
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'incident_reports'
  ) THEN
    DROP POLICY IF EXISTS "Authenticated users create reports" ON incident_reports;
    EXECUTE $policy$
      CREATE POLICY "Authenticated users create reports" ON incident_reports
        FOR INSERT WITH CHECK (
          reporter_id = auth.uid()
          AND get_user_role() IN ('tourist', 'guide', 'admin')
        )
    $policy$;
  END IF;
END $$;

-- ============================================================
-- REALTIME (safe add)
-- ============================================================
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE crisis_alerts;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- MANUAL ROLE MANAGEMENT (run in Supabase SQL Editor by administrator)
-- ============================================================
-- Promote user to admin:
--   UPDATE profiles SET user_type = 'admin' WHERE email = 'user@example.com';
--
-- Promote user to guide:
--   UPDATE profiles SET user_type = 'guide' WHERE email = 'user@example.com';
--
-- Demote to tourist:
--   UPDATE profiles SET user_type = 'tourist' WHERE email = 'user@example.com';
