-- Broadcast channel selection for roads and area hazards (both live in route_advisories).
-- Stored like crisis alert channels: ["email","sms","web"]. Missing values mean all three.

ALTER TABLE public.route_advisories
  ADD COLUMN IF NOT EXISTS channels JSONB DEFAULT '["email","sms","web"]'::jsonb;

UPDATE public.route_advisories
SET channels = '["email","sms","web"]'::jsonb
WHERE channels IS NULL;

COMMENT ON COLUMN public.route_advisories.channels IS
  'Office broadcast channels for this road or area hazard. email, sms, and web (in-app/push).';
