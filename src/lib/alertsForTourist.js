import { groupMatchesAlertArea } from "@/lib/alertTargeting";

const SEVERITY_RANK = { Critical: 0, High: 1, Medium: 2, Low: 3 };

/**
 * The alerts a tourist should see first on Home, each with the reason it is shown:
 * anything Critical or High in Daet, plus any alert at a place on their tour today.
 * Minor alerts elsewhere stay on the Alerts page.
 * @param {object[]} alerts     the store's alerts
 * @param {object|null} group   the tourist's active tour group, if any
 * @returns {{ alert: object, reason: string }[]} most serious first
 */
export function alertsForTourist(alerts = [], group = null) {
  return alerts
    .filter((alert) => alert.status === "Active" && alert.is_public !== false)
    .map((alert) => {
      const onTour = Boolean(group) && groupMatchesAlertArea(group, alert);
      const serious = alert.severity === "Critical" || alert.severity === "High";
      if (!onTour && !serious) return null;
      return { alert, reason: onTour ? "On your tour route" : "Serious alert in Daet" };
    })
    .filter(Boolean)
    .sort((a, b) => (SEVERITY_RANK[a.alert.severity] ?? 9) - (SEVERITY_RANK[b.alert.severity] ?? 9));
}
