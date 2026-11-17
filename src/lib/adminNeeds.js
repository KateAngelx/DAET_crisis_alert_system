const OPEN_REPORT = new Set(["Submitted", "Received", "Approved", "Under Review", "Assigned", "Responding"]);
const NEW_REPORT = new Set(["Submitted", "Received"]);
const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;

/**
 * The admin's "Needs action" list, most urgent first. Urgent rows carry `urgent: true`.
 * @param {object} input
 * @param {object[]} input.incidents       incident reports (status, escalation_level)
 * @param {object[]} input.missingCases     missing_person_cases (search_status, acknowledged_at)
 * @param {number}   input.pendingHelp      help requests still waiting for a guide
 * @param {{ alertId: string, title: string, failed: number }[]} input.smsFailures active alerts with failed texts
 */
export function buildAdminNeeds({ incidents = [], missingCases = [], pendingHelp = 0, smsFailures = [] } = {}) {
  const unacknowledged = missingCases.filter((c) => c.search_status === "searching" && !c.acknowledged_at);
  const escalated = incidents.filter((i) => OPEN_REPORT.has(i.status) && Number(i.escalation_level) > 0);
  const escalatedIds = new Set(escalated.map((i) => i.id));
  const fresh = incidents.filter((i) => NEW_REPORT.has(i.status) && !escalatedIds.has(i.id));
  const failedTexts = smsFailures.filter((row) => row.failed > 0);

  return [
    ...(unacknowledged.length
      ? [{
          id: "missing",
          href: "/crisis/command",
          title: `${plural(unacknowledged.length, "missing tourist")} not acknowledged`,
          description: "In Alerts, find Missing persons: call the reporter, then tap Acknowledge.",
          urgent: true,
        }]
      : []),
    ...(escalated.length
      ? [{
          id: "escalated",
          href: "/admin/incidents",
          title: `${plural(escalated.length, "report")} escalated`,
          description: "No one answered in time, so the escalation contacts were alerted. Respond now.",
          urgent: true,
        }]
      : []),
    ...(fresh.length
      ? [{ id: "new-reports", href: "/admin/incidents", title: `${plural(fresh.length, "new report")}`, description: "Review each one and set its status." }]
      : []),
    ...(pendingHelp > 0
      ? [{ id: "help", href: "/admin/guide-assistance", title: `${plural(pendingHelp, "help request")} waiting`, description: "Assign a guide to each one." }]
      : []),
    ...failedTexts.map((row) => ({
      id: `sms-${row.alertId}`,
      href: "/crisis/command",
      title: `${plural(row.failed, "text")} failed for "${row.title || "an alert"}"`,
      description: "In Alerts, open this alert, then Delivery report, to see who did not get it and resend.",
    })),
  ];
}
