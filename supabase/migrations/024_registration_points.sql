-- Configure and award the one-time registration points activity.
-- The profile INSERT trigger keeps the award in the same transaction as profile creation.

BEGIN;

ALTER TABLE public.system_settings
  ADD COLUMN IF NOT EXISTS rewards_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS registration_points_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS registration_points_value BIGINT NOT NULL DEFAULT 10;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.system_settings'::regclass
      AND conname = 'system_settings_registration_points_value_check'
  ) THEN
    ALTER TABLE public.system_settings
      ADD CONSTRAINT system_settings_registration_points_value_check
      CHECK (registration_points_value BETWEEN 0 AND 1000000);
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
          AND reason IS NULL
        )
        OR (
          activity_completion_id IS NULL
          AND reward_redemption_id IS NULL
          AND reason = 'registration'
        )
      )
    )
    OR (
      transaction_type = 'spent'
      AND points_delta < 0
      AND activity_completion_id IS NULL
      AND reward_redemption_id IS NOT NULL
    )
    OR (
      transaction_type = 'adjustment'
      AND activity_completion_id IS NULL
      AND reason IS NOT NULL
      AND length(btrim(reason)) > 0
    )
  );

CREATE UNIQUE INDEX IF NOT EXISTS idx_point_transactions_registration_once
  ON public.point_transactions (user_id)
  WHERE transaction_type = 'earned' AND reason = 'registration';

CREATE OR REPLACE FUNCTION public.award_registration_points_on_profile_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_rewards_enabled BOOLEAN;
  v_activity_enabled BOOLEAN;
  v_points BIGINT;
  v_balance_after BIGINT;
BEGIN
  IF NEW.user_type IS DISTINCT FROM 'tourist' THEN
    RETURN NEW;
  END IF;

  SELECT settings.rewards_enabled,
         settings.registration_points_enabled,
         settings.registration_points_value
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

  IF EXISTS (
    SELECT 1
    FROM public.point_transactions AS transaction
    WHERE transaction.user_id = NEW.id
      AND transaction.transaction_type = 'earned'
      AND transaction.reason = 'registration'
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
    'registration'
  );

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.award_registration_points_on_profile_insert()
  FROM PUBLIC, anon, authenticated;

CREATE TRIGGER trg_award_registration_points_on_profile_insert
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.award_registration_points_on_profile_insert();

COMMIT;
