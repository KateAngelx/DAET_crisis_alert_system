-- Standalone safety education rewards foundation.
-- All user relationships use profiles.id; emergency activity is intentionally excluded.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.safety_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_type TEXT NOT NULL
    CHECK (activity_type IN (
      'safety_quiz',
      'preparedness_guide',
      'preparedness_checklist',
      'other_education'
    )),
  title TEXT NOT NULL CHECK (length(btrim(title)) > 0),
  description TEXT NOT NULL DEFAULT '',
  instructions TEXT,
  points_awarded BIGINT NOT NULL CHECK (points_awarded > 0),
  is_active BOOLEAN NOT NULL DEFAULT FALSE,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.activity_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL DEFAULT auth.uid()
    REFERENCES public.profiles(id) ON DELETE CASCADE,
  activity_id UUID NOT NULL
    REFERENCES public.safety_activities(id) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected')),
  submission_data JSONB NOT NULL DEFAULT '{}'::jsonb
    CHECK (jsonb_typeof(submission_data) = 'object'),
  points_awarded BIGINT,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  review_note TEXT,
  CONSTRAINT activity_completions_review_state_check CHECK (
    (status = 'pending' AND reviewed_at IS NULL AND points_awarded IS NULL)
    OR (
      status = 'approved'
      AND reviewed_at IS NOT NULL
      AND points_awarded IS NOT NULL
      AND points_awarded > 0
    )
    OR (status = 'rejected' AND reviewed_at IS NOT NULL AND points_awarded IS NULL)
  ),
  CONSTRAINT activity_completions_user_activity_key UNIQUE (user_id, activity_id)
);

CREATE TABLE IF NOT EXISTS public.tourist_points (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  points_balance BIGINT NOT NULL DEFAULT 0 CHECK (points_balance >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.rewards_catalog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL CHECK (length(btrim(name)) > 0),
  description TEXT NOT NULL DEFAULT '',
  points_cost BIGINT NOT NULL CHECK (points_cost > 0),
  inventory_limit INTEGER CHECK (inventory_limit IS NULL OR inventory_limit > 0),
  voucher_validity_days INTEGER
    CHECK (voucher_validity_days IS NULL OR voucher_validity_days > 0),
  is_active BOOLEAN NOT NULL DEFAULT FALSE,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.reward_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL DEFAULT auth.uid()
    REFERENCES public.profiles(id) ON DELETE CASCADE,
  reward_id UUID NOT NULL
    REFERENCES public.rewards_catalog(id) ON DELETE RESTRICT,
  reward_name_snapshot TEXT NOT NULL,
  points_cost_at_redemption BIGINT NOT NULL CHECK (points_cost_at_redemption > 0),
  status TEXT NOT NULL DEFAULT 'available'
    CHECK (status IN ('available', 'redeemed', 'expired', 'cancelled')),
  voucher_code TEXT NOT NULL UNIQUE
    DEFAULT encode(gen_random_bytes(32), 'hex'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  redeemed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  cancelled_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  cancellation_reason TEXT,
  CONSTRAINT reward_redemptions_status_state_check CHECK (
    (status = 'available' AND redeemed_at IS NULL AND cancelled_at IS NULL)
    OR (status = 'redeemed' AND redeemed_at IS NOT NULL AND cancelled_at IS NULL)
    OR (status = 'expired' AND redeemed_at IS NULL AND cancelled_at IS NULL)
    OR (
      status = 'cancelled'
      AND redeemed_at IS NULL
      AND cancelled_at IS NOT NULL
      AND cancelled_by IS NOT NULL
      AND cancellation_reason IS NOT NULL
      AND length(btrim(cancellation_reason)) > 0
    )
  )
);

CREATE TABLE IF NOT EXISTS public.point_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  transaction_type TEXT NOT NULL
    CHECK (transaction_type IN ('earned', 'spent', 'adjustment')),
  points_delta BIGINT NOT NULL CHECK (points_delta <> 0),
  balance_after BIGINT NOT NULL CHECK (balance_after >= 0),
  actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  activity_completion_id UUID
    REFERENCES public.activity_completions(id) ON DELETE SET NULL,
  reward_redemption_id UUID
    REFERENCES public.reward_redemptions(id) ON DELETE SET NULL,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT point_transactions_type_reference_check CHECK (
    (
      transaction_type = 'earned'
      AND points_delta > 0
      AND activity_completion_id IS NOT NULL
      AND reward_redemption_id IS NULL
      AND reason IS NULL
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
  )
);

CREATE INDEX IF NOT EXISTS idx_activity_completions_user_submitted
  ON public.activity_completions (user_id, submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_completions_status_submitted
  ON public.activity_completions (status, submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_point_transactions_user_created
  ON public.point_transactions (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rewards_catalog_active
  ON public.rewards_catalog (is_active, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reward_redemptions_user_created
  ON public.reward_redemptions (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reward_redemptions_reward_status
  ON public.reward_redemptions (reward_id, status);

CREATE UNIQUE INDEX IF NOT EXISTS idx_point_transactions_one_earn_per_completion
  ON public.point_transactions (activity_completion_id)
  WHERE transaction_type = 'earned' AND activity_completion_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_point_transactions_one_spend_per_redemption
  ON public.point_transactions (reward_redemption_id)
  WHERE transaction_type = 'spent' AND reward_redemption_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_point_transactions_one_refund_per_redemption
  ON public.point_transactions (reward_redemption_id)
  WHERE transaction_type = 'adjustment'
    AND points_delta > 0
    AND reward_redemption_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.set_rewards_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_safety_activities_updated_at
  BEFORE UPDATE ON public.safety_activities
  FOR EACH ROW EXECUTE FUNCTION public.set_rewards_updated_at();

CREATE TRIGGER trg_rewards_catalog_updated_at
  BEFORE UPDATE ON public.rewards_catalog
  FOR EACH ROW EXECUTE FUNCTION public.set_rewards_updated_at();

ALTER TABLE public.safety_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tourist_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.point_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rewards_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reward_redemptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users read active safety activities"
  ON public.safety_activities FOR SELECT TO authenticated
  USING (is_active OR public.get_user_role() = 'admin');

CREATE POLICY "Admins manage safety activities"
  ON public.safety_activities FOR ALL TO authenticated
  USING (public.get_user_role() = 'admin')
  WITH CHECK (public.get_user_role() = 'admin');

CREATE POLICY "Users read own activity completions"
  ON public.activity_completions FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins read activity completions"
  ON public.activity_completions FOR SELECT TO authenticated
  USING (public.get_user_role() = 'admin');

CREATE POLICY "Users submit own pending activity completions"
  ON public.activity_completions FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND status = 'pending'
    AND reviewed_at IS NULL
    AND reviewed_by IS NULL
    AND points_awarded IS NULL
    AND EXISTS (
      SELECT 1
      FROM public.safety_activities activity
      WHERE activity.id = activity_id
        AND activity.is_active
    )
  );

CREATE POLICY "Users read own points balance"
  ON public.tourist_points FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins read points balances"
  ON public.tourist_points FOR SELECT TO authenticated
  USING (public.get_user_role() = 'admin');

CREATE POLICY "Users read own point transactions"
  ON public.point_transactions FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins read point transactions"
  ON public.point_transactions FOR SELECT TO authenticated
  USING (public.get_user_role() = 'admin');

CREATE POLICY "Authenticated users read available rewards"
  ON public.rewards_catalog FOR SELECT TO authenticated
  USING (is_active OR public.get_user_role() = 'admin');

CREATE POLICY "Admins manage rewards catalog"
  ON public.rewards_catalog FOR ALL TO authenticated
  USING (public.get_user_role() = 'admin')
  WITH CHECK (public.get_user_role() = 'admin');

CREATE POLICY "Users read own reward redemptions"
  ON public.reward_redemptions FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins read reward redemptions"
  ON public.reward_redemptions FOR SELECT TO authenticated
  USING (public.get_user_role() = 'admin');

REVOKE ALL ON TABLE
  public.safety_activities,
  public.activity_completions,
  public.tourist_points,
  public.point_transactions,
  public.rewards_catalog,
  public.reward_redemptions
FROM PUBLIC, anon, authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE
  ON public.safety_activities, public.rewards_catalog TO authenticated;
GRANT SELECT ON
  public.activity_completions,
  public.tourist_points,
  public.point_transactions,
  public.reward_redemptions
TO authenticated;
GRANT INSERT (activity_id, submission_data)
  ON public.activity_completions TO authenticated;

CREATE OR REPLACE FUNCTION public.review_activity_completion(
  p_completion_id UUID,
  p_decision TEXT,
  p_review_note TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id UUID;
  v_activity_id UUID;
  v_status TEXT;
  v_points BIGINT;
  v_activity_active BOOLEAN;
  v_balance_after BIGINT;
BEGIN
  IF auth.uid() IS NULL OR public.get_user_role() IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'Administrator access required' USING ERRCODE = '42501';
  END IF;
  IF p_decision IS NULL OR p_decision NOT IN ('approved', 'rejected') THEN
    RAISE EXCEPTION 'Decision must be approved or rejected' USING ERRCODE = '22023';
  END IF;
  IF p_review_note IS NOT NULL AND length(p_review_note) > 1000 THEN
    RAISE EXCEPTION 'Review note must be 1000 characters or fewer' USING ERRCODE = '22023';
  END IF;

  SELECT completion.user_id, completion.activity_id, completion.status
  INTO v_user_id, v_activity_id, v_status
  FROM public.activity_completions AS completion
  WHERE completion.id = p_completion_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Activity completion not found' USING ERRCODE = 'P0002';
  END IF;
  IF v_status <> 'pending' THEN
    RAISE EXCEPTION 'Only pending completions can be reviewed' USING ERRCODE = '22023';
  END IF;

  SELECT activity.points_awarded, activity.is_active
  INTO v_points, v_activity_active
  FROM public.safety_activities AS activity
  WHERE activity.id = v_activity_id
  FOR SHARE;

  IF p_decision = 'approved' AND NOT COALESCE(v_activity_active, FALSE) THEN
    RAISE EXCEPTION 'Inactive activities cannot be approved for points' USING ERRCODE = '22023';
  END IF;

  UPDATE public.activity_completions
  SET status = p_decision,
      points_awarded = CASE WHEN p_decision = 'approved' THEN v_points ELSE NULL END,
      reviewed_at = NOW(),
      reviewed_by = auth.uid(),
      review_note = NULLIF(btrim(p_review_note), '')
  WHERE id = p_completion_id;

  IF p_decision = 'approved' THEN
    INSERT INTO public.tourist_points (user_id, points_balance)
    VALUES (v_user_id, 0)
    ON CONFLICT (user_id) DO NOTHING;

    UPDATE public.tourist_points
    SET points_balance = points_balance + v_points,
        updated_at = NOW()
    WHERE user_id = v_user_id
    RETURNING points_balance INTO v_balance_after;

    INSERT INTO public.point_transactions (
      user_id, transaction_type, points_delta, balance_after,
      activity_completion_id, actor_id
    )
    VALUES (
      v_user_id, 'earned', v_points, v_balance_after, p_completion_id, auth.uid()
    );
  END IF;

  RETURN p_completion_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_adjust_tourist_points(
  p_user_id UUID,
  p_points_delta BIGINT,
  p_reason TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_type TEXT;
  v_balance_after BIGINT;
  v_transaction_id UUID;
BEGIN
  IF auth.uid() IS NULL OR public.get_user_role() IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'Administrator access required' USING ERRCODE = '42501';
  END IF;
  IF p_points_delta IS NULL OR p_points_delta = 0 THEN
    RAISE EXCEPTION 'Adjustment must be nonzero' USING ERRCODE = '22023';
  END IF;
  IF p_reason IS NULL OR length(btrim(p_reason)) = 0 OR length(p_reason) > 1000 THEN
    RAISE EXCEPTION 'A reason of 1 to 1000 characters is required' USING ERRCODE = '22023';
  END IF;

  SELECT profile.user_type INTO v_user_type
  FROM public.profiles AS profile
  WHERE profile.id = p_user_id;

  IF NOT FOUND OR v_user_type <> 'tourist' THEN
    RAISE EXCEPTION 'Tourist profile not found' USING ERRCODE = 'P0002';
  END IF;

  INSERT INTO public.tourist_points (user_id, points_balance)
  VALUES (p_user_id, 0)
  ON CONFLICT (user_id) DO NOTHING;

  UPDATE public.tourist_points
  SET points_balance = points_balance + p_points_delta,
      updated_at = NOW()
  WHERE user_id = p_user_id
  RETURNING points_balance INTO v_balance_after;

  INSERT INTO public.point_transactions (
    user_id, transaction_type, points_delta, balance_after, actor_id, reason
  )
  VALUES (
    p_user_id, 'adjustment', p_points_delta, v_balance_after, auth.uid(), btrim(p_reason)
  )
  RETURNING id INTO v_transaction_id;

  RETURN v_transaction_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.redeem_reward(p_reward_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_user_type TEXT;
  v_reward public.rewards_catalog%ROWTYPE;
  v_issued BIGINT;
  v_balance BIGINT;
  v_balance_after BIGINT;
  v_redemption_id UUID;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  SELECT profile.user_type INTO v_user_type
  FROM public.profiles AS profile
  WHERE profile.id = v_user_id;
  IF v_user_type IS DISTINCT FROM 'tourist' THEN
    RAISE EXCEPTION 'Tourist access required' USING ERRCODE = '42501';
  END IF;

  SELECT reward.* INTO v_reward
  FROM public.rewards_catalog AS reward
  WHERE reward.id = p_reward_id
  FOR UPDATE;

  IF NOT FOUND OR NOT v_reward.is_active THEN
    RAISE EXCEPTION 'Reward is unavailable' USING ERRCODE = '22023';
  END IF;

  UPDATE public.reward_redemptions
  SET status = 'expired'
  WHERE reward_id = p_reward_id
    AND status = 'available'
    AND expires_at <= NOW();

  SELECT COUNT(*) INTO v_issued
  FROM public.reward_redemptions AS redemption
  WHERE redemption.reward_id = p_reward_id
    AND redemption.status IN ('available', 'redeemed');

  IF v_reward.inventory_limit IS NOT NULL
     AND v_issued >= v_reward.inventory_limit THEN
    RAISE EXCEPTION 'Reward is out of stock' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.tourist_points (user_id, points_balance)
  VALUES (v_user_id, 0)
  ON CONFLICT (user_id) DO NOTHING;

  SELECT points_balance INTO v_balance
  FROM public.tourist_points
  WHERE user_id = v_user_id
  FOR UPDATE;

  IF v_balance < v_reward.points_cost THEN
    RAISE EXCEPTION 'Insufficient points balance' USING ERRCODE = '22023';
  END IF;

  UPDATE public.tourist_points
  SET points_balance = points_balance - v_reward.points_cost,
      updated_at = NOW()
  WHERE user_id = v_user_id
  RETURNING points_balance INTO v_balance_after;

  INSERT INTO public.reward_redemptions (
    user_id, reward_id, reward_name_snapshot, points_cost_at_redemption, expires_at
  )
  VALUES (
    v_user_id,
    v_reward.id,
    v_reward.name,
    v_reward.points_cost,
    CASE
      WHEN v_reward.voucher_validity_days IS NULL THEN NULL
      ELSE NOW() + make_interval(days => v_reward.voucher_validity_days)
    END
  )
  RETURNING id INTO v_redemption_id;

  INSERT INTO public.point_transactions (
    user_id, transaction_type, points_delta, balance_after, reward_redemption_id, actor_id
  )
  VALUES (
    v_user_id, 'spent', -v_reward.points_cost, v_balance_after, v_redemption_id, v_user_id
  );

  RETURN v_redemption_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.cancel_reward_redemption(
  p_redemption_id UUID,
  p_reason TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_redemption public.reward_redemptions%ROWTYPE;
  v_balance_after BIGINT;
BEGIN
  IF auth.uid() IS NULL OR public.get_user_role() IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'Administrator access required' USING ERRCODE = '42501';
  END IF;
  IF p_reason IS NULL OR length(btrim(p_reason)) = 0 OR length(p_reason) > 1000 THEN
    RAISE EXCEPTION 'A cancellation reason of 1 to 1000 characters is required'
      USING ERRCODE = '22023';
  END IF;

  SELECT redemption.* INTO v_redemption
  FROM public.reward_redemptions AS redemption
  WHERE redemption.id = p_redemption_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Reward redemption not found' USING ERRCODE = 'P0002';
  END IF;
  IF v_redemption.status <> 'available' THEN
    RAISE EXCEPTION 'Only available redemptions can be cancelled' USING ERRCODE = '22023';
  END IF;
  IF v_redemption.expires_at IS NOT NULL AND v_redemption.expires_at <= NOW() THEN
    UPDATE public.reward_redemptions
    SET status = 'expired'
    WHERE id = p_redemption_id;
    RETURN FALSE;
  END IF;

  INSERT INTO public.tourist_points (user_id, points_balance)
  VALUES (v_redemption.user_id, 0)
  ON CONFLICT (user_id) DO NOTHING;

  UPDATE public.tourist_points
  SET points_balance = points_balance + v_redemption.points_cost_at_redemption,
      updated_at = NOW()
  WHERE user_id = v_redemption.user_id
  RETURNING points_balance INTO v_balance_after;

  UPDATE public.reward_redemptions
  SET status = 'cancelled',
      cancelled_at = NOW(),
      cancelled_by = auth.uid(),
      cancellation_reason = btrim(p_reason)
  WHERE id = p_redemption_id;

  INSERT INTO public.point_transactions (
    user_id, transaction_type, points_delta, balance_after,
    reward_redemption_id, actor_id, reason
  )
  VALUES (
    v_redemption.user_id,
    'adjustment',
    v_redemption.points_cost_at_redemption,
    v_balance_after,
    p_redemption_id,
    auth.uid(),
    'Reward redemption cancelled: ' || btrim(p_reason)
  );

  RETURN TRUE;
END;
$$;

CREATE OR REPLACE FUNCTION public.redeem_reward_voucher(p_voucher_code TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_redemption public.reward_redemptions%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL OR public.get_user_role() IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'Administrator access required' USING ERRCODE = '42501';
  END IF;
  IF p_voucher_code IS NULL OR length(p_voucher_code) <> 64 THEN
    RAISE EXCEPTION 'Invalid voucher code' USING ERRCODE = '22023';
  END IF;

  SELECT redemption.* INTO v_redemption
  FROM public.reward_redemptions AS redemption
  WHERE redemption.voucher_code = p_voucher_code
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Voucher not found' USING ERRCODE = 'P0002';
  END IF;
  IF v_redemption.status <> 'available' THEN
    RAISE EXCEPTION 'Voucher is not available for redemption' USING ERRCODE = '22023';
  END IF;
  IF v_redemption.expires_at IS NOT NULL AND v_redemption.expires_at <= NOW() THEN
    UPDATE public.reward_redemptions
    SET status = 'expired'
    WHERE id = v_redemption.id;
    RETURN FALSE;
  END IF;

  UPDATE public.reward_redemptions
  SET status = 'redeemed',
      redeemed_at = NOW()
  WHERE id = v_redemption.id;

  RETURN TRUE;
END;
$$;

CREATE OR REPLACE FUNCTION public.expire_reward_redemptions(p_reward_id UUID DEFAULT NULL)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_expired BIGINT;
BEGIN
  IF auth.uid() IS NULL OR public.get_user_role() IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'Administrator access required' USING ERRCODE = '42501';
  END IF;

  UPDATE public.reward_redemptions
  SET status = 'expired'
  WHERE status = 'available'
    AND expires_at <= NOW()
    AND (p_reward_id IS NULL OR reward_id = p_reward_id);

  GET DIAGNOSTICS v_expired = ROW_COUNT;
  RETURN v_expired;
END;
$$;

REVOKE ALL ON FUNCTION public.review_activity_completion(UUID, TEXT, TEXT)
  FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.set_rewards_updated_at()
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_adjust_tourist_points(UUID, BIGINT, TEXT)
  FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.redeem_reward(UUID)
  FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.cancel_reward_redemption(UUID, TEXT)
  FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.redeem_reward_voucher(TEXT)
  FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.expire_reward_redemptions(UUID)
  FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.review_activity_completion(UUID, TEXT, TEXT)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_adjust_tourist_points(UUID, BIGINT, TEXT)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.redeem_reward(UUID)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_reward_redemption(UUID, TEXT)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.redeem_reward_voucher(TEXT)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.expire_reward_redemptions(UUID)
  TO authenticated;

COMMIT;
