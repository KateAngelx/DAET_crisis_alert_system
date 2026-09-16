/** Human-readable labels for incident_history.action values */
export function formatIncidentAuditAction(action, newStatus) {
  const map = {
    created: "Report submitted",
    approve: "Approved",
    auto_approved: "Auto-approved (legacy)",
    reject: "Rejected",
    review: "Marked under review",
    assign: "Assigned to guide",
    respond: "Response started",
    resolve: "Resolved",
    close: "Closed",
    status_update: "Status updated",
    admin_update: "Admin update",
  };
  if (map[action]) return map[action];
  if (newStatus) return `→ ${newStatus}`;
  return action || "Update";
}

/** Statuses hidden from the default admin queue (All statuses filter). */
export const INCIDENT_QUEUE_EXCLUDED_STATUSES = [
  "Approved",
  "Received",
  "Rejected",
  "Resolved",
  "Closed",
];
