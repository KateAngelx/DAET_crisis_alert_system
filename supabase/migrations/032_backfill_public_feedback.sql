BEGIN;

ALTER TABLE public.crisis_feedback_submissions
  ADD COLUMN IF NOT EXISTS legacy_public_feedback_id UUID
    REFERENCES public.public_feedback(id) ON DELETE RESTRICT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_crisis_feedback_legacy_public_feedback_once
  ON public.crisis_feedback_submissions (legacy_public_feedback_id)
  WHERE legacy_public_feedback_id IS NOT NULL;

WITH imported AS (
  INSERT INTO public.crisis_feedback_submissions (
    legacy_public_feedback_id,
    submitter_category,
    user_id,
    display_name,
    submission_type,
    message,
    status,
    is_hidden,
    reward_status,
    created_at,
    updated_at
  )
  SELECT
    legacy.id,
    'anonymous',
    NULL,
    NULLIF(LEFT(BTRIM(legacy.name), 80), ''),
    legacy.feedback_type,
    CASE
      WHEN BTRIM(legacy.message) = '' THEN '[Legacy submission had no message]'
      ELSE legacy.message
    END,
    'approved',
    FALSE,
    'not_eligible',
    legacy.created_at,
    legacy.created_at
  FROM public.public_feedback AS legacy
  WHERE legacy.is_public IS TRUE
  ON CONFLICT (legacy_public_feedback_id)
    WHERE legacy_public_feedback_id IS NOT NULL
  DO NOTHING
  RETURNING id, created_at
)
INSERT INTO public.crisis_feedback_moderation_events (
  submission_id,
  actor_id,
  action,
  previous_status,
  new_status,
  note,
  created_at
)
SELECT
  imported.id,
  NULL,
  'approved',
  'pending',
  'approved',
  'Imported historical public feedback as anonymous and reward-ineligible.',
  imported.created_at
FROM imported;

COMMIT;
