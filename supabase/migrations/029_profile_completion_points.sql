-- Award one-time points when a tourist first completes the existing profile fields.

BEGIN;

ALTER TABLE public.system_settings
  ADD COLUMN IF NOT EXISTS profile_completion_points_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS profile_completion_points_value BIGINT NOT NULL DEFAULT 10;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.system_settings'::regclass
      AND conname = 'system_settings_profile_completion_points_value_check'
  ) THEN
    ALTER TABLE public.system_settings
      ADD CONSTRAINT system_settings_profile_completion_points_value_check
      CHECK (profile_completion_points_value BETWEEN 0 AND 1000000);
  END IF;
END;
$$;

INSERT INTO public.system_settings (id)
VALUES ('default')
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.point_transactions
  DROP CONSTRAINT IF EXISTS point_transactions_type_reference_check;

ALTER TABLE public.point_transactions
  ADD CONSTRAINT point_transactions_type_reference_check CHECK (
    (
      transaction_type = 'earned'
      AND points_delta > 0
      AND (
        (
          activity_completion_id IS NOT NULL
          AND reward_redemption_id IS NULL
          AND crisis_alert_id IS NULL
          AND route_advisory_id IS NULL
          AND reason IS NULL
        )
        OR (
          activity_completion_id IS NULL
          AND reward_redemption_id IS NULL
          AND crisis_alert_id IS NULL
          AND route_advisory_id IS NULL
          AND reason = 'registration'
        )
        OR (
          activity_completion_id IS NULL
          AND reward_redemption_id IS NULL
          AND crisis_alert_id IS NOT NULL
          AND route_advisory_id IS NULL
          AND reason = 'alert_read'
        )
        OR (
          activity_completion_id IS NULL
          AND reward_redemption_id IS NULL
          AND crisis_alert_id IS NULL
          AND route_advisory_id IS NOT NULL
          AND reason IN ('road_view', 'hazard_view')
        )
        OR (
          activity_completion_id IS NULL
          AND reward_redemption_id IS NULL
          AND crisis_alert_id IS NULL
          AND route_advisory_id IS NULL
          AND reason = 'profile_completion'
        )
      )
    )
    OR (
      transaction_type = 'spent'
      AND points_delta < 0
      AND activity_completion_id IS NULL
      AND reward_redemption_id IS NOT NULL
      AND crisis_alert_id IS NULL
      AND route_advisory_id IS NULL
    )
    OR (
      transaction_type = 'adjustment'
      AND activity_completion_id IS NULL
      AND crisis_alert_id IS NULL
      AND route_advisory_id IS NULL
      AND (reward_redemption_id IS NULL OR points_delta > 0)
      AND reason IS NOT NULL
      AND length(btrim(reason)) > 0
    )
  );

CREATE UNIQUE INDEX IF NOT EXISTS idx_point_transactions_profile_completion_once
  ON public.point_transactions (user_id)
  WHERE transaction_type = 'earned' AND reason = 'profile_completion';

CREATE OR REPLACE FUNCTION public.award_profile_completion_points()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_was_complete BOOLEAN := FALSE;
  v_rewards_enabled BOOLEAN;
  v_activity_enabled BOOLEAN;
  v_points BIGINT;
  v_balance_after BIGINT;
BEGIN
  IF NEW.user_type IS DISTINCT FROM 'tourist' THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    v_was_complete :=
      length(btrim(COALESCE(OLD.full_name, ''))) > 0
      AND length(btrim(COALESCE(OLD.full_name, ''))) <= 100
      AND COALESCE(OLD.phone, '') ~ '^09[0-9]{9}$'
      AND COALESCE(OLD.nationality, '') IN ('Filipino', 'Foreigner');
  END IF;

  IF v_was_complete
     OR length(btrim(COALESCE(NEW.full_name, ''))) = 0
     OR length(btrim(COALESCE(NEW.full_name, ''))) > 100
     OR COALESCE(NEW.phone, '') !~ '^09[0-9]{9}$'
     OR COALESCE(NEW.nationality, '') NOT IN ('Filipino', 'Foreigner') THEN
    RETURN NEW;
  END IF;

  SELECT settings.rewards_enabled,
         settings.profile_completion_points_enabled,
         settings.profile_completion_points_value
  INTO v_rewards_enabled, v_activity_enabled, v_points
  FROM public.system_settings AS settings
  WHERE settings.id = 'default';

  IF NOT FOUND
     OR NOT v_rewards_enabled
     OR NOT v_activity_enabled
     OR v_points IS NULL
     OR v_points <= 0 THEN
    RETURN NEW;
  END IF;

  PERFORM pg_advisory_xact_lock(
    hashtextextended(NEW.id::TEXT || ':profile_completion', 0)
  );

  IF EXISTS (
    SELECT 1
    FROM public.point_transactions AS transaction
    WHERE transaction.user_id = NEW.id
      AND transaction.transaction_type = 'earned'
      AND transaction.reason = 'profile_completion'
  ) THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.tourist_points (user_id, points_balance)
  VALUES (NEW.id, 0)
  ON CONFLICT (user_id) DO NOTHING;

  UPDATE public.tourist_points
  SET points_balance = points_balance + v_points,
      updated_at = NOW()
  WHERE user_id = NEW.id
  RETURNING points_balance INTO v_balance_after;

  INSERT INTO public.point_transactions (
    user_id,
    transaction_type,
    points_delta,
    balance_after,
    reason
  )
  VALUES (
    NEW.id,
    'earned',
    v_points,
    v_balance_after,
    'profile_completion'
  );

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.award_profile_completion_points()
  FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_award_profile_completion_points ON public.profiles;
CREATE TRIGGER trg_award_profile_completion_points
  AFTER INSERT OR UPDATE OF full_name, phone, nationality ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.award_profile_completion_points();

CREATE OR REPLACE FUNCTION public.update_tourist_profile_with_completion_award(
  p_user_id UUID,
  p_full_name TEXT,
  p_phone TEXT,
  p_nationality TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_profile public.profiles%ROWTYPE;
  v_previous_award_id UUID;
  v_award_id UUID;
  v_award_points BIGINT;
BEGIN
  IF p_user_id IS NULL
     OR (auth.uid() IS NOT NULL AND auth.uid() IS DISTINCT FROM p_user_id) THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;

  IF p_full_name IS NULL
     OR length(btrim(p_full_name)) = 0
     OR length(p_full_name) > 100
     OR p_phone IS NULL
     OR p_phone !~ '^09[0-9]{9}$'
     OR p_nationality IS NULL
     OR p_nationality NOT IN ('Filipino', 'Foreigner') THEN
    RAISE EXCEPTION 'Complete all required profile fields with valid values'
      USING ERRCODE = '22023';
  END IF;

  SELECT profile.*
  INTO v_profile
  FROM public.profiles AS profile
  WHERE profile.id = p_user_id
    AND profile.user_type = 'tourist'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Tourist profile not found' USING ERRCODE = 'P0002';
  END IF;

  SELECT transaction.id
  INTO v_previous_award_id
  FROM public.point_transactions AS transaction
  WHERE transaction.user_id = p_user_id
    AND transaction.transaction_type = 'earned'
    AND transaction.reason = 'profile_completion';

  UPDATE public.profiles
  SET full_name = btrim(p_full_name),
      phone = btrim(p_phone),
      nationality = p_nationality
  WHERE id = p_user_id
  RETURNING * INTO v_profile;

  IF v_previous_award_id IS NULL THEN
    SELECT transaction.id, transaction.points_delta
    INTO v_award_id, v_award_points
    FROM public.point_transactions AS transaction
    WHERE transaction.user_id = p_user_id
      AND transaction.transaction_type = 'earned'
      AND transaction.reason = 'profile_completion';
  END IF;

  RETURN jsonb_build_object(
    'profile', jsonb_build_object(
      'id', v_profile.id,
      'full_name', v_profile.full_name,
      'phone', v_profile.phone,
      'email', v_profile.email,
      'nationality', v_profile.nationality,
      'user_type', v_profile.user_type,
      'created_at', v_profile.created_at,
      'notification_channels', v_profile.notification_channels,
      'notification_channels_configured', v_profile.notification_channels_configured
    ),
    'profileCompletionReward',
    CASE
      WHEN v_award_id IS NULL THEN NULL
      ELSE jsonb_build_object('id', v_award_id, 'points', v_award_points)
    END
  );
END;
$$;

REVOKE ALL ON FUNCTION public.update_tourist_profile_with_completion_award(UUID, TEXT, TEXT, TEXT)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.update_tourist_profile_with_completion_award(UUID, TEXT, TEXT, TEXT)
  TO service_role;

COMMIT;
