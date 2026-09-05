-- Tour group route fields: Starting Location → Destination
-- Run in Supabase SQL Editor after 004_tour_groups.sql

ALTER TABLE tour_groups
  ADD COLUMN IF NOT EXISTS starting_location TEXT,
  ADD COLUMN IF NOT EXISTS meeting_location TEXT,
  ADD COLUMN IF NOT EXISTS estimated_travel_time TEXT,
  ADD COLUMN IF NOT EXISTS destination_notes TEXT;

-- Backfill starting_location from legacy rows where only destination existed
UPDATE tour_groups
SET starting_location = COALESCE(starting_location, 'Daet, Camarines Norte')
WHERE starting_location IS NULL;

COMMENT ON COLUMN tour_groups.starting_location IS 'Route origin (From)';
COMMENT ON COLUMN tour_groups.destination IS 'Route destination (To)';
COMMENT ON COLUMN tour_groups.trip_info IS 'Route / travel information';
COMMENT ON COLUMN tour_groups.meeting_location IS 'Meeting or pickup point';
COMMENT ON COLUMN tour_groups.estimated_travel_time IS 'Estimated travel duration, e.g. 4 hours';
COMMENT ON COLUMN tour_groups.destination_notes IS 'Important destination information for tourists';
COMMENT ON COLUMN tour_groups.start_date IS 'Primary tour date';
