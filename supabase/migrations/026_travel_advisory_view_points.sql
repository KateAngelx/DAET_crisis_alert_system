-- Award one-time points for viewing published road and area advisory details.

BEGIN;

ALTER TABLE public.system_settings
  ADD COLUMN IF NOT EXISTS road_viewing_points_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS road_viewing_points_value BIGINT NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS hazard_viewing_points_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS hazard_viewing_points_value BIGINT NOT NULL DEFAULT 5;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.system_settings'::regclass
      AND conname = 'system_settings_road_viewing_points_value_check'
  ) THEN
    ALTER TABLE public.system_settings
      ADD CONSTRAINT system_settings_road_viewing_points_value_check
      CHECK (road_viewing_points_value BETWEEN 0 AND 1000000);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.system_settings'::regclass
      AND conname = 'system_settings_hazard_viewing_points_value_check'
  ) THEN
    ALTER TABLE public.system_settings
      ADD CONSTRAINT system_settings_hazard_viewing_points_value_check
      CHECK (hazard_viewing_points_value BETWEEN 0 AND 1000000);
  END IF;
END;
$$;

ALTER TABLE public.point_transactions
  ADD COLUMN IF NOT EXISTS route_advisory_id UUID;

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

CREATE UNIQUE INDEX IF NOT EXISTS idx_point_transactions_travel_advisory_view_once
  ON public.point_transactions (user_id, route_advisory_id)
  WHERE transaction_type = 'earned'
    AND reason IN ('road_view', 'hazard_view')
    AND route_advisory_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.award_travel_advisory_view_points(
  p_user_id UUID,
  p_advisory_id UUID,
  p_activity_type TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_type TEXT;
  v_rewards_enabled BOOLEAN;
  v_activity_enabled BOOLEAN;
  v_points BIGINT;
  v_balance_after BIGINT;
BEGIN
  IF p_activity_type IS NULL OR p_activity_type NOT IN ('road_view', 'hazard_view') THEN
    RETURN jsonb_build_object('status', 'invalid_activity');
  END IF;

  IF auth.uid() IS NOT NULL AND auth.uid() IS DISTINCT FROM p_user_id THEN
    RETURN jsonb_build_object('status', 'not_authorized');
  END IF;

  SELECT profile.user_type
  INTO v_user_type
  FROM public.profiles AS profile
  WHERE profile.id = p_user_id;

  IF v_user_type IS DISTINCT FROM 'tourist' THEN
    RETURN jsonb_build_object('status', 'not_tourist');
  END IF;

  PERFORM 1
  FROM public.route_advisories AS advisory
  WHERE advisory.id = p_advisory_id
    AND advisory.advisory_kind = CASE p_activity_type
      WHEN 'road_view' THEN 'route'
      WHEN 'hazard_view' THEN 'area'
    END
    AND advisory.status = 'Active'
    AND advisory.is_public IS TRUE
  FOR SHARE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('status', 'advisory_not_found');
  END IF;

  PERFORM pg_advisory_xact_lock(
    hashtextextended(p_user_id::TEXT || ':' || p_advisory_id::TEXT, 0)
  );

  IF EXISTS (
    SELECT 1
    FROM public.point_transactions AS transaction
    WHERE transaction.user_id = p_user_id
      AND transaction.transaction_type = 'earned'
      AND transaction.reason IN ('road_view', 'hazard_view')
      AND transaction.route_advisory_id = p_advisory_id
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

  SELECT settings.rewards_enabled,
         CASE p_activity_type
           WHEN 'road_view' THEN settings.road_viewing_points_enabled
           ELSE settings.hazard_viewing_points_enabled
         END,
         CASE p_activity_type
           WHEN 'road_view' THEN settings.road_viewing_points_value
           ELSE settings.hazard_viewing_points_value
         END
  INTO v_rewards_enabled, v_activity_enabled, v_points
  FROM public.system_settings AS settings
  WHERE settings.id = 'default';

  IF NOT FOUND OR NOT v_rewards_enabled THEN
    RETURN jsonb_build_object('status', 'rewards_disabled');
  END IF;
  IF NOT v_activity_enabled OR v_points IS NULL OR v_points <= 0 THEN
    RETURN jsonb_build_object('status', 'activity_disabled');
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
    route_advisory_id,
    reason
  )
  VALUES (
    p_user_id,
    'earned',
    v_points,
    v_balance_after,
    p_advisory_id,
    p_activity_type
  );

  RETURN jsonb_build_object(
    'status', 'awarded',
    'points', v_points,
    'balance', v_balance_after
  );
END;
$$;

REVOKE ALL ON FUNCTION public.award_travel_advisory_view_points(UUID, UUID, TEXT)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.award_travel_advisory_view_points(UUID, UUID, TEXT)
  TO service_role;

COMMIT;
