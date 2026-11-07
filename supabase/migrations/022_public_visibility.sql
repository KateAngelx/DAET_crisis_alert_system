-- Visitor-facing switches for the Crisis Hub map and Roads & Travel.

ALTER TABLE system_settings
  ADD COLUMN IF NOT EXISTS public_visibility JSONB NOT NULL
  DEFAULT '{"map": true, "roadsAndHazards": true}'::jsonb;
