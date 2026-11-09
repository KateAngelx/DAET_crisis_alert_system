BEGIN;

ALTER TABLE public.system_settings
  ADD COLUMN IF NOT EXISTS tourist_guide_completion_points_enabled BOOLEAN NOT NULL DEFAULT TRUE;

INSERT INTO public.system_settings (id)
VALUES ('default')
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.tourist_guide_completions (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.tourist_guide_completions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.tourist_guide_completions FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.tourist_guide_completions TO service_role;

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
          AND crisis_feedback_submission_id IS NULL
          AND incident_report_id IS NULL
          AND reason IS NULL
        )
        OR (
          activity_completion_id IS NULL
          AND reward_redemption_id IS NULL
          AND crisis_alert_id IS NULL
          AND route_advisory_id IS NULL
          AND crisis_feedback_submission_id IS NULL
          AND incident_report_id IS NULL
          AND reason = 'registration'
        )
        OR (
          activity_completion_id IS NULL
          AND reward_redemption_id IS NULL
          AND crisis_alert_id IS NOT NULL
          AND route_advisory_id IS NULL
          AND crisis_feedback_submission_id IS NULL
          AND incident_report_id IS NULL
          AND reason = 'alert_read'
        )
        OR (
          activity_completion_id IS NULL
          AND reward_redemption_id IS NULL
          AND crisis_alert_id IS NULL
          AND route_advisory_id IS NOT NULL
          AND crisis_feedback_submission_id IS NULL
          AND incident_report_id IS NULL
          AND reason IN ('road_view', 'hazard_view')
        )
        OR (
          activity_completion_id IS NULL
          AND reward_redemption_id IS NULL
          AND crisis_alert_id IS NULL
          AND route_advisory_id IS NULL
          AND crisis_feedback_submission_id IS NULL
          AND incident_report_id IS NULL
          AND reason = 'profile_completion'
        )
        OR (
          activity_completion_id IS NULL
          AND reward_redemption_id IS NULL
          AND crisis_alert_id IS NULL
          AND route_advisory_id IS NULL
          AND crisis_feedback_submission_id IS NOT NULL
          AND incident_report_id IS NULL
          AND reason = 'crisis_feedback'
        )
        OR (
          activity_completion_id IS NULL
          AND reward_redemption_id IS NULL
          AND crisis_alert_id IS NULL
          AND route_advisory_id IS NULL
          AND crisis_feedback_submission_id IS NULL
          AND incident_report_id IS NOT NULL
          AND reason = 'incident_report'
        )
        OR (
          activity_completion_id IS NULL
          AND reward_redemption_id IS NULL
          AND crisis_alert_id IS NULL
          AND route_advisory_id IS NULL
          AND crisis_feedback_submission_id IS NULL
          AND incident_report_id IS NULL
          AND reason = 'tourist_guide_completion'
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
      AND crisis_feedback_submission_id IS NULL
      AND incident_report_id IS NULL
    )
    OR (
      transaction_type = 'adjustment'
      AND activity_completion_id IS NULL
      AND crisis_alert_id IS NULL
      AND route_advisory_id IS NULL
      AND crisis_feedback_submission_id IS NULL
      AND incident_report_id IS NULL
      AND (reward_redemption_id IS NULL OR points_delta > 0)
      AND reason IS NOT NULL
      AND length(btrim(reason)) > 0
    )
  );

CREATE UNIQUE INDEX IF NOT EXISTS idx_point_transactions_tourist_guide_completion_once
  ON public.point_transactions (user_id)
  WHERE transaction_type = 'earned'
    AND reason = 'tourist_guide_completion';

CREATE OR REPLACE FUNCTION public.complete_tourist_guide(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_type TEXT;
  v_rewards_enabled BOOLEAN;
  v_reward_enabled BOOLEAN;
  v_settings_found BOOLEAN;
  v_inserted_rows INTEGER;
  v_completed_at TIMESTAMPTZ;
  v_balance_after BIGINT;
  v_points_awarded BIGINT;
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'User ID is required' USING ERRCODE = '22023';
  END IF;
  IF auth.uid() IS NOT NULL AND auth.uid() IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;

  SELECT profile.user_type
  INTO v_user_type
  FROM public.profiles AS profile
  WHERE profile.id = p_user_id;

  IF v_user_type IS DISTINCT FROM 'tourist' THEN
    RAISE EXCEPTION 'Tourist access required' USING ERRCODE = '42501';
  END IF;

  PERFORM pg_advisory_xact_lock(
    hashtextextended('tourist_guide_completion:' || p_user_id::TEXT, 0)
  );

  INSERT INTO public.tourist_guide_completions (user_id)
  VALUES (p_user_id)
  ON CONFLICT (user_id) DO NOTHING;
  GET DIAGNOSTICS v_inserted_rows = ROW_COUNT;

  IF v_inserted_rows = 0 THEN
    SELECT completion.completed_at
    INTO v_completed_at
    FROM public.tourist_guide_completions AS completion
    WHERE completion.user_id = p_user_id;

    SELECT transaction.points_delta
    INTO v_points_awarded
    FROM public.point_transactions AS transaction
    WHERE transaction.user_id = p_user_id
      AND transaction.transaction_type = 'earned'
      AND transaction.reason = 'tourist_guide_completion';

    SELECT COALESCE(points.points_balance, 0)
    INTO v_balance_after
    FROM public.tourist_points AS points
    WHERE points.user_id = p_user_id;

    RETURN jsonb_build_object(
      'status', 'already_completed',
      'completedAt', v_completed_at,
      'rewardAwarded', v_points_awarded IS NOT NULL,
      'pointsAwarded', COALESCE(v_points_awarded, 0),
      'balance', COALESCE(v_balance_after, 0)
    );
  END IF;

  SELECT settings.rewards_enabled,
         settings.tourist_guide_completion_points_enabled
  INTO v_rewards_enabled, v_reward_enabled
  FROM public.system_settings AS settings
  WHERE settings.id = 'default';
  v_settings_found := FOUND;

  SELECT COALESCE(points.points_balance, 0)
  INTO v_balance_after
  FROM public.tourist_points AS points
  WHERE points.user_id = p_user_id;

  IF NOT v_settings_found
     OR v_rewards_enabled IS DISTINCT FROM TRUE
     OR v_reward_enabled IS DISTINCT FROM TRUE THEN
    RETURN jsonb_build_object(
      'status', 'completed_reward_disabled',
      'completedAt', transaction_timestamp(),
      'rewardAwarded', FALSE,
      'pointsAwarded', 0,
      'balance', COALESCE(v_balance_after, 0)
    );
  END IF;

  INSERT INTO public.tourist_points (user_id, points_balance)
  VALUES (p_user_id, 0)
  ON CONFLICT (user_id) DO NOTHING;

  SELECT points.points_balance
  INTO v_balance_after
  FROM public.tourist_points AS points
  WHERE points.user_id = p_user_id
  FOR UPDATE;

  v_balance_after := v_balance_after + 10;

  UPDATE public.tourist_points
  SET points_balance = v_balance_after,
      updated_at = transaction_timestamp()
  WHERE user_id = p_user_id;

  INSERT INTO public.point_transactions (
    user_id,
    transaction_type,
    points_delta,
    balance_after,
    reason
  )
  VALUES (
    p_user_id,
    'earned',
    10,
    v_balance_after,
    'tourist_guide_completion'
  );

  RETURN jsonb_build_object(
    'status', 'awarded',
    'completedAt', transaction_timestamp(),
    'rewardAwarded', TRUE,
    'pointsAwarded', 10,
    'balance', v_balance_after
  );
END;
$$;

REVOKE ALL ON FUNCTION public.complete_tourist_guide(UUID)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.complete_tourist_guide(UUID)
  TO service_role;

COMMIT;