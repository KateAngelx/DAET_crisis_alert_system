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

export function formatCrisisAlertSms(alert) {
  const severity = alert.severity || "Alert";
  const title = alert.title || "Crisis Alert";
  const location = alert.location || "Daet";
  const detail = alert.message || "";
  const text = `[CONNECT-DAET] ${severity}: ${title}. ${location}. ${detail}`;
  return truncateForSms(text);
}

export function formatAreaHazardSms(warning) {
  const label = warning.severity === "Caution" ? "Route Caution" : "Area Hazard";
  const place = warning.dangerous_location || "Affected area";
  const hazard = warning.danger_type || "Hazard";
  const route = [warning.alternative_route, warning.destination].filter(Boolean).join(" → ");
  const instructions = warning.safety_instructions || "";
  const routePart = route ? ` Detour: ${route}.` : "";
  const instructPart = instructions ? ` ${instructions}` : "";
  const text = `[CONNECT-DAET] ${label}: ${hazard} at ${place}.${routePart}${instructPart}`;
  return truncateForSms(text);
}

export function prepareSmsBody(rawMessage, formatter) {
  if (typeof formatter === "function") {
    return formatter(rawMessage);
  }
  return truncateForSms(rawMessage);
}
