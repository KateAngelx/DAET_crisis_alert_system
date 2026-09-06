-- User activity tracking for admin monitoring and inactive-account SMS suspension

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS inactive_notice_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS sms_suspended_at TIMESTAMPTZ;

-- Backfill last_login_at from Supabase Auth when available
UPDATE profiles p
SET last_login_at = u.last_sign_in_at
FROM auth.users u
WHERE p.id = u.id
  AND p.last_login_at IS NULL
  AND u.last_sign_in_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_last_seen_at ON profiles (last_seen_at DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_last_login_at ON profiles (last_login_at DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_user_type_created ON profiles (user_type, created_at DESC);
