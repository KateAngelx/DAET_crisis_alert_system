BEGIN;

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

  INSERT INTO public.web_push_subscriptions (
    user_id,
    endpoint,
    p256dh,
    auth,
    expiration_time,
    enabled,
    updated_at
  )
  VALUES (
    p_user_id,
    p_endpoint,
    p_p256dh,
    p_auth,
    p_expiration_time,
    TRUE,
    NOW()
  )
  ON CONFLICT (endpoint) DO UPDATE SET
    user_id = EXCLUDED.user_id,
    p256dh = EXCLUDED.p256dh,
    auth = EXCLUDED.auth,
    expiration_time = EXCLUDED.expiration_time,
    enabled = TRUE,
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

REVOKE ALL ON FUNCTION public.register_web_push_subscription(UUID, TEXT, TEXT, TEXT, TIMESTAMPTZ)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.register_web_push_subscription(UUID, TEXT, TEXT, TEXT, TIMESTAMPTZ)
  TO service_role;

COMMIT;