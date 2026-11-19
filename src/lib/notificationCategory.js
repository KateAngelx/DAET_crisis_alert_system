/** Sorts notifications into crisis/updates versus rewards so points never look like alerts. */
import { isAreaHazardNotification } from "@/lib/travelLinks";

export function isRewardNotification(notification) {
  const type = String(notification?.notification_type || "");
  return type === "points_awarded" || type.endsWith("_reward");
}

export function isCrisisAlertNotification(notification) {
  if (isRewardNotification(notification)) return false;
  return notification?.notification_type === "crisis_alert" || notification?.related_type === "alert";
}

const PRIORITY_TO_SEVERITY = { CRITICAL: "Critical", HIGH: "High", NORMAL: "Medium", LOW: "Low" };

/**
 * The level a notification should be colored with, matching the cards it links to:
 * "Critical" | "High" | "Medium" | "Low" | "Resolved", or null for routine notices.
 *
 * - Crisis alerts: the alert's own severity (titles start with it, e.g. "Medium Crisis Alert: …").
 * - Area hazards: Dangerous/Critical → Critical (red), Caution → Medium (yellow), as on hazard cards.
 * - Road advisories: Closed → High (orange), Caution → Medium (yellow), Safe → Low (blue), as on road cards.
 * - Resolved or cleared notices → "Resolved" (green).
 */
export function getNotificationSeverity(notification) {
  if (!notification || isRewardNotification(notification)) return null;
  const type = String(notification.notification_type || "");
  const title = String(notification.title || "");
  const message = String(notification.message || "");
  const related = notification.related_type;

  if (/_(cleared|resolved)$/.test(type) || /^(Resolved|Cleared):/i.test(title)) return "Resolved";

  if (isCrisisAlertNotification(notification)) {
    const fromTitle = title.match(/^(Critical|High|Medium|Low)\b/);
    if (fromTitle) return fromTitle[1];
    return PRIORITY_TO_SEVERITY[notification.priority] || null;
  }

  if (type.startsWith("dangerous_location") || related === "dangerous_location") {
    return notification.priority === "CRITICAL" ? "Critical" : "Medium";
  }

  if (type.startsWith("route_advisory") || related === "route_advisory") {
    if (/^Closed\b/i.test(message)) return "High";
    if (/^Caution\b/i.test(message)) return "Medium";
    return "Low";
  }

  if (type.startsWith("incident") || related === "incident") {
    const fromTitle = title.match(/^(Critical|High|Medium|Low)\b/);
    if (fromTitle) return fromTitle[1];
    return PRIORITY_TO_SEVERITY[notification.priority] || "Medium";
  }

  return null;
}

export function splitRewardNotifications(notifications = []) {
  const updates = [];
  const rewards = [];
  for (const notification of notifications) {
    if (isRewardNotification(notification)) rewards.push(notification);
    else updates.push(notification);
  }
  return { updates, rewards };
}

/** Alert, hazard and road notices that a person may hide as "not affected" (never Critical ones). */
export function canDismissNotification(notification) {
  if (!notification || notification.dismissed_at) return false;
  const severity = getNotificationSeverity(notification);
  if (!severity || severity === "Critical") return false;
  if (severity !== "Resolved" && notification.priority === "CRITICAL") return false;
  return true;
}

export function isDismissedNotification(notification) {
  return Boolean(notification?.dismissed_at);
}

/**
 * Critical alerts (and critical area hazards) open in the middle of the screen with a long
 * siren and vibration, for tourists and guides. They stay until the person closes them.
 */
export function isCriticalArrival(notification, role) {
  if (!notification || role === "admin") return false;
  if (!isCrisisAlertNotification(notification) && !isAreaHazardNotification(notification)) return false;
  return getNotificationSeverity(notification) === "Critical";
}
