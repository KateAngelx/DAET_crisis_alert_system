ALTER TABLE public.crisis_alerts
  ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ;

UPDATE public.crisis_alerts
SET published_at = created_at
WHERE published_at IS NULL
  AND is_public IS TRUE;

CREATE INDEX IF NOT EXISTS idx_crisis_alerts_published_at
  ON public.crisis_alerts (published_at DESC NULLS LAST, created_at DESC NULLS LAST, id DESC);

CREATE OR REPLACE FUNCTION public.set_crisis_alert_published_at()
RETURNS TRIGGER AS $$
BEGIN
  IF COALESCE(NEW.is_public, FALSE) THEN
    IF TG_OP = 'INSERT' THEN
      NEW.published_at := COALESCE(NEW.published_at, NOW());
    ELSIF NOT COALESCE(OLD.is_public, FALSE) THEN
      NEW.published_at := NOW();
    ELSIF NEW.published_at IS NULL THEN
      NEW.published_at := COALESCE(NEW.published_at, NOW());
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS crisis_alert_published_at ON public.crisis_alerts;
CREATE TRIGGER crisis_alert_published_at
  BEFORE INSERT OR UPDATE ON public.crisis_alerts
  FOR EACH ROW
  EXECUTE FUNCTION public.set_crisis_alert_published_at();