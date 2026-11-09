-- Award one-time points for explicitly eligible, non-emergency public advisories.

BEGIN;

ALTER TABLE public.system_settings
  ADD COLUMN IF NOT EXISTS alert_reading_points_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS alert_reading_points_value BIGINT NOT NULL DEFAULT 5;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.system_settings'::regclass
      AND conname = 'system_settings_alert_reading_points_value_check'
  ) THEN
    ALTER TABLE public.system_settings
      ADD CONSTRAINT system_settings_alert_reading_points_value_check
      CHECK (alert_reading_points_value BETWEEN 0 AND 1000000);
  END IF;
END;
$$;

ALTER TABLE public.crisis_alerts
  ADD COLUMN IF NOT EXISTS rewards_eligible BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE public.point_transactions
  ADD COLUMN IF NOT EXISTS crisis_alert_id UUID;

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
          AND reason IS NULL
        )
        OR (
          activity_completion_id IS NULL
          AND reward_redemption_id IS NULL
          AND crisis_alert_id IS NULL
          AND reason = 'registration'
        )
        OR (
          activity_completion_id IS NULL
          AND reward_redemption_id IS NULL
          AND crisis_alert_id IS NOT NULL
          AND reason = 'alert_read'
        )
      )
    )
    OR (
      transaction_type = 'spent'
      AND points_delta < 0
      AND activity_completion_id IS NULL
      AND reward_redemption_id IS NOT NULL
      AND crisis_alert_id IS NULL
    )
    OR (
      transaction_type = 'adjustment'
      AND activity_completion_id IS NULL
      AND crisis_alert_id IS NULL
      AND reason IS NOT NULL
      AND length(btrim(reason)) > 0
    )
  );

CREATE UNIQUE INDEX IF NOT EXISTS idx_point_transactions_alert_read_once
  ON public.point_transactions (user_id, crisis_alert_id)
  WHERE transaction_type = 'earned'
    AND reason = 'alert_read'
    AND crisis_alert_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.award_alert_read_points(
  p_user_id UUID,
  p_alert_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_type TEXT;
  v_alert public.crisis_alerts%ROWTYPE;
  v_rewards_enabled BOOLEAN;
  v_activity_enabled BOOLEAN;
  v_points BIGINT;
  v_balance_after BIGINT;
BEGIN
  SELECT profile.user_type
  INTO v_user_type
  FROM public.profiles AS profile
  WHERE profile.id = p_user_id;

  IF v_user_type IS DISTINCT FROM 'tourist' THEN
    RETURN jsonb_build_object('status', 'not_tourist');
  END IF;

  SELECT settings.rewards_enabled,
         settings.alert_reading_points_enabled,
         settings.alert_reading_points_value
  INTO v_rewards_enabled, v_activity_enabled, v_points
  FROM public.system_settings AS settings
  WHERE settings.id = 'default';

  IF NOT FOUND OR NOT v_rewards_enabled THEN
    RETURN jsonb_build_object('status', 'rewards_disabled');
  END IF;
  IF NOT v_activity_enabled OR v_points IS NULL OR v_points <= 0 THEN
    RETURN jsonb_build_object('status', 'activity_disabled');
  END IF;

  SELECT alert.*
  INTO v_alert
  FROM public.crisis_alerts AS alert
  WHERE alert.id = p_alert_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('status', 'alert_not_found');
  END IF;

  IF v_alert.rewards_eligible IS DISTINCT FROM TRUE
     OR v_alert.is_public IS DISTINCT FROM TRUE
     OR lower(btrim(COALESCE(v_alert.status, ''))) <> 'active'
     OR lower(btrim(COALESCE(v_alert.severity, ''))) NOT IN ('low', 'medium')
     OR lower(btrim(COALESCE(v_alert.type, ''))) NOT IN ('general', 'weather', 'health')
     OR concat_ws(' ', v_alert.title, v_alert.message, v_alert.type)
       ~* '(emergency|evacuat|warning|911|117|assistance|assist|urgent|immediate danger|rescue|shelter|call police|call the police|call fire|call ambulance)' THEN
    RETURN jsonb_build_object('status', 'not_eligible');
  END IF;

  PERFORM pg_advisory_xact_lock(
    hashtextextended(p_user_id::TEXT || ':' || p_alert_id::TEXT, 0)
  );

  IF EXISTS (
    SELECT 1
    FROM public.point_transactions AS transaction
    WHERE transaction.user_id = p_user_id
      AND transaction.transaction_type = 'earned'
      AND transaction.reason = 'alert_read'
      AND transaction.crisis_alert_id = p_alert_id
  ) THEN
    SELECT points.points_balance
    INTO v_balance_after
    FROM public.tourist_points AS points
    WHERE points.user_id = p_user_id;

    RETURN jsonb_build_object(
      'status', 'already_awarded',
      'balance', COALESCE(v_balance_after, 0)
    );
  END IF;

  INSERT INTO public.tourist_points (user_id, points_balance)
  VALUES (p_user_id, 0)
  ON CONFLICT (user_id) DO NOTHING;

  UPDATE public.tourist_points
  SET points_balance = points_balance + v_points,
      updated_at = NOW()
  WHERE user_id = p_user_id
  RETURNING points_balance INTO v_balance_after;

  INSERT INTO public.point_transactions (
    user_id,
    transaction_type,
    points_delta,
    balance_after,
    crisis_alert_id,
    reason
  )
  VALUES (
    p_user_id,
    'earned',
    v_points,
    v_balance_after,
    p_alert_id,
    'alert_read'
  );

  RETURN jsonb_build_object(
    'status', 'awarded',
    'points', v_points,
    'balance', v_balance_after
  );
END;
$$;

REVOKE ALL ON FUNCTION public.award_alert_read_points(UUID, UUID)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.award_alert_read_points(UUID, UUID)
  TO service_role;

COMMIT;
