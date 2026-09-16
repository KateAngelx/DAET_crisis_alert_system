-- Add Approved incident status; migrate legacy Received → Approved

ALTER TABLE incident_reports DROP CONSTRAINT IF EXISTS incident_reports_status_check;

ALTER TABLE incident_reports
  ADD CONSTRAINT incident_reports_status_check
  CHECK (status IN (
    'Submitted', 'Approved', 'Received', 'Under Review', 'Assigned', 'Responding',
    'Resolved', 'Closed', 'Rejected'
  ));

UPDATE incident_reports SET status = 'Approved' WHERE status = 'Received';

UPDATE incident_history SET old_status = 'Approved' WHERE old_status = 'Received';
UPDATE incident_history SET new_status = 'Approved' WHERE new_status = 'Received';
