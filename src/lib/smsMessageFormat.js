/** Consistent, readable SMS layouts for crisis alerts, roads, and area hazards. */
function cleanLine(value) {
  return String(value ?? "").replace(/\r\n?/g, "\n").trim();
}

function labeledLine(label, value) {
  const cleaned = cleanLine(value);
  return cleaned ? `${label}: ${cleaned}` : "";
}

function joinSmsLines(lines) {
  return lines.map(cleanLine).filter(Boolean).join("\n");
}

export function formatCrisisAlertSms(alert, { resolved = false } = {}) {
  const title = cleanLine(alert.title) || "Crisis Alert";
  const location = cleanLine(alert.location) || "Daet";

  if (resolved) {
    return joinSmsLines([
      "[CONNECT-DAET] CRISIS ALERT — RESOLVED",
      title,
      labeledLine("CATEGORY", alert.type),
      labeledLine("LOCATION", location),
      "STATUS: This alert is no longer active.",
    ]);
  }

  return joinSmsLines([
    "[CONNECT-DAET] CRISIS ALERT",
    title,
    labeledLine("CATEGORY", alert.type),
    labeledLine("SEVERITY", alert.severity),
    labeledLine("LOCATION", location),
    labeledLine("DETAILS", alert.message),
  ]);
}

export function formatAreaHazardSms(warning, { cleared = false } = {}) {
  const title = cleanLine(warning.dangerous_location) || "Area hazard";

  if (cleared) {
    return joinSmsLines([
      "[CONNECT-DAET] ROADS & HAZARDS — AREA HAZARD CLEARED",
      title,
      labeledLine("CATEGORY", warning.danger_type),
      labeledLine("LOCATION", warning.dangerous_location),
      "STATUS: This area hazard is no longer active.",
    ]);
  }

  return joinSmsLines([
    "[CONNECT-DAET] ROADS & HAZARDS — AREA HAZARD",
    title,
    labeledLine("CATEGORY", warning.danger_type),
    labeledLine("SEVERITY", warning.severity),
    labeledLine("LOCATION", warning.dangerous_location),
    labeledLine("CURRENT LOCATION", warning.current_location),
    labeledLine("ALTERNATIVE ROUTE", warning.alternative_route),
    labeledLine("DESTINATION", warning.destination),
    labeledLine("INSTRUCTIONS", warning.safety_instructions),
  ]);
}

export function formatRouteAdvisorySms(advisory, { cleared = false } = {}) {
  const title = cleanLine(advisory.title) || "Road advisory";

  if (cleared) {
    return joinSmsLines([
      "[CONNECT-DAET] ROADS & HAZARDS — ROAD ADVISORY CLEARED",
      title,
      labeledLine("CATEGORY", advisory.hazard_type),
      labeledLine("LOCATION", advisory.affected_location || advisory.to_location),
      "STATUS: This road advisory is no longer active.",
    ]);
  }

  return joinSmsLines([
    "[CONNECT-DAET] ROADS & HAZARDS — ROAD ADVISORY",
    title,
    labeledLine("CATEGORY", advisory.hazard_type),
    labeledLine("STATUS", advisory.route_status),
    labeledLine("FROM", advisory.from_location),
    labeledLine("TO", advisory.to_location),
    labeledLine("VIA", advisory.via_location),
    labeledLine("AFFECTED AREA", advisory.affected_location),
    labeledLine("INSTRUCTIONS", advisory.safety_instructions || advisory.reason),
  ]);
}

export function prepareSmsBody(rawMessage, formatter) {
  return typeof formatter === "function"
    ? formatter(rawMessage)
    : cleanLine(rawMessage);
}
