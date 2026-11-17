const CLOSED = ["Resolved", "Closed", "Rejected"];
const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;

/**
 * The guide's "Needs you now" list, most urgent first.
 * Urgent rows (missing tourists, tourists not accounted for in an alert) are marked `urgent`.
 */
export function buildGuideNeeds({ waitingAssistance = 0, criticalAlerts = [], unaccounted = [], incidents = [], overdueGroups = [] } = {}) {
  const open = incidents.filter((incident) => !CLOSED.includes(incident.status));
  const missing = open.filter((incident) => incident.category === "Missing Person");
  const otherOpen = open.length - missing.length;
  return [
    ...missing.map((incident) => ({
      id: `missing-${incident.id}`,
      href: `/guide/reports/${incident.id}`,
      title: `Missing tourist${incident.location ? ` near ${incident.location}` : ""}`,
      description: "Search is open. Open the report for details and the office chat.",
      urgent: true,
    })),
    ...unaccounted.map((row) => ({
      id: `checkin-${row.alertId}`,
      href: "/guide/crisis",
      title: `${plural(row.count, "tourist")} not accounted for`,
      description: `Check-in for "${row.title || "an alert"}". Mark each one safe, needs help or missing.`,
      urgent: true,
    })),
    ...(waitingAssistance > 0
      ? [{ id: "assistance", href: "/guide/assistance", title: plural(waitingAssistance, "help request"), description: "Waiting for you to accept or decline" }]
      : []),
    ...(criticalAlerts.length > 0
      ? [{ id: "critical-alerts", href: "/guide/crisis", title: plural(criticalAlerts.length, "critical alert"), description: "Read what to do and tell your groups" }]
      : []),
    ...(otherOpen > 0
      ? [{ id: "reports", href: "/guide/reports", title: plural(otherOpen, "open report"), description: "Follow up on reports" }]
      : []),
    ...overdueGroups.map((group) => ({
      id: group.id,
      href: `/guide/groups/${group.id}`,
      title: group.name,
      description: "End date reached. Mark it done when everyone is back safely.",
    })),
  ];
}
