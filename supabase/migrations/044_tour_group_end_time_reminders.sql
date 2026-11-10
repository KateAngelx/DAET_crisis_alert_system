ALTER TABLE public.tour_groups
  ADD COLUMN IF NOT EXISTS end_time TIME,
  ADD COLUMN IF NOT EXISTS end_reminder_1h_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS end_reminder_due_sent_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_tour_groups_active_end_date
  ON public.tour_groups (end_date)
  WHERE status = 'active' AND end_date IS NOT NULL;

CREATE OR REPLACE FUNCTION public.reset_tour_group_end_reminders_on_schedule_change()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.end_date IS DISTINCT FROM NEW.end_date
     OR OLD.end_time IS DISTINCT FROM NEW.end_time THEN
    NEW.end_reminder_1h_sent_at := NULL;
    NEW.end_reminder_due_sent_at := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_reset_tour_group_end_reminders ON public.tour_groups;
CREATE TRIGGER trg_reset_tour_group_end_reminders
  BEFORE UPDATE ON public.tour_groups
  FOR EACH ROW
  EXECUTE FUNCTION public.reset_tour_group_end_reminders_on_schedule_change();

COMMENT ON COLUMN public.tour_groups.end_time IS
  'Planned end time in Asia/Manila; optional for legacy/date-only tours.';
