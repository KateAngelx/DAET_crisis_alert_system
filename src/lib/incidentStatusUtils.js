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
