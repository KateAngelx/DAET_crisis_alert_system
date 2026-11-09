-- Backfill the one-time profile-completion reward for eligible existing tourists.

BEGIN;

DO $$
DECLARE
  v_rewards_enabled BOOLEAN;
  v_profile_completion_enabled BOOLEAN;
  v_points BIGINT;
  v_notification_audience JSONB;
  v_tourists_in_audience BOOLEAN;
  v_profile RECORD;
  v_channel_preference JSONB;
  v_app_notifications_enabled BOOLEAN;
  v_balance_before BIGINT;
  v_balance_after BIGINT;
  v_transaction_id UUID;
BEGIN
  SELECT settings.rewards_enabled,
         settings.profile_completion_points_enabled,
         settings.profile_completion_points_value,
         settings.notification_audience
  INTO v_rewards_enabled,
       v_profile_completion_enabled,
       v_points,
       v_notification_audience
  FROM public.system_settings AS settings
  WHERE settings.id = 'default';

  IF NOT FOUND
     OR v_rewards_enabled IS DISTINCT FROM TRUE
     OR v_profile_completion_enabled IS DISTINCT FROM TRUE
     OR v_points IS NULL
     OR v_points <= 0 THEN
    RETURN;
  END IF;

  IF v_notification_audience IS NULL
     OR (
       jsonb_typeof(v_notification_audience) <> 'object'
       AND jsonb_typeof(v_notification_audience) <> 'array'
     ) THEN
    v_tourists_in_audience := TRUE;
  ELSIF jsonb_typeof(v_notification_audience) = 'array' THEN
    v_tourists_in_audience := FALSE;
  ELSIF NOT (v_notification_audience ? 'tourists') THEN
    v_tourists_in_audience := FALSE;
  ELSE
    CASE jsonb_typeof(v_notification_audience->'tourists')
      WHEN 'boolean' THEN
        v_tourists_in_audience :=
          COALESCE((v_notification_audience->>'tourists')::BOOLEAN, FALSE);
      WHEN 'number' THEN
        v_tourists_in_audience :=
          (v_notification_audience->>'tourists')::NUMERIC <> 0;
      WHEN 'string' THEN
        v_tourists_in_audience :=
          length(v_notification_audience->>'tourists') > 0;
      WHEN 'null' THEN
        v_tourists_in_audience := FALSE;
      ELSE
        v_tourists_in_audience := TRUE;
    END CASE;
  END IF;

  FOR v_profile IN
    SELECT profile.id, profile.notification_channels
    FROM public.profiles AS profile
    WHERE profile.user_type = 'tourist'
      AND length(btrim(COALESCE(profile.full_name, ''))) BETWEEN 1 AND 100
      AND COALESCE(profile.phone, '') ~ '^09[0-9]{9}$'
      AND COALESCE(profile.nationality, '') IN ('Filipino', 'Foreigner')
      AND NOT EXISTS (
        SELECT 1
        FROM public.point_transactions AS transaction
        WHERE transaction.user_id = profile.id
          AND transaction.reason = 'profile_completion'
      )
    ORDER BY profile.id
    FOR UPDATE OF profile
  LOOP
    PERFORM pg_advisory_xact_lock(
      hashtextextended(v_profile.id::TEXT || ':profile_completion', 0)
    );

    IF EXISTS (
      SELECT 1
      FROM public.point_transactions AS transaction
      WHERE transaction.user_id = v_profile.id
        AND transaction.reason = 'profile_completion'
    ) THEN
      CONTINUE;
    END IF;

    INSERT INTO public.tourist_points (user_id, points_balance)
    VALUES (v_profile.id, 0)
    ON CONFLICT (user_id) DO NOTHING;

    SELECT points.points_balance
    INTO v_balance_before
    FROM public.tourist_points AS points
    WHERE points.user_id = v_profile.id
    FOR UPDATE;

    v_balance_after := v_balance_before + v_points;
    v_transaction_id := NULL;

    INSERT INTO public.point_transactions (
      user_id,
      transaction_type,
      points_delta,
      balance_after,
      reason
    )
    VALUES (
      v_profile.id,
      'earned',
      v_points,
      v_balance_after,
      'profile_completion'
    )
    ON CONFLICT (user_id)
      WHERE transaction_type = 'earned'
        AND reason = 'profile_completion'
    DO NOTHING
    RETURNING id INTO v_transaction_id;

    IF v_transaction_id IS NULL THEN
      CONTINUE;
    END IF;

    UPDATE public.tourist_points
    SET points_balance = v_balance_after,
        updated_at = NOW()
    WHERE user_id = v_profile.id;

    IF NOT v_tourists_in_audience THEN
      CONTINUE;
    END IF;

    IF v_profile.notification_channels IS NULL
       OR jsonb_typeof(v_profile.notification_channels) <> 'object' THEN
      v_app_notifications_enabled := TRUE;
    ELSE
      v_channel_preference :=
        NULLIF(v_profile.notification_channels->'app', 'null'::JSONB);
      IF v_channel_preference IS NULL THEN
        v_channel_preference :=
          NULLIF(v_profile.notification_channels->'web', 'null'::JSONB);
      END IF;

      IF v_channel_preference IS NULL THEN
        v_app_notifications_enabled := TRUE;
      ELSE
        CASE jsonb_typeof(v_channel_preference)
          WHEN 'boolean' THEN
            v_app_notifications_enabled :=
              COALESCE(v_channel_preference::TEXT::BOOLEAN, FALSE);
          WHEN 'number' THEN
            v_app_notifications_enabled :=
              v_channel_preference::TEXT::NUMERIC <> 0;
          WHEN 'string' THEN
            v_app_notifications_enabled :=
              length(v_channel_preference #>> '{}') > 0;
          WHEN 'null' THEN
            v_app_notifications_enabled := TRUE;
          ELSE
            v_app_notifications_enabled := TRUE;
        END CASE;
      END IF;
    END IF;

    IF v_app_notifications_enabled
       AND NOT EXISTS (
         SELECT 1
         FROM public.notifications AS notification
         WHERE notification.user_id = v_profile.id
           AND notification.notification_type = 'profile_completion_reward'
           AND notification.related_type = 'point_transaction'
           AND notification.related_id = v_transaction_id
       ) THEN
      INSERT INTO public.notifications (
        user_id,
        title,
        message,
        notification_type,
        related_type,
        related_id
      )
      VALUES (
        v_profile.id,
        'Profile Completion Reward',
        format(
          'You earned %s points for completing your tourist profile.',
          v_points
        ),
        'profile_completion_reward',
        'point_transaction',
        v_transaction_id
      );
    END IF;
  END LOOP;
END;
$$;

COMMIT;
