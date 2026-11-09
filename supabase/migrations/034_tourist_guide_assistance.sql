BEGIN;

ALTER TABLE public.system_settings
  ADD COLUMN IF NOT EXISTS tourist_guide_assistance_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS tourist_guide_assistance_intro TEXT,
  ADD COLUMN IF NOT EXISTS tourist_guide_assistance_availability TEXT;

DROP POLICY IF EXISTS "Authenticated users create reports" ON public.incident_reports;
CREATE POLICY "Authenticated users create reports" ON public.incident_reports
  FOR INSERT WITH CHECK (
    reporter_id = auth.uid()
    AND get_user_role() IN ('tourist', 'guide', 'admin')
    AND NOT (
      category = 'Tourist Assistance'
      AND get_user_role() = 'tourist'
    )
  );

COMMIT;
