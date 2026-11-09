/** Admin workflow shortcuts for incident reports (maps to INCIDENT_STATUSES). */

import { incidentReportEligibleForGuideAssignment } from '@/lib/incidentGuideEligibility';

const approvedActions = [
  { id: "review", label: "Under review", nextStatus: "Under Review", tone: "ghost", action: "review" },
  { id: "assign", label: "Assign guide", nextStatus: "Assigned", tone: "primary", action: "assign", needsModal: true },
  { id: "reject", label: "Reject", nextStatus: "Rejected", tone: "danger", action: "reject", confirm: true },
];

export const INCIDENT_QUICK_ACTIONS = {
  Submitted: [
    {
      id: "accept",
      label: "Approve for handling",
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

export function getIncidentQuickActionsForReport(incident) {
  let actions = getIncidentQuickActions(incident?.status);
  const guideRelated = incidentReportEligibleForGuideAssignment(incident);

  if (!guideRelated) {
    actions = actions.filter(
      (action) => action.action !== 'assign' && action.nextStatus !== 'Assigned'
    );
    if (incident?.status === 'Under Review') {
      const hasResolve = actions.some((a) => a.action === 'resolve');
      if (!hasResolve) {
        actions = [
          {
            id: 'resolve',
            label: 'Resolve',
            nextStatus: 'Resolved',
            tone: 'success',
            action: 'resolve',
            confirm: true,
          },
          ...actions,
        ];
      }
    }
  }

  return actions;
}

export function isIncidentClosed(status) {
  return ["Resolved", "Closed", "Rejected"].includes(status);
}
