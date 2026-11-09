BEGIN;

CREATE TABLE IF NOT EXISTS public.tourist_guide_assistance_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tourist_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  idempotency_key UUID NOT NULL,
  assistance_type TEXT NOT NULL CHECK (
    assistance_type IN (
      'Help finding a tourist guide',
      'Tourism information or directions',
      'Assistance at a tourist destination',
      'Other tourism-related assistance'
    )
  ),
  location TEXT NOT NULL CHECK (char_length(btrim(location)) BETWEEN 1 AND 500),
  preferred_at TIMESTAMPTZ,
  tourist_count INTEGER NOT NULL CHECK (tourist_count BETWEEN 1 AND 100),
  details TEXT CHECK (details IS NULL OR char_length(details) <= 5000),
  status TEXT NOT NULL DEFAULT 'Pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT tourist_guide_assistance_requests_idempotency_unique
    UNIQUE (tourist_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS tourist_guide_assistance_requests_created_at_idx
  ON public.tourist_guide_assistance_requests (created_at DESC);

ALTER TABLE public.tourist_guide_assistance_requests ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.tourist_guide_assistance_requests FROM anon, authenticated;
GRANT ALL ON public.tourist_guide_assistance_requests TO service_role;

COMMIT;
