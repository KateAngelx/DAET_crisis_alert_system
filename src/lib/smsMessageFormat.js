/** SMS length and formatting for iProg (supports multi-segment messages) */

/** GSM single segment = 160; 480 ≈ 3 segments. Override via SMS_MAX_LENGTH env. */
export function getSmsMaxLength() {
  const parsed = parseInt(process.env.SMS_MAX_LENGTH || "480", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 480;
}

/** Normalize whitespace and truncate with ellipsis if still over limit */
export function truncateForSms(text, maxLength) {
  const limit = maxLength ?? getSmsMaxLength();
  const normalized = String(text ?? "")
    .replace(/\r\n/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (normalized.length <= limit) return normalized;
  return `${normalized.slice(0, Math.max(0, limit - 1)).trim()}…`;
}

export function formatCrisisAlertSms(alert, { resolved = false } = {}) {
  const title = alert.title || "Crisis Alert";
  const location = alert.location || "Daet";
  if (resolved) {
    return truncateForSms(
      `[CONNECT-DAET] RESOLVED: ${title}. ${location}. This alert is no longer active.`
    );
  }
  const severity = alert.severity || "Alert";
  const detail = alert.message || "";
  const text = `[CONNECT-DAET] ${severity}: ${title}. ${location}. ${detail}`;
  return truncateForSms(text);
}

export function formatAreaHazardSms(warning, { cleared = false } = {}) {
  const place = warning.dangerous_location || "Affected area";
  if (cleared) {
    return truncateForSms(
      `[CONNECT-DAET] CLEARED: ${place}. This area hazard is no longer active.`
    );
  }
  const label = warning.severity === "Caution" ? "Route Caution" : "Area Hazard";
  const hazard = warning.danger_type || "Hazard";
  const route = [warning.alternative_route, warning.destination].filter(Boolean).join(" → ");
  const instructions = warning.safety_instructions || "";
  const routePart = route ? ` Detour: ${route}.` : "";
  const instructPart = instructions ? ` ${instructions}` : "";
  const text = `[CONNECT-DAET] ${label}: ${hazard} at ${place}.${routePart}${instructPart}`;
  return truncateForSms(text);
}

export function formatRouteAdvisorySms(advisory, { cleared = false } = {}) {
  const title = advisory.title || "Road advisory";
  const place = advisory.affected_location || advisory.to_location || "Daet";
  if (cleared) {
    return truncateForSms(
      `[CONNECT-DAET] CLEARED: ${title}. ${place}. This road advisory is no longer active.`
    );
  }
  const status = advisory.route_status || "Advisory";
  const detail = advisory.safety_instructions || advisory.reason || "";
  const text = `[CONNECT-DAET] ${status}: ${title}. ${place}. ${detail}`;
  return truncateForSms(text);
}

export function prepareSmsBody(rawMessage, formatter) {
  if (typeof formatter === "function") {
    return formatter(rawMessage);
  }
  return truncateForSms(rawMessage);
}
