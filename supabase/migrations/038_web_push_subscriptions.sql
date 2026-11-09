BEGIN;

ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS event_key TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS notifications_user_event_key_unique_idx
  ON public.notifications (user_id, event_key)
  WHERE event_key IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.web_push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  expiration_time TIMESTAMPTZ,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS web_push_subscriptions_user_enabled_idx
  ON public.web_push_subscriptions (user_id, enabled);

ALTER TABLE public.web_push_subscriptions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.web_push_subscriptions FROM anon, authenticated;
GRANT ALL ON public.web_push_subscriptions TO service_role;

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
    SELECT 1 FROM public.profiles
    WHERE id = p_user_id AND is_active IS TRUE
  ) THEN
    RAISE EXCEPTION 'Active account required';
  END IF;

  INSERT INTO public.web_push_subscriptions
    (user_id, endpoint, p256dh, auth, expiration_time, enabled, updated_at)
  VALUES
    (p_user_id, p_endpoint, p_p256dh, p_auth, p_expiration_time, TRUE, now())
  ON CONFLICT (endpoint) DO UPDATE SET
    user_id = EXCLUDED.user_id,
    p256dh = EXCLUDED.p256dh,
    auth = EXCLUDED.auth,
    expiration_time = EXCLUDED.expiration_time,
    enabled = TRUE,
    updated_at = now();

  UPDATE public.web_push_subscriptions
  SET enabled = TRUE, updated_at = now()
  WHERE user_id = p_user_id;

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
    SELECT 1 FROM public.profiles
    WHERE id = p_user_id AND is_active IS TRUE
  ) THEN
    RAISE EXCEPTION 'Active account required';
  END IF;

  UPDATE public.web_push_subscriptions
  SET enabled = p_enabled, updated_at = now()
  WHERE user_id = p_user_id;

  UPDATE public.profiles
  SET notification_channels = jsonb_set(
        COALESCE(notification_channels, '{}'::jsonb),
        '{push}',
        to_jsonb(p_enabled),
        TRUE
      )
  WHERE id = p_user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.register_web_push_subscription(UUID, TEXT, TEXT, TEXT, TIMESTAMPTZ)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_web_push_enabled(UUID, BOOLEAN)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.register_web_push_subscription(UUID, TEXT, TEXT, TEXT, TIMESTAMPTZ)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.set_web_push_enabled(UUID, BOOLEAN)
  TO service_role;

COMMIT;
