/** Shared rules for crisis alert reading points (UI + admin form; mirrors DB award_alert_read_points). */

export const REWARD_EMERGENCY_LANGUAGE =
  /(emergency|evacuat|warning|911|117|assistance|assist|urgent|immediate danger|rescue|shelter|call police|call the police|call fire|call ambulance)/i;

export function isAlertEligibleForReadingPoints({ severity, type, title, message } = {}) {
  return (
    ["low", "medium"].includes(String(severity || "").trim().toLowerCase()) &&
    ["general", "weather", "health"].includes(String(type || "").trim().toLowerCase()) &&
    !REWARD_EMERGENCY_LANGUAGE.test(`${title || ""} ${message || ""} ${type || ""}`)
  );
}

/** Whether a tourist can be offered the optional “I have read this advisory” action in the alert modal. */
export function canTouristOfferAlertReadPoints(alert, { isAuthenticated, role } = {}) {
  if (!alert || !isAuthenticated || role !== "tourist") return false;
  if (alert.rewards_eligible !== true || alert.is_public === false) return false;
  if (String(alert.status || "").toLowerCase() !== "active") return false;
  return isAlertEligibleForReadingPoints({
    severity: alert.severity,
    type: alert.type,
    title: alert.title,
    message: alert.message,
  });
}