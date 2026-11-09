-- Add optional, admin-decided incident report rewards without changing incident workflow.

BEGIN;

ALTER TABLE public.system_settings
  ADD COLUMN IF NOT EXISTS incident_report_points_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS incident_report_points_value BIGINT NOT NULL DEFAULT 5;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.system_settings'::regclass
      AND conname = 'system_settings_incident_report_points_value_check'
  ) THEN
    ALTER TABLE public.system_settings
      ADD CONSTRAINT system_settings_incident_report_points_value_check
      CHECK (incident_report_points_value BETWEEN 0 AND 1000000);
  END IF;
END;
$$;

CREATE TABLE public.incident_report_reward_decisions (
  incident_report_id UUID PRIMARY KEY
    REFERENCES public.incident_reports(id) ON DELETE RESTRICT,
  decision TEXT NOT NULL CHECK (decision IN ('approved', 'declined')),
  decided_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  decided_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  awarded_by UUID REFERENCES public.profiles(id) ON DELETE RESTRICT,
  awarded_at TIMESTAMPTZ,
  awarded_points BIGINT,
  CONSTRAINT incident_report_reward_decision_state_check CHECK (
    (
      decision = 'approved'
      AND awarded_by IS NOT NULL
      AND awarded_by = decided_by
      AND awarded_at IS NOT NULL
      AND awarded_points IS NOT NULL
      AND awarded_points > 0
    )
    OR (
      decision = 'declined'
      AND awarded_by IS NULL
      AND awarded_at IS NULL
      AND awarded_points IS NULL
    )
  )
);

ALTER TABLE public.point_transactions
  ADD COLUMN IF NOT EXISTS incident_report_id UUID
    REFERENCES public.incident_reports(id) ON DELETE RESTRICT;

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

CREATE UNIQUE INDEX idx_point_transactions_incident_report_once
  ON public.point_transactions (incident_report_id)
  WHERE transaction_type = 'earned'
    AND reason = 'incident_report'
    AND incident_report_id IS NOT NULL;

CREATE UNIQUE INDEX idx_notifications_incident_report_reward_once
  ON public.notifications (user_id, notification_type, related_type, related_id)
  WHERE notification_type = 'incident_report_reward'
    AND related_type = 'incident_report'
    AND related_id IS NOT NULL;

ALTER TABLE public.incident_report_reward_decisions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.incident_report_reward_decisions
  FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.incident_report_reward_decisions TO service_role;

CREATE OR REPLACE FUNCTION public.decide_incident_report_points(
  p_incident_report_id UUID,
  p_decision TEXT,
  p_admin_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_incident public.incident_reports%ROWTYPE;
  v_admin_type TEXT;
  v_reporter_type TEXT;
  v_notification_channels JSONB;
  v_settings public.system_settings%ROWTYPE;
  v_points_balance BIGINT;
  v_balance_after BIGINT;
  v_decided_at TIMESTAMPTZ := transaction_timestamp();
  v_notification_audience JSONB;
  v_tourists_in_audience BOOLEAN;
  v_app_preference JSONB;
  v_app_notifications_enabled BOOLEAN;
BEGIN
  IF p_incident_report_id IS NULL OR p_admin_id IS NULL OR p_decision IS NULL
     OR p_decision NOT IN ('approved', 'declined') THEN
    RAISE EXCEPTION 'Incident report, administrator, and valid points decision are required'
      USING ERRCODE = '22023';
  END IF;
  IF auth.uid() IS NOT NULL AND auth.uid() IS DISTINCT FROM p_admin_id THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;

  SELECT profile.user_type
  INTO v_admin_type
  FROM public.profiles AS profile
  WHERE profile.id = p_admin_id;
  IF v_admin_type IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'Administrator access required' USING ERRCODE = '42501';
  END IF;

  SELECT incident.*
  INTO v_incident
  FROM public.incident_reports AS incident
  WHERE incident.id = p_incident_report_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Incident report not found' USING ERRCODE = 'P0002';
  END IF;

  PERFORM pg_advisory_xact_lock(
    hashtextextended(
      'incident_report_points:' || p_incident_report_id::TEXT,
      0
    )
  );

  IF EXISTS (
    SELECT 1
    FROM public.incident_report_reward_decisions AS decision
    WHERE decision.incident_report_id = p_incident_report_id
  ) OR EXISTS (
    SELECT 1
    FROM public.point_transactions AS transaction
    WHERE transaction.incident_report_id = p_incident_report_id
      AND transaction.transaction_type = 'earned'
      AND transaction.reason = 'incident_report'
  ) THEN
    RAISE EXCEPTION 'A points decision has already been recorded for this incident report'
      USING ERRCODE = '23505';
  END IF;

  IF p_decision = 'declined' THEN
    INSERT INTO public.incident_report_reward_decisions (
      incident_report_id, decision, decided_by, decided_at
    )
    VALUES (p_incident_report_id, 'declined', p_admin_id, v_decided_at);

    RETURN jsonb_build_object(
      'incidentReportId', p_incident_report_id,
      'decision', 'declined',
      'decidedBy', p_admin_id,
      'decidedAt', v_decided_at,
      'awardedPoints', NULL,
      'awardedAt', NULL
    );
  END IF;

  SELECT profile.user_type, profile.notification_channels
  INTO v_reporter_type, v_notification_channels
  FROM public.profiles AS profile
  WHERE profile.id = v_incident.reporter_id
  FOR SHARE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Incident report reporter profile not found'
      USING ERRCODE = 'P0002';
  END IF;
  IF v_reporter_type IS DISTINCT FROM 'tourist' THEN
    RAISE EXCEPTION 'Only registered tourist incident reports can receive points'
      USING ERRCODE = '22023';
  END IF;

  SELECT settings.*
  INTO v_settings
  FROM public.system_settings AS settings
  WHERE settings.id = 'default'
  FOR SHARE;
  IF NOT FOUND
     OR v_settings.rewards_enabled IS DISTINCT FROM TRUE
     OR v_settings.incident_report_points_enabled IS DISTINCT FROM TRUE THEN
    RAISE EXCEPTION 'Incident report rewards are disabled' USING ERRCODE = '55000';
  END IF;
  IF v_settings.incident_report_points_value IS NULL
     OR v_settings.incident_report_points_value < 1
     OR v_settings.incident_report_points_value > 1000000 THEN
    RAISE EXCEPTION 'Incident report reward points must be between 1 and 1,000,000'
      USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.tourist_points (user_id, points_balance)
  VALUES (v_incident.reporter_id, 0)
  ON CONFLICT (user_id) DO NOTHING;

  SELECT points.points_balance
  INTO v_points_balance
  FROM public.tourist_points AS points
  WHERE points.user_id = v_incident.reporter_id
  FOR UPDATE;
  v_balance_after := v_points_balance + v_settings.incident_report_points_value;

  INSERT INTO public.point_transactions (
    user_id,
    transaction_type,
    points_delta,
    balance_after,
    actor_id,
    incident_report_id,
    reason
  )
  VALUES (
    v_incident.reporter_id,
    'earned',
    v_settings.incident_report_points_value,
    v_balance_after,
    p_admin_id,
    p_incident_report_id,
    'incident_report'
  );

  UPDATE public.tourist_points
  SET points_balance = v_balance_after,
      updated_at = v_decided_at
  WHERE user_id = v_incident.reporter_id;

  INSERT INTO public.incident_report_reward_decisions (
    incident_report_id,
    decision,
    decided_by,
    decided_at,
    awarded_by,
    awarded_at,
    awarded_points
  )
  VALUES (
    p_incident_report_id,
    'approved',
    p_admin_id,
    v_decided_at,
    p_admin_id,
    v_decided_at,
    v_settings.incident_report_points_value
  );

  v_notification_audience := v_settings.notification_audience;
  IF v_notification_audience IS NULL
     OR jsonb_typeof(v_notification_audience) NOT IN ('object', 'array') THEN
    v_tourists_in_audience := TRUE;
  ELSIF jsonb_typeof(v_notification_audience) = 'array' THEN
    v_tourists_in_audience := FALSE;
  ELSIF NOT (v_notification_audience ? 'tourists') THEN
    v_tourists_in_audience := FALSE;
  ELSE
    CASE jsonb_typeof(v_notification_audience->'tourists')
      WHEN 'boolean' THEN
        v_tourists_in_audience := (v_notification_audience->>'tourists')::BOOLEAN;
      WHEN 'number' THEN
        v_tourists_in_audience := (v_notification_audience->>'tourists')::NUMERIC <> 0;
      WHEN 'string' THEN
        v_tourists_in_audience := length(v_notification_audience->>'tourists') > 0;
      WHEN 'null' THEN
        v_tourists_in_audience := FALSE;
      ELSE
        v_tourists_in_audience := TRUE;
    END CASE;
  END IF;

  IF v_notification_channels IS NULL
     OR jsonb_typeof(v_notification_channels) <> 'object' THEN
    v_app_notifications_enabled := TRUE;
  ELSE
    v_app_preference := NULLIF(v_notification_channels->'app', 'null'::JSONB);
    IF v_app_preference IS NULL THEN
      v_app_preference := NULLIF(v_notification_channels->'web', 'null'::JSONB);
    END IF;

    IF v_app_preference IS NULL THEN
      v_app_notifications_enabled := TRUE;
    ELSE
      CASE jsonb_typeof(v_app_preference)
        WHEN 'boolean' THEN
          v_app_notifications_enabled := (v_app_preference::TEXT)::BOOLEAN;
        WHEN 'number' THEN
          v_app_notifications_enabled := v_app_preference::TEXT::NUMERIC <> 0;
        WHEN 'string' THEN
          v_app_notifications_enabled := length(v_app_preference #>> '{}') > 0;
        ELSE
          v_app_notifications_enabled := TRUE;
      END CASE;
    END IF;
  END IF;

  IF v_tourists_in_audience AND v_app_notifications_enabled THEN
    INSERT INTO public.notifications (
      user_id,
      title,
      message,
      notification_type,
      priority,
      related_type,
      related_id
    )
    VALUES (
      v_incident.reporter_id,
      'Incident Report Points Awarded',
      format(
        'You earned %s points for your incident report %s.',
        v_settings.incident_report_points_value,
        v_incident.reference_number
      ),
      'incident_report_reward',
      'NORMAL',
      'incident_report',
      p_incident_report_id
    )
    ON CONFLICT (user_id, notification_type, related_type, related_id)
      WHERE notification_type = 'incident_report_reward'
        AND related_type = 'incident_report'
        AND related_id IS NOT NULL
    DO NOTHING;
  END IF;

  RETURN jsonb_build_object(
    'incidentReportId', p_incident_report_id,
    'decision', 'approved',
    'decidedBy', p_admin_id,
    'decidedAt', v_decided_at,
    'awardedBy', p_admin_id,
    'awardedAt', v_decided_at,
    'awardedPoints', v_settings.incident_report_points_value
  );
END;
$$;

REVOKE ALL ON FUNCTION public.decide_incident_report_points(UUID, TEXT, UUID)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.decide_incident_report_points(UUID, TEXT, UUID)
  TO service_role;

COMMIT;
