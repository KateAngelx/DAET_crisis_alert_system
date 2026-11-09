-- Add moderated crisis feedback with a separate, optional tourist reward action.

BEGIN;

ALTER TABLE public.system_settings
  ADD COLUMN IF NOT EXISTS crisis_feedback_points_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS crisis_feedback_points_min_value BIGINT NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS crisis_feedback_points_value BIGINT NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS crisis_feedback_points_max_value BIGINT NOT NULL DEFAULT 100,
  ADD COLUMN IF NOT EXISTS crisis_feedback_daily_submission_cap INTEGER NOT NULL DEFAULT 1;

INSERT INTO public.system_settings (id)
VALUES ('default')
ON CONFLICT (id) DO NOTHING;

UPDATE public.system_settings
SET crisis_feedback_points_enabled = FALSE,
    crisis_feedback_points_value = 5
WHERE crisis_feedback_points_value < 1;

UPDATE public.system_settings
SET crisis_feedback_points_max_value =
  GREATEST(crisis_feedback_points_max_value, crisis_feedback_points_value);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.system_settings'::regclass
      AND conname = 'system_settings_crisis_feedback_points_range_check'
  ) THEN
    ALTER TABLE public.system_settings
      DROP CONSTRAINT IF EXISTS system_settings_crisis_feedback_points_value_check;
    ALTER TABLE public.system_settings
      ADD CONSTRAINT system_settings_crisis_feedback_points_range_check
      CHECK (
        crisis_feedback_points_min_value BETWEEN 1 AND 1000000
        AND crisis_feedback_points_value BETWEEN crisis_feedback_points_min_value
          AND crisis_feedback_points_max_value
        AND crisis_feedback_points_max_value BETWEEN crisis_feedback_points_min_value
          AND 1000000
        AND crisis_feedback_daily_submission_cap BETWEEN 1 AND 1000000
      );
  END IF;
END;
$$;

CREATE TABLE public.crisis_feedback_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submitter_category TEXT NOT NULL
    CHECK (submitter_category IN ('registered_tourist', 'anonymous')),
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  display_name TEXT CHECK (display_name IS NULL OR char_length(display_name) <= 80),
  crisis_alert_id UUID REFERENCES public.crisis_alerts(id) ON DELETE SET NULL,
  submission_type TEXT NOT NULL
    CHECK (submission_type IN ('comment', 'feedback', 'suggestion')),
  message TEXT NOT NULL
    CHECK (char_length(btrim(message)) BETWEEN 1 AND 1000),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected', 'removed')),
  is_hidden BOOLEAN NOT NULL DEFAULT FALSE,
  reward_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (reward_status IN ('pending', 'awarded', 'disabled', 'cap_reached', 'not_eligible')),
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  awarded_by UUID,
  awarded_at TIMESTAMPTZ,
  awarded_points BIGINT,
  moderated_at TIMESTAMPTZ,
  moderated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  moderation_note TEXT CHECK (moderation_note IS NULL OR char_length(moderation_note) <= 1000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT crisis_feedback_registered_identity_check
    CHECK (submitter_category <> 'anonymous' OR user_id IS NULL),
  CONSTRAINT crisis_feedback_removed_hidden_check
    CHECK (status <> 'removed' OR is_hidden),
  CONSTRAINT crisis_feedback_approval_audit_check
    CHECK ((approved_by IS NULL) = (approved_at IS NULL)),
  CONSTRAINT crisis_feedback_award_audit_check
    CHECK (
      (
        reward_status = 'awarded'
        AND awarded_by IS NOT NULL
        AND awarded_at IS NOT NULL
        AND awarded_points IS NOT NULL
        AND awarded_points > 0
      )
      OR (
        reward_status <> 'awarded'
        AND awarded_by IS NULL
        AND awarded_at IS NULL
        AND awarded_points IS NULL
      )
    ),
  CONSTRAINT crisis_feedback_removed_unawarded_check
    CHECK (status <> 'removed' OR awarded_at IS NULL)
);

CREATE INDEX idx_crisis_feedback_status_created
  ON public.crisis_feedback_submissions (status, created_at DESC);
CREATE INDEX idx_crisis_feedback_category_status_created
  ON public.crisis_feedback_submissions (submitter_category, status, created_at DESC);
CREATE INDEX idx_crisis_feedback_type_created
  ON public.crisis_feedback_submissions (submission_type, created_at DESC);
CREATE INDEX idx_crisis_feedback_alert_created
  ON public.crisis_feedback_submissions (crisis_alert_id, created_at DESC)
  WHERE crisis_alert_id IS NOT NULL;
CREATE INDEX idx_crisis_feedback_user_created
  ON public.crisis_feedback_submissions (user_id, created_at DESC)
  WHERE user_id IS NOT NULL;

CREATE TABLE public.crisis_feedback_moderation_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL
    REFERENCES public.crisis_feedback_submissions(id) ON DELETE RESTRICT,
  actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL
    CHECK (action IN ('approved', 'rejected', 'removed', 'hidden', 'unhidden', 'points_awarded')),
  previous_status TEXT NOT NULL
    CHECK (previous_status IN ('pending', 'approved', 'rejected', 'removed')),
  new_status TEXT NOT NULL
    CHECK (new_status IN ('pending', 'approved', 'rejected', 'removed')),
  note TEXT CHECK (note IS NULL OR char_length(note) <= 1000),
  points_awarded BIGINT,
  CONSTRAINT crisis_feedback_moderation_points_check
    CHECK (
      (action = 'points_awarded' AND points_awarded IS NOT NULL AND points_awarded > 0)
      OR (action <> 'points_awarded' AND points_awarded IS NULL)
    ),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_crisis_feedback_moderation_submission_created
  ON public.crisis_feedback_moderation_events (submission_id, created_at DESC);

ALTER TABLE public.point_transactions
  ADD COLUMN IF NOT EXISTS crisis_feedback_submission_id UUID
    REFERENCES public.crisis_feedback_submissions(id) ON DELETE RESTRICT;

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
          AND reason IS NULL
        )
        OR (
          activity_completion_id IS NULL
          AND reward_redemption_id IS NULL
          AND crisis_alert_id IS NULL
          AND route_advisory_id IS NULL
          AND crisis_feedback_submission_id IS NULL
          AND reason = 'registration'
        )
        OR (
          activity_completion_id IS NULL
          AND reward_redemption_id IS NULL
          AND crisis_alert_id IS NOT NULL
          AND route_advisory_id IS NULL
          AND crisis_feedback_submission_id IS NULL
          AND reason = 'alert_read'
        )
        OR (
          activity_completion_id IS NULL
          AND reward_redemption_id IS NULL
          AND crisis_alert_id IS NULL
          AND route_advisory_id IS NOT NULL
          AND crisis_feedback_submission_id IS NULL
          AND reason IN ('road_view', 'hazard_view')
        )
        OR (
          activity_completion_id IS NULL
          AND reward_redemption_id IS NULL
          AND crisis_alert_id IS NULL
          AND route_advisory_id IS NULL
          AND crisis_feedback_submission_id IS NULL
          AND reason = 'profile_completion'
        )
        OR (
          activity_completion_id IS NULL
          AND reward_redemption_id IS NULL
          AND crisis_alert_id IS NULL
          AND route_advisory_id IS NULL
          AND crisis_feedback_submission_id IS NOT NULL
          AND reason = 'crisis_feedback'
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
    )
    OR (
      transaction_type = 'adjustment'
      AND activity_completion_id IS NULL
      AND crisis_alert_id IS NULL
      AND route_advisory_id IS NULL
      AND crisis_feedback_submission_id IS NULL
      AND (reward_redemption_id IS NULL OR points_delta > 0)
      AND reason IS NOT NULL
      AND length(btrim(reason)) > 0
    )
  );

CREATE UNIQUE INDEX idx_point_transactions_crisis_feedback_once
  ON public.point_transactions (crisis_feedback_submission_id)
  WHERE transaction_type = 'earned'
    AND reason = 'crisis_feedback'
    AND crisis_feedback_submission_id IS NOT NULL;

CREATE UNIQUE INDEX idx_notifications_crisis_feedback_reward_once
  ON public.notifications (user_id, notification_type, related_type, related_id)
  WHERE notification_type = 'crisis_feedback_reward'
    AND related_type = 'crisis_feedback'
    AND related_id IS NOT NULL;

ALTER TABLE public.crisis_feedback_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crisis_feedback_moderation_events ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE
  public.crisis_feedback_submissions,
  public.crisis_feedback_moderation_events
FROM PUBLIC, anon, authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE
  ON TABLE public.crisis_feedback_submissions,
  public.crisis_feedback_moderation_events
TO service_role;

CREATE OR REPLACE FUNCTION public.moderate_crisis_feedback_submission(
  p_submission_id UUID,
  p_action TEXT,
  p_admin_id UUID,
  p_note TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_submission public.crisis_feedback_submissions%ROWTYPE;
  v_actor_type TEXT;
BEGIN
  IF p_submission_id IS NULL OR p_admin_id IS NULL THEN
    RAISE EXCEPTION 'Submission and administrator are required' USING ERRCODE = '22023';
  END IF;
  IF p_action IS NULL OR p_action NOT IN ('approved', 'rejected', 'removed', 'hidden', 'unhidden') THEN
    RAISE EXCEPTION 'Invalid moderation action' USING ERRCODE = '22023';
  END IF;
  IF p_note IS NOT NULL AND char_length(p_note) > 1000 THEN
    RAISE EXCEPTION 'Moderation note must be 1000 characters or fewer' USING ERRCODE = '22023';
  END IF;
  IF auth.uid() IS NOT NULL AND auth.uid() IS DISTINCT FROM p_admin_id THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;

  SELECT profile.user_type
  INTO v_actor_type
  FROM public.profiles AS profile
  WHERE profile.id = p_admin_id;

  IF v_actor_type IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'Administrator access required' USING ERRCODE = '42501';
  END IF;

  SELECT submission.*
  INTO v_submission
  FROM public.crisis_feedback_submissions AS submission
  WHERE submission.id = p_submission_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Feedback submission not found' USING ERRCODE = 'P0002';
  END IF;

  IF p_action IN ('hidden', 'unhidden') THEN
    IF v_submission.status <> 'approved' THEN
      RAISE EXCEPTION 'Only approved submissions can be hidden or unhidden'
        USING ERRCODE = '22023';
    END IF;

    UPDATE public.crisis_feedback_submissions
    SET is_hidden = (p_action = 'hidden'),
        moderation_note = COALESCE(NULLIF(btrim(p_note), ''), moderation_note),
        moderated_at = NOW(),
        moderated_by = p_admin_id,
        updated_at = NOW()
    WHERE id = p_submission_id;

    INSERT INTO public.crisis_feedback_moderation_events (
      submission_id, actor_id, action, previous_status, new_status, note
    )
    VALUES (
      p_submission_id, p_admin_id, p_action,
      v_submission.status, v_submission.status,
      NULLIF(btrim(p_note), '')
    );

    RETURN jsonb_build_object(
      'submissionId', p_submission_id,
      'status', v_submission.status,
      'isHidden', p_action = 'hidden',
      'rewardStatus', v_submission.reward_status
    );
  END IF;

  IF p_action = 'removed' THEN
    IF v_submission.status NOT IN ('pending', 'approved', 'rejected') THEN
      RAISE EXCEPTION 'Only unawarded submissions can be removed' USING ERRCODE = '22023';
    END IF;
    IF v_submission.awarded_at IS NOT NULL THEN
      RAISE EXCEPTION 'Awarded submissions cannot be removed' USING ERRCODE = '22023';
    END IF;

    UPDATE public.crisis_feedback_submissions
    SET status = 'removed',
        is_hidden = TRUE,
        reward_status = 'not_eligible',
        moderation_note = NULLIF(btrim(p_note), ''),
        moderated_at = NOW(),
        moderated_by = p_admin_id,
        updated_at = NOW()
    WHERE id = p_submission_id;
  ELSIF p_action = 'rejected' THEN
    IF v_submission.status <> 'pending' THEN
      RAISE EXCEPTION 'Only pending submissions can be rejected' USING ERRCODE = '22023';
    END IF;

    UPDATE public.crisis_feedback_submissions
    SET status = 'rejected',
        reward_status = 'not_eligible',
        moderation_note = NULLIF(btrim(p_note), ''),
        moderated_at = NOW(),
        moderated_by = p_admin_id,
        updated_at = NOW()
    WHERE id = p_submission_id;
  ELSE
    IF v_submission.status <> 'pending' THEN
      RAISE EXCEPTION 'Only pending submissions can be approved' USING ERRCODE = '22023';
    END IF;

    UPDATE public.crisis_feedback_submissions
    SET status = 'approved',
        is_hidden = FALSE,
        approved_by = p_admin_id,
        approved_at = NOW(),
        reward_status = CASE
          WHEN submitter_category = 'registered_tourist' AND user_id IS NOT NULL
            THEN 'pending'
          ELSE 'not_eligible'
        END,
        moderated_at = NOW(),
        moderated_by = p_admin_id,
        moderation_note = NULLIF(btrim(p_note), ''),
        updated_at = NOW()
    WHERE id = p_submission_id;
  END IF;

  INSERT INTO public.crisis_feedback_moderation_events (
    submission_id, actor_id, action, previous_status, new_status, note
  )
  VALUES (
    p_submission_id, p_admin_id, p_action,
    v_submission.status, p_action,
    NULLIF(btrim(p_note), '')
  );

  RETURN jsonb_build_object(
    'submissionId', p_submission_id,
    'status', p_action,
    'isHidden', p_action IN ('removed', 'hidden'),
    'rewardStatus', (
      SELECT submission.reward_status
      FROM public.crisis_feedback_submissions AS submission
      WHERE submission.id = p_submission_id
    ),
    'awardedPoints', NULL
  );
END;
$$;

REVOKE ALL ON FUNCTION public.moderate_crisis_feedback_submission(UUID, TEXT, UUID, TEXT)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.moderate_crisis_feedback_submission(UUID, TEXT, UUID, TEXT)
  TO service_role;

CREATE OR REPLACE FUNCTION public.award_crisis_feedback_points(
  p_submission_id UUID,
  p_admin_id UUID,
  p_points BIGINT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_submission public.crisis_feedback_submissions%ROWTYPE;
  v_admin_type TEXT;
  v_tourist_type TEXT;
  v_settings public.system_settings%ROWTYPE;
  v_points_balance BIGINT;
  v_balance_after BIGINT;
  v_notification_audience JSONB;
  v_tourists_in_audience BOOLEAN;
  v_notification_channels JSONB;
  v_app_preference JSONB;
  v_app_notifications_enabled BOOLEAN;
  v_manila_day DATE;
  v_day_start TIMESTAMPTZ;
  v_day_end TIMESTAMPTZ;
  v_awarded_at TIMESTAMPTZ;
  v_awarded_today BIGINT;
BEGIN
  IF p_submission_id IS NULL OR p_admin_id IS NULL OR p_points IS NULL THEN
    RAISE EXCEPTION 'Submission, administrator, and point amount are required'
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

  SELECT submission.*
  INTO v_submission
  FROM public.crisis_feedback_submissions AS submission
  WHERE submission.id = p_submission_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Feedback submission not found' USING ERRCODE = 'P0002';
  END IF;
  IF v_submission.status <> 'approved'
     OR v_submission.submitter_category <> 'registered_tourist'
     OR v_submission.user_id IS NULL THEN
    RAISE EXCEPTION 'Only approved registered-tourist submissions are eligible'
      USING ERRCODE = '22023';
  END IF;
  IF v_submission.awarded_at IS NOT NULL
     OR v_submission.reward_status = 'awarded'
     OR EXISTS (
       SELECT 1
       FROM public.point_transactions AS transaction
       WHERE transaction.crisis_feedback_submission_id = p_submission_id
         AND transaction.transaction_type = 'earned'
         AND transaction.reason = 'crisis_feedback'
     ) THEN
    RAISE EXCEPTION 'This submission has already received points' USING ERRCODE = '23505';
  END IF;

  SELECT profile.user_type, profile.notification_channels
  INTO v_tourist_type, v_notification_channels
  FROM public.profiles AS profile
  WHERE profile.id = v_submission.user_id
  FOR SHARE;
  IF v_tourist_type IS DISTINCT FROM 'tourist' THEN
    RAISE EXCEPTION 'The submission owner is not an eligible tourist'
      USING ERRCODE = '22023';
  END IF;

  SELECT settings.*
  INTO v_settings
  FROM public.system_settings AS settings
  WHERE settings.id = 'default'
  FOR SHARE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Crisis feedback reward settings are unavailable'
      USING ERRCODE = '55000';
  END IF;
  IF v_settings.rewards_enabled IS DISTINCT FROM TRUE
     OR v_settings.crisis_feedback_points_enabled IS DISTINCT FROM TRUE THEN
    RAISE EXCEPTION 'Crisis feedback rewards are disabled' USING ERRCODE = '55000';
  END IF;
  IF v_settings.crisis_feedback_points_min_value IS NULL
     OR v_settings.crisis_feedback_points_value IS NULL
     OR v_settings.crisis_feedback_points_max_value IS NULL
     OR v_settings.crisis_feedback_daily_submission_cap IS NULL
     OR v_settings.crisis_feedback_points_min_value < 1
     OR v_settings.crisis_feedback_points_min_value > v_settings.crisis_feedback_points_value
     OR v_settings.crisis_feedback_points_value > v_settings.crisis_feedback_points_max_value
     OR v_settings.crisis_feedback_points_max_value > 1000000
     OR v_settings.crisis_feedback_daily_submission_cap < 1
     OR v_settings.crisis_feedback_daily_submission_cap > 1000000 THEN
    RAISE EXCEPTION 'Crisis feedback reward settings are invalid'
      USING ERRCODE = '55000';
  END IF;
  IF p_points < v_settings.crisis_feedback_points_min_value
     OR p_points > v_settings.crisis_feedback_points_max_value THEN
    RAISE EXCEPTION 'Point amount must be between % and %',
      v_settings.crisis_feedback_points_min_value,
      v_settings.crisis_feedback_points_max_value
      USING ERRCODE = '22023';
  END IF;

  v_awarded_at := transaction_timestamp();
  v_manila_day := (v_awarded_at AT TIME ZONE 'Asia/Manila')::DATE;
  v_day_start := v_manila_day::TIMESTAMP AT TIME ZONE 'Asia/Manila';
  v_day_end := (v_manila_day + 1)::TIMESTAMP AT TIME ZONE 'Asia/Manila';

  PERFORM pg_advisory_xact_lock(
    hashtextextended(
      v_submission.user_id::TEXT || ':crisis_feedback:' || v_manila_day::TEXT,
      0
    )
  );

  SELECT count(*)
  INTO v_awarded_today
  FROM public.crisis_feedback_submissions AS submission
  WHERE submission.user_id = v_submission.user_id
    AND submission.awarded_at >= v_day_start
    AND submission.awarded_at < v_day_end;
  IF v_awarded_today >= v_settings.crisis_feedback_daily_submission_cap THEN
    RAISE EXCEPTION 'Daily crisis feedback reward limit reached'
      USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO public.tourist_points (user_id, points_balance)
  VALUES (v_submission.user_id, 0)
  ON CONFLICT (user_id) DO NOTHING;

  SELECT points.points_balance
  INTO v_points_balance
  FROM public.tourist_points AS points
  WHERE points.user_id = v_submission.user_id
  FOR UPDATE;
  v_balance_after := v_points_balance + p_points;

  INSERT INTO public.point_transactions (
    user_id,
    transaction_type,
    points_delta,
    balance_after,
    crisis_feedback_submission_id,
    reason
  )
  VALUES (
    v_submission.user_id,
    'earned',
    p_points,
    v_balance_after,
    p_submission_id,
    'crisis_feedback'
  );

  UPDATE public.tourist_points
  SET points_balance = v_balance_after,
      updated_at = v_awarded_at
  WHERE user_id = v_submission.user_id;

  UPDATE public.crisis_feedback_submissions
  SET reward_status = 'awarded',
      awarded_by = p_admin_id,
      awarded_at = v_awarded_at,
      awarded_points = p_points,
      moderated_at = v_awarded_at,
      moderated_by = p_admin_id,
      updated_at = v_awarded_at
  WHERE id = p_submission_id;

  INSERT INTO public.crisis_feedback_moderation_events (
    submission_id,
    actor_id,
    action,
    previous_status,
    new_status,
    note,
    points_awarded,
    created_at
  )
  VALUES (
    p_submission_id,
    p_admin_id,
    'points_awarded',
    'approved',
    'approved',
    'Awarded ' || p_points::TEXT || ' points',
    p_points,
    v_awarded_at
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
      v_submission.user_id,
      'Crisis Feedback Reward',
      format('You earned %s points for your approved crisis feedback.', p_points),
      'crisis_feedback_reward',
      'NORMAL',
      'crisis_feedback',
      p_submission_id
    )
    ON CONFLICT (user_id, notification_type, related_type, related_id)
      WHERE notification_type = 'crisis_feedback_reward'
        AND related_type = 'crisis_feedback'
        AND related_id IS NOT NULL
    DO NOTHING;
  END IF;

  RETURN jsonb_build_object(
    'submissionId', p_submission_id,
    'rewardStatus', 'awarded',
    'awardedPoints', p_points,
    'awardedBy', p_admin_id,
    'awardedAt', v_awarded_at
  );
END;
$$;

REVOKE ALL ON FUNCTION public.award_crisis_feedback_points(UUID, UUID, BIGINT)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.award_crisis_feedback_points(UUID, UUID, BIGINT)
  TO service_role;

COMMIT;
