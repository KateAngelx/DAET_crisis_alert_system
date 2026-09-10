-- Public visitor feedback, comments, and suggestions for CONNECT-DAET

CREATE TABLE IF NOT EXISTS public_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT,
  message TEXT NOT NULL CHECK (char_length(message) <= 500),
  feedback_type TEXT NOT NULL DEFAULT 'suggestion'
    CHECK (feedback_type IN ('feedback', 'comment', 'suggestion')),
  is_public BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_public_feedback_public_created
  ON public_feedback (is_public, created_at DESC)
  WHERE is_public = TRUE;

ALTER TABLE public_feedback ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public_feedback IS 'Visitor feedback displayed on the homepage — written via service role API';
