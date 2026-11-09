import { getStatusColor } from "@/lib/constants";

/** Statuses that appear in Archive & History (terminal / inactive workflow). */
export const ARCHIVE_INCIDENT_STATUSES = ["Resolved", "Closed", "Rejected"];

/** Open incidents still in workflow. */
export const OPEN_INCIDENT_STATUSES = [
  "Submitted",
  "Approved",
  "Received",
  "Under Review",
  "Assigned",
  "Responding",
];

export function isArchiveIncidentStatus(status) {
  return ARCHIVE_INCIDENT_STATUSES.includes(status);
}

export function normalizeIncidentStatusLabel(status) {
  if (status === "Received") return "Approved";
  return status;
}

export function incidentStatusBadgeClass(status) {
  const normalized = status === "Received" ? "Approved" : status;
  return getStatusColor(normalized === "Approved" ? "Approved" : status);
}

/** Legacy DB CHECK (pre-021) used Received instead of Approved. */
export const INCIDENT_STATUS_LEGACY_APPROVED_DB = 'Received';

export function isIncidentReportsStatusCheckError(error) {
  const msg = String(error?.message || error || '');
  return msg.includes('incident_reports_status_check');
}

/** Map UI / workflow status to a value allowed on older hosted DBs. */
export function fallbackIncidentStatusForDbConstraint(requestedStatus) {
  if (requestedStatus === 'Approved') return INCIDENT_STATUS_LEGACY_APPROVED_DB;
  return null;
}

export function incidentStatusesEquivalent(a, b) {
  if (a === b) return true;
  const pair = new Set([a, b]);
  return pair.has('Approved') && pair.has('Received');
}

export function incidentMatchesStatusFilter(filterStatus, incidentStatus) {
  if (filterStatus === 'All') return true;
  if (incidentStatusesEquivalent(filterStatus, incidentStatus)) return true;
  return filterStatus === incidentStatus;
}
