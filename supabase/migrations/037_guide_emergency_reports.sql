BEGIN;

CREATE OR REPLACE FUNCTION public.generate_guide_emergency_reference()
RETURNS TEXT
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  generated_reference TEXT;
BEGIN
  LOOP
    generated_reference := 'GER-' || TO_CHAR(now(), 'YYYYMMDD') || '-' ||
      UPPER(SUBSTRING(gen_random_uuid()::TEXT, 1, 6));
    EXIT WHEN NOT EXISTS (
      SELECT 1 FROM public.guide_emergency_reports
      WHERE reference_number = generated_reference
    );
  END LOOP;
  RETURN generated_reference;
END;
$$;

CREATE TABLE IF NOT EXISTS public.guide_emergency_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference_number TEXT NOT NULL UNIQUE DEFAULT public.generate_guide_emergency_reference(),
  reporter_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  idempotency_key UUID NOT NULL,
  emergency_type TEXT NOT NULL CHECK (
    emergency_type IN (
      'Medical emergency',
      'Accident or injury',
      'Lost tourist',
      'Safety or security concern',
      'Natural disaster or hazardous situation',
      'Other emergency'
    )
  ),
  location TEXT NOT NULL CHECK (char_length(btrim(location)) BETWEEN 1 AND 500),
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  description TEXT NOT NULL CHECK (char_length(btrim(description)) BETWEEN 1 AND 5000),
  affected_tourists INTEGER CHECK (affected_tourists IS NULL OR affected_tourists BETWEEN 1 AND 500),
  affected_info TEXT CHECK (affected_info IS NULL OR char_length(affected_info) <= 1000),
  status TEXT NOT NULL DEFAULT 'New' CHECK (
    status IN ('New', 'Acknowledged', 'Responding', 'Resolved', 'Closed')
  ),
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT guide_emergency_reports_idempotency_unique UNIQUE (reporter_id, idempotency_key),
  CONSTRAINT guide_emergency_reports_coordinates_check CHECK (
    (latitude IS NULL AND longitude IS NULL)
    OR (
      latitude BETWEEN -90 AND 90
      AND longitude BETWEEN -180 AND 180
    )
  )
);

CREATE INDEX IF NOT EXISTS guide_emergency_reports_status_submitted_idx
  ON public.guide_emergency_reports (status, submitted_at DESC);
CREATE INDEX IF NOT EXISTS guide_emergency_reports_reporter_submitted_idx
  ON public.guide_emergency_reports (reporter_id, submitted_at DESC);

CREATE TABLE IF NOT EXISTS public.guide_emergency_report_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES public.guide_emergency_reports(id) ON DELETE RESTRICT,
  changed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  old_status TEXT,
  new_status TEXT NOT NULL CHECK (
    new_status IN ('New', 'Acknowledged', 'Responding', 'Resolved', 'Closed')
  ),
  note TEXT,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS guide_emergency_report_history_report_idx
  ON public.guide_emergency_report_history (report_id, changed_at DESC);

ALTER TABLE public.guide_emergency_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guide_emergency_report_history ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.guide_emergency_reports, public.guide_emergency_report_history FROM anon, authenticated;
GRANT ALL ON public.guide_emergency_reports, public.guide_emergency_report_history TO service_role;

CREATE OR REPLACE FUNCTION public.submit_guide_emergency_report(
  p_guide_id UUID,
  p_idempotency_key UUID,
  p_emergency_type TEXT,
  p_location TEXT,
  p_latitude DOUBLE PRECISION,
  p_longitude DOUBLE PRECISION,
  p_description TEXT,
  p_affected_tourists INTEGER,
  p_affected_info TEXT
)
RETURNS public.guide_emergency_reports
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  report_row public.guide_emergency_reports;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = p_guide_id AND user_type = 'guide' AND is_active IS TRUE
  ) THEN
    RAISE EXCEPTION 'Active guide access required';
  END IF;

  INSERT INTO public.guide_emergency_reports (
    reporter_id, idempotency_key, emergency_type, location, latitude, longitude,
    description, affected_tourists, affected_info
  )
  VALUES (
    p_guide_id, p_idempotency_key, p_emergency_type, p_location, p_latitude, p_longitude,
    p_description, p_affected_tourists, p_affected_info
  )
  ON CONFLICT (reporter_id, idempotency_key) DO NOTHING
  RETURNING * INTO report_row;

  IF report_row.id IS NULL THEN
    SELECT * INTO report_row
    FROM public.guide_emergency_reports
    WHERE reporter_id = p_guide_id AND idempotency_key = p_idempotency_key;
  ELSE
    INSERT INTO public.guide_emergency_report_history
      (report_id, changed_by, old_status, new_status, note)
    VALUES (report_row.id, p_guide_id, NULL, 'New', 'Emergency report submitted');
  END IF;

  RETURN report_row;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_guide_emergency_report_status(
  p_report_id UUID,
  p_admin_id UUID,
  p_status TEXT,
  p_note TEXT DEFAULT NULL
)
RETURNS public.guide_emergency_reports
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  report_row public.guide_emergency_reports;
  transition_allowed BOOLEAN := FALSE;
  previous_status TEXT;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = p_admin_id AND user_type = 'admin' AND is_active IS TRUE
  ) THEN
    RAISE EXCEPTION 'Active administrator access required';
  END IF;

  SELECT * INTO report_row
  FROM public.guide_emergency_reports
  WHERE id = p_report_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Emergency report not found';
  END IF;
  previous_status := report_row.status;

  transition_allowed :=
    (report_row.status = 'New' AND p_status IN ('Acknowledged', 'Responding', 'Resolved'))
    OR (report_row.status = 'Acknowledged' AND p_status IN ('Responding', 'Resolved'))
    OR (report_row.status = 'Responding' AND p_status = 'Resolved')
    OR (report_row.status = 'Resolved' AND p_status = 'Closed');
  IF NOT transition_allowed THEN
    RAISE EXCEPTION 'Invalid emergency status transition from % to %', report_row.status, p_status;
  END IF;
  IF p_note IS NOT NULL AND char_length(p_note) > 1000 THEN
    RAISE EXCEPTION 'Status note must be 1000 characters or fewer';
  END IF;

  UPDATE public.guide_emergency_reports
  SET status = p_status, updated_at = now()
  WHERE id = p_report_id
  RETURNING * INTO report_row;

  INSERT INTO public.guide_emergency_report_history
    (report_id, changed_by, old_status, new_status, note)
  VALUES (p_report_id, p_admin_id, previous_status, p_status, NULLIF(btrim(p_note), ''));

  RETURN report_row;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_guide_emergency_report(
  UUID, UUID, TEXT, TEXT, DOUBLE PRECISION, DOUBLE PRECISION, TEXT, INTEGER, TEXT
) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.generate_guide_emergency_reference()
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_guide_emergency_report_status(UUID, UUID, TEXT, TEXT)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.generate_guide_emergency_reference() TO service_role;
GRANT EXECUTE ON FUNCTION public.submit_guide_emergency_report(
  UUID, UUID, TEXT, TEXT, DOUBLE PRECISION, DOUBLE PRECISION, TEXT, INTEGER, TEXT
) TO service_role;
GRANT EXECUTE ON FUNCTION public.update_guide_emergency_report_status(UUID, UUID, TEXT, TEXT)
  TO service_role;

COMMIT;
