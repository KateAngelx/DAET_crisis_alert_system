/** Admin workflow shortcuts for incident reports (maps to INCIDENT_STATUSES). */

const approvedActions = [
  { id: "review", label: "Under review", nextStatus: "Under Review", tone: "ghost", action: "review" },
  { id: "assign", label: "Assign guide", nextStatus: "Assigned", tone: "primary", action: "assign", needsModal: true },
  { id: "reject", label: "Reject", nextStatus: "Rejected", tone: "danger", action: "reject", confirm: true },
];

export const INCIDENT_QUICK_ACTIONS = {
  Submitted: [
    {
      id: "accept",
      label: "Approve",
      nextStatus: "Approved",
      tone: "primary",
      action: "approve",
      confirm: true,
    },
    { id: "reject", label: "Reject", nextStatus: "Rejected", tone: "danger", action: "reject", confirm: true },
  ],
  Approved: approvedActions,
  Received: approvedActions,
  "Under Review": [
    { id: "assign", label: "Assign guide", nextStatus: "Assigned", tone: "primary", action: "assign", needsModal: true },
    { id: "reject", label: "Reject", nextStatus: "Rejected", tone: "danger", action: "reject", confirm: true },
  ],
  Assigned: [
    { id: "respond", label: "Start response", nextStatus: "Responding", tone: "primary", action: "respond" },
    { id: "resolve", label: "Resolve", nextStatus: "Resolved", tone: "success", action: "resolve", confirm: true },
  ],
  Responding: [
    { id: "resolve", label: "Resolve", nextStatus: "Resolved", tone: "success", action: "resolve", confirm: true },
    { id: "close", label: "Close", nextStatus: "Closed", tone: "ghost", action: "close" },
  ],
  Resolved: [{ id: "close", label: "Close record", nextStatus: "Closed", tone: "ghost", action: "close" }],
  Closed: [],
  Rejected: [],
};

export function getIncidentQuickActions(status) {
  return INCIDENT_QUICK_ACTIONS[status] || [];
}

export function isIncidentClosed(status) {
  return ["Resolved", "Closed", "Rejected"].includes(status);
}
