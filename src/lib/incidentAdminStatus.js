import { INCIDENT_STATUSES, incidentSupportsGuideAssignment } from '@/lib/constants';
import { incidentReportEligibleForGuideAssignment } from '@/lib/incidentGuideEligibility';
import { INCIDENT_STATUS_LEGACY_APPROVED_DB } from '@/lib/incidentStatusUtils';

/** Admin-facing meaning of each operational incident status (not points). */
const INCIDENT_STATUS_ADMIN_HELP = {
  Submitted: 'New report awaiting an operational decision. Approve it to accept it for handling, or reject it if it is invalid or out of scope.',
  Approved: 'Accepted for handling. It leaves the default active queue; use the Approved filter to find it and move it to Under Review.',
  'Under Review': 'An administrator is assessing the report. Move it to Responding when active work begins, Resolve it when handled, or Reject it if invalid.',
  Assigned: 'Tourist Assistance only: a guide has been selected and assigned. Move to Responding when the guide begins work.',
  Responding: 'Active response is in progress. Resolve the report when the response is complete, or close it when no further follow-up is needed.',
  Resolved: 'The incident has been handled and an outcome recorded. Close it to finish the record.',
  Closed: 'The record is finalized and archived. No further status changes are allowed.',
  Rejected: 'The report was declined as invalid or out of scope. This is a final status.',
};

const TERMINAL_STATUSES = new Set(['Closed', 'Rejected']);

function canonicalStatus(status) {
  return status === INCIDENT_STATUS_LEGACY_APPROVED_DB ? 'Approved' : status;
}

function getAllowedNextStatuses(currentStatus, category) {
  const current = canonicalStatus(currentStatus);
  switch (current) {
    case 'Submitted':
      return ['Approved', 'Rejected'];
    case 'Approved':
      return incidentReportEligibleForGuideAssignment(category)
        ? ['Under Review', 'Assigned', 'Rejected']
        : ['Under Review', 'Rejected'];
    case 'Under Review':
      return incidentReportEligibleForGuideAssignment(category)
        ? ['Assigned', 'Resolved', 'Rejected']
        : ['Responding', 'Resolved', 'Rejected'];
    case 'Assigned':
      return ['Responding', 'Resolved'];
    case 'Responding':
      return ['Resolved', 'Closed'];
    case 'Resolved':
      return ['Closed'];
    default:
      return [];
  }
}

export function getIncidentStatusAdminHelp(status, category) {
  const canonical = canonicalStatus(status);
  const help = INCIDENT_STATUS_ADMIN_HELP[canonical];
  if (!help) return null;

  if (canonical === 'Approved' && status === INCIDENT_STATUS_LEGACY_APPROVED_DB) {
    return `Legacy database status “${INCIDENT_STATUS_LEGACY_APPROVED_DB}”; shown as Approved. ${help}`;
  }
  if (canonical === 'Approved' && incidentSupportsGuideAssignment(category)) {
    return `${help} Tourist Assistance reports may instead be assigned directly when a guide is selected.`;
  }
  if (canonical === 'Under Review' && incidentSupportsGuideAssignment(category)) {
    return 'An administrator is assessing the request. Assign a guide before starting a response, resolve it when handled, or reject it if invalid.';
  }
  return help;
}

/**
 * Show the current database value and only valid next statuses.
 * The legacy Received value stays selectable when already stored on a report.
 */
export function getAdminIncidentStatusOptions(incidentOrCategory) {
  const incident =
    incidentOrCategory && typeof incidentOrCategory === 'object'
      ? incidentOrCategory
      : { category: incidentOrCategory };
  const currentStatus = incident.status;
  const allowed = getAllowedNextStatuses(currentStatus, incident.category);
  const options = INCIDENT_STATUSES.filter(
    (status) => status === currentStatus || allowed.includes(status)
  );

  if (currentStatus === INCIDENT_STATUS_LEGACY_APPROVED_DB) {
    return [currentStatus, ...options.filter((status) => status !== currentStatus)];
  }
  if (currentStatus && !options.includes(currentStatus)) {
    return [currentStatus, ...options];
  }
  return options;
}

/**
 * Validate operational workflow changes. Points decisions are intentionally
 * excluded; they never change or approve an incident status.
 */
export function validateIncidentStatusTransition(
  currentStatus,
  nextStatus,
  category,
  assignedTo
) {
  if (!nextStatus) return { ok: false, reason: 'Choose an operational status.' };

  const isDatabaseStatus =
    INCIDENT_STATUSES.includes(nextStatus) ||
    nextStatus === INCIDENT_STATUS_LEGACY_APPROVED_DB;
  if (!isDatabaseStatus) {
    return { ok: false, reason: 'Choose a valid incident status.' };
  }

  if (nextStatus === 'Assigned') {
    if (!incidentReportEligibleForGuideAssignment(category)) {
      return {
        ok: false,
        reason: 'Assigned is only for Tourist Assistance reports that need a guide.',
      };
    }
    if (!assignedTo) {
      return {
        ok: false,
        reason: 'Select a tourism guide before setting the incident status to Assigned.',
      };
    }
  }

  if (currentStatus === nextStatus) return { ok: true };

  const current = canonicalStatus(currentStatus);
  const next = canonicalStatus(nextStatus);
  if (TERMINAL_STATUSES.has(current)) {
    return { ok: false, reason: `${current} is a final status and cannot be changed.` };
  }

  const allowed = getAllowedNextStatuses(currentStatus, category);
  if (!allowed.includes(next)) {
    return {
      ok: false,
      reason: `A report cannot move from ${current || 'its current status'} to ${next}. Choose one of the available next steps.`,
    };
  }

  return { ok: true };
}
