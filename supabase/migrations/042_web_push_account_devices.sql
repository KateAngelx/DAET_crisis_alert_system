BEGIN;

ALTER TABLE public.web_push_subscriptions
  ADD COLUMN IF NOT EXISTS disabled_reason TEXT;

ALTER TABLE public.web_push_subscriptions
  DROP CONSTRAINT IF EXISTS web_push_subscriptions_disabled_reason_check;

ALTER TABLE public.web_push_subscriptions
  ADD CONSTRAINT web_push_subscriptions_disabled_reason_check
  CHECK (disabled_reason IS NULL OR disabled_reason IN ('user', 'expired', 'account_switch'));

DO $$
DECLARE
  constraint_name TEXT;
BEGIN
  FOR constraint_name IN
    SELECT con.conname
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    WHERE nsp.nspname = 'public'
      AND rel.relname = 'web_push_subscriptions'
      AND con.contype = 'u'
      AND pg_get_constraintdef(con.oid) ILIKE '%(endpoint)%'
  LOOP
    EXECUTE format('ALTER TABLE public.web_push_subscriptions DROP CONSTRAINT %I', constraint_name);
  END LOOP;
END $$;

DO $$
BEGIN
  IF to_regclass('public.web_push_subscriptions_endpoint_key') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1
       FROM pg_constraint
       WHERE conname = 'web_push_subscriptions_endpoint_key'
         AND conrelid = 'public.web_push_subscriptions'::regclass
     ) THEN
    EXECUTE 'DROP INDEX public.web_push_subscriptions_endpoint_key';
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS web_push_subscriptions_user_endpoint_key
  ON public.web_push_subscriptions (user_id, endpoint);

CREATE INDEX IF NOT EXISTS web_push_subscriptions_endpoint_idx
  ON public.web_push_subscriptions (endpoint);

CREATE OR REPLACE FUNCTION public.register_web_push_subscription(
  p_user_id UUID,
  p_endpoint TEXT,
  p_p256dh TEXT,
  p_auth TEXT,
  p_expiration_time TIMESTAMPTZ
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = p_user_id
      AND is_active IS TRUE
  ) THEN
    RAISE EXCEPTION 'Active account required';
  END IF;

  UPDATE public.web_push_subscriptions
  SET enabled = FALSE,
      disabled_reason = 'account_switch',
      updated_at = NOW()
  WHERE endpoint = p_endpoint
    AND user_id <> p_user_id
    AND enabled = TRUE;

  INSERT INTO public.web_push_subscriptions (
    user_id,
    endpoint,
    p256dh,
    auth,
    expiration_time,
    enabled,
    disabled_reason,
    updated_at
  )
  VALUES (
    p_user_id,
    p_endpoint,
    p_p256dh,
    p_auth,
    p_expiration_time,
    TRUE,
    NULL,
    NOW()
  )
  ON CONFLICT (user_id, endpoint) DO UPDATE SET
    p256dh = EXCLUDED.p256dh,
    auth = EXCLUDED.auth,
    expiration_time = EXCLUDED.expiration_time,
    enabled = TRUE,
    disabled_reason = NULL,
    updated_at = NOW();

  UPDATE public.profiles
  SET notification_channels = jsonb_set(
    COALESCE(notification_channels, '{}'::jsonb),
    '{push}',
    'true'::jsonb,
    TRUE
  )
  WHERE id = p_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_web_push_enabled(
  p_user_id UUID,
  p_enabled BOOLEAN
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = p_user_id
      AND is_active IS TRUE
  ) THEN
    RAISE EXCEPTION 'Active account required';
  END IF;

  IF p_enabled THEN
    UPDATE public.profiles
    SET notification_channels = jsonb_set(
      COALESCE(notification_channels, '{}'::jsonb),
      '{push}',
      'true'::jsonb,
      TRUE
    )
    WHERE id = p_user_id;
    RETURN;
  END IF;

  UPDATE public.web_push_subscriptions
  SET enabled = FALSE,
      disabled_reason = 'user',
      updated_at = NOW()
  WHERE user_id = p_user_id;

  UPDATE public.profiles
  SET notification_channels = jsonb_set(
    COALESCE(notification_channels, '{}'::jsonb),
    '{push}',
    'false'::jsonb,
    TRUE
  )
  WHERE id = p_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.disable_web_push_device(
  p_user_id UUID,
  p_endpoint TEXT
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  remaining INTEGER;
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = p_user_id
      AND is_active IS TRUE
  ) THEN
    RAISE EXCEPTION 'Active account required';
  END IF;

  UPDATE public.web_push_subscriptions
  SET enabled = FALSE,
      disabled_reason = 'user',
      updated_at = NOW()
  WHERE user_id = p_user_id
    AND endpoint = p_endpoint;

  SELECT COUNT(*)::INTEGER
  INTO remaining
  FROM public.web_push_subscriptions
  WHERE user_id = p_user_id
    AND enabled = TRUE;

  UPDATE public.profiles
  SET notification_channels = jsonb_set(
    COALESCE(notification_channels, '{}'::jsonb),
    '{push}',
    to_jsonb(remaining > 0),
    TRUE
  )
  WHERE id = p_user_id;

  RETURN remaining;
END;
$$;

CREATE OR REPLACE FUNCTION public.reconcile_web_push_device(
  p_user_id UUID,
  p_endpoint TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = p_user_id
      AND is_active IS TRUE
  ) THEN
    RAISE EXCEPTION 'Active account required';
  END IF;

  UPDATE public.web_push_subscriptions
  SET enabled = FALSE,
      disabled_reason = 'account_switch',
      updated_at = NOW()
  WHERE endpoint = p_endpoint
    AND user_id <> p_user_id
    AND enabled = TRUE;

  UPDATE public.web_push_subscriptions
  SET enabled = TRUE,
      disabled_reason = NULL,
      updated_at = NOW()
  WHERE user_id = p_user_id
    AND endpoint = p_endpoint
    AND enabled = FALSE
    AND disabled_reason = 'account_switch';

  UPDATE public.profiles
  SET notification_channels = jsonb_set(
    COALESCE(notification_channels, '{}'::jsonb),
    '{push}',
    'true'::jsonb,
    TRUE
  )
  WHERE id = p_user_id
    AND COALESCE(notification_channels->>'push', 'false') IS DISTINCT FROM 'true'
    AND EXISTS (
      SELECT 1
      FROM public.web_push_subscriptions
      WHERE user_id = p_user_id
        AND endpoint = p_endpoint
        AND enabled = TRUE
    );

  RETURN EXISTS (
    SELECT 1
    FROM public.web_push_subscriptions
    WHERE user_id = p_user_id
      AND endpoint = p_endpoint
      AND enabled = TRUE
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.set_web_push_account_preference(
  p_user_id UUID,
  p_enabled BOOLEAN
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
  SET notification_channels = jsonb_set(
    COALESCE(notification_channels, '{}'::jsonb),
    '{push}',
    to_jsonb(p_enabled),
    TRUE
  )
  WHERE id = p_user_id
    AND is_active IS TRUE;
END;
$$;

REVOKE ALL ON FUNCTION public.register_web_push_subscription(UUID, TEXT, TEXT, TEXT, TIMESTAMPTZ)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_web_push_enabled(UUID, BOOLEAN)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.disable_web_push_device(UUID, TEXT)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.reconcile_web_push_device(UUID, TEXT)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_web_push_account_preference(UUID, BOOLEAN)
  FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.register_web_push_subscription(UUID, TEXT, TEXT, TEXT, TIMESTAMPTZ)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.set_web_push_enabled(UUID, BOOLEAN)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.disable_web_push_device(UUID, TEXT)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.reconcile_web_push_device(UUID, TEXT)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.set_web_push_account_preference(UUID, BOOLEAN)
  TO service_role;

COMMIT;
