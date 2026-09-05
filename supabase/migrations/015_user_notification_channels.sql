-- User notification channel preferences (email, SMS, in-app)

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS notification_channels JSONB
    DEFAULT '{"email": true, "sms": true, "app": true}'::jsonb;

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS notification_channels_configured BOOLEAN
    DEFAULT FALSE;

UPDATE profiles SET notification_channels_configured = TRUE
WHERE notification_channels_configured IS NOT TRUE;

COMMENT ON COLUMN profiles.notification_channels IS
  'User opt-in for email, sms, and app (in-app) notification delivery';

COMMENT ON COLUMN profiles.notification_channels_configured IS
  'True after user completes first-login communication channel setup';
