-- Disable direct reward redemption until redemption is part of the application scope.

BEGIN;

REVOKE EXECUTE ON FUNCTION public.redeem_reward(UUID)
  FROM PUBLIC, anon, authenticated;

COMMIT;
