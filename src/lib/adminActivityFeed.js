import { formatIncidentAuditAction } from "@/lib/incidentAuditUtils";

/** Normalize incident_history + crisis alerts into one sorted feed. */
export function mergeAdminActivityFeed({ incidentHistory = [], alerts = [] }) {
  const incidentItems = incidentHistory.map((h) => {
    const inc = h.incident_reports;
    return {
      id: `incident-${h.id}`,
      source: "incident",
      at: h.created_at,
      action: h.action,
      actionLabel: formatIncidentAuditAction(h.action, h.new_status),
      title: inc?.reference_number || "Incident report",
      summary: inc?.category ? `${inc.category} · ${inc.location || "No location"}` : "Incident workflow",
      actor: h.changer?.full_name || (h.action === "created" ? "Reporter" : "System"),
      status: h.new_status,
      oldStatus: h.old_status,
      notes: h.notes,
      raw: h,
    };
  });

  const alertItems = alerts.map((a) => {
    const isResolved = a.status === "Resolved";
    return {
      id: `alert-${a.id}-${isResolved ? "resolved" : "created"}`,
      source: "crisis_alert",
      at: isResolved ? a.updated_at || a.created_at : a.created_at,
      action: isResolved ? "alert_resolved" : "alert_broadcast",
      actionLabel: isResolved ? "Crisis alert resolved" : "Crisis alert broadcast",
      title: a.title || "Untitled alert",
      summary: `${a.severity || "—"} · ${a.location || "No location"}`,
      actor: "Admin",
      status: a.status,
      oldStatus: null,
      notes: a.message,
      raw: a,
    };
  });

  return [...incidentItems, ...alertItems].sort(
    (a, b) => new Date(b.at).getTime() - new Date(a.at).getTime()
  );
}

export function filterActivityFeed(items, { search = "", source = "All" }) {
  const q = search.trim().toLowerCase();
  return items.filter((item) => {
    if (source !== "All" && item.source !== source) return false;
    if (!q) return true;
    return (
      item.title?.toLowerCase().includes(q) ||
      item.summary?.toLowerCase().includes(q) ||
      item.actionLabel?.toLowerCase().includes(q) ||
      item.actor?.toLowerCase().includes(q) ||
      item.notes?.toLowerCase().includes(q)
    );
  });
}
