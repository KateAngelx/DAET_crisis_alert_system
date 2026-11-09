BEGIN;

ALTER TABLE public.tourist_guide_assistance_requests
  ADD COLUMN IF NOT EXISTS assigned_guide_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS responded_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

ALTER TABLE public.tourist_guide_assistance_requests
  DROP CONSTRAINT IF EXISTS tourist_guide_assistance_requests_status_check;
ALTER TABLE public.tourist_guide_assistance_requests
  ADD CONSTRAINT tourist_guide_assistance_requests_status_check
  CHECK (status IN ('Pending', 'Assigned', 'Accepted', 'Declined', 'Completed', 'Cancelled'));

CREATE INDEX IF NOT EXISTS tourist_guide_assistance_requests_status_created_idx
  ON public.tourist_guide_assistance_requests (status, created_at DESC);

CREATE TABLE IF NOT EXISTS public.tourist_guide_assistance_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES public.tourist_guide_assistance_requests(id) ON DELETE CASCADE,
  guide_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  assigned_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  status TEXT NOT NULL CHECK (status IN ('Assigned', 'Accepted', 'Declined', 'Completed', 'Cancelled')),
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  responded_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS tourist_guide_assistance_assignments_guide_idx
  ON public.tourist_guide_assistance_assignments (guide_id, assigned_at DESC);
CREATE INDEX IF NOT EXISTS tourist_guide_assistance_requests_guide_status_idx
  ON public.tourist_guide_assistance_requests (assigned_guide_id, status, assigned_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS tourist_guide_assistance_assignments_one_active_idx
  ON public.tourist_guide_assistance_assignments (request_id)
  WHERE status IN ('Assigned', 'Accepted');

ALTER TABLE public.tourist_guide_assistance_assignments ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.tourist_guide_assistance_assignments FROM anon, authenticated;
GRANT ALL ON public.tourist_guide_assistance_assignments TO service_role;

CREATE OR REPLACE FUNCTION public.assign_tourist_guide_assistance(
  p_request_id UUID,
  p_guide_id UUID,
  p_admin_id UUID
)
RETURNS public.tourist_guide_assistance_requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  request_row public.tourist_guide_assistance_requests;
BEGIN
  SELECT * INTO request_row
  FROM public.tourist_guide_assistance_requests
  WHERE id = p_request_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Assistance request not found';
  END IF;
  IF request_row.status NOT IN ('Pending', 'Declined') THEN
    RAISE EXCEPTION 'Only pending or declined requests can be assigned';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = p_guide_id AND user_type = 'guide' AND is_active IS TRUE
  ) THEN
    RAISE EXCEPTION 'Select an active administrator-approved guide account';
  END IF;

  UPDATE public.tourist_guide_assistance_requests
  SET assigned_guide_id = p_guide_id,
      assigned_at = now(),
      responded_at = NULL,
      status = 'Assigned',
      updated_at = now()
  WHERE id = p_request_id
  RETURNING * INTO request_row;

  INSERT INTO public.tourist_guide_assistance_assignments
    (request_id, guide_id, assigned_by, status)
  VALUES (p_request_id, p_guide_id, p_admin_id, 'Assigned');

  RETURN request_row;
END;
$$;

CREATE OR REPLACE FUNCTION public.respond_tourist_guide_assistance(
  p_request_id UUID,
  p_guide_id UUID,
  p_action TEXT
)
RETURNS public.tourist_guide_assistance_requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  request_row public.tourist_guide_assistance_requests;
  next_status TEXT;
BEGIN
  IF p_action NOT IN ('accept', 'decline') THEN
    RAISE EXCEPTION 'Action must be accept or decline';
  END IF;

  SELECT * INTO request_row
  FROM public.tourist_guide_assistance_requests
  WHERE id = p_request_id
  FOR UPDATE;

  IF NOT FOUND OR request_row.assigned_guide_id IS DISTINCT FROM p_guide_id
     OR request_row.status <> 'Assigned' THEN
    RAISE EXCEPTION 'This assistance assignment is no longer available';
  END IF;

  next_status := CASE WHEN p_action = 'accept' THEN 'Accepted' ELSE 'Declined' END;

  UPDATE public.tourist_guide_assistance_requests
  SET status = next_status, responded_at = now(), updated_at = now()
  WHERE id = p_request_id
  RETURNING * INTO request_row;

  UPDATE public.tourist_guide_assistance_assignments
  SET status = next_status, responded_at = now()
  WHERE request_id = p_request_id
    AND guide_id = p_guide_id
    AND status = 'Assigned';

  RETURN request_row;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_tourist_guide_assistance_status(
  p_request_id UUID,
  p_status TEXT
)
RETURNS public.tourist_guide_assistance_requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  request_row public.tourist_guide_assistance_requests;
  assignment_status TEXT;
BEGIN
  IF p_status NOT IN ('Completed', 'Cancelled') THEN
    RAISE EXCEPTION 'Status must be Completed or Cancelled';
  END IF;

  SELECT * INTO request_row
  FROM public.tourist_guide_assistance_requests
  WHERE id = p_request_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Assistance request not found';
  END IF;

  IF p_status = 'Completed' AND request_row.status <> 'Accepted' THEN
    RAISE EXCEPTION 'Only accepted requests can be completed';
  END IF;
  IF p_status = 'Cancelled' AND request_row.status NOT IN ('Pending', 'Assigned', 'Accepted', 'Declined') THEN
    RAISE EXCEPTION 'This request can no longer be cancelled';
  END IF;

  assignment_status := CASE WHEN p_status = 'Completed' THEN 'Completed' ELSE 'Cancelled' END;
  UPDATE public.tourist_guide_assistance_assignments
  SET status = assignment_status
  WHERE request_id = p_request_id AND status IN ('Assigned', 'Accepted');

  UPDATE public.tourist_guide_assistance_requests
  SET status = p_status,
      completed_at = CASE WHEN p_status = 'Completed' THEN now() ELSE completed_at END,
      updated_at = now()
  WHERE id = p_request_id
  RETURNING * INTO request_row;

  RETURN request_row;
END;
$$;

REVOKE ALL ON FUNCTION public.assign_tourist_guide_assistance(UUID, UUID, UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.respond_tourist_guide_assistance(UUID, UUID, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_tourist_guide_assistance_status(UUID, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.assign_tourist_guide_assistance(UUID, UUID, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.respond_tourist_guide_assistance(UUID, UUID, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.update_tourist_guide_assistance_status(UUID, TEXT) TO service_role;

COMMIT;
