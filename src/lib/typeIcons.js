/**
 * One icon per alert, hazard, road and notice type, shared by every page, notice and map pin.
 * Plain data (lucide icon names) so it can be tested and used on the server too.
 */

/** Crisis alert types, matched by keyword (admins may type custom ones). */
export const ALERT_TYPE_ICON_RULES = [
  { match: ["typhoon", "storm", "wind"], icon: "Wind", label: "Typhoon / storm" },
  { match: ["flood", "storm surge", "tsunami", "rip current"], icon: "Waves", label: "Flood / water" },
  { match: ["fire"], icon: "Flame", label: "Fire" },
  { match: ["earthquake", "quake"], icon: "Activity", label: "Earthquake" },
  { match: ["landslide"], icon: "Mountain", label: "Landslide" },
  { match: ["weather", "rain", "heat"], icon: "CloudLightning", label: "Weather" },
  { match: ["health", "medical", "disease"], icon: "HeartPulse", label: "Health" },
  { match: ["security", "crime", "threat", "armed"], icon: "ShieldAlert", label: "Security" },
  { match: ["road", "traffic", "transport"], icon: "TrafficCone", label: "Road" },
  { match: ["missing", "lost"], icon: "UserSearch", label: "Missing person" },
];
export const DEFAULT_ALERT_TYPE_ICON = "Megaphone"; // General

/** Area hazard types (DANGER_TYPES). */
export const HAZARD_TYPE_ICONS = {
  Flooding: "Waves",
  Landslide: "Mountain",
  "Road Closure": "TrafficCone",
  "Crime/Security": "ShieldAlert",
  "Weather Hazard": "CloudLightning",
  Construction: "Construction",
  Accident: "CarFront",
  Other: "TriangleAlert",
};
export const DEFAULT_HAZARD_ICON = "TriangleAlert";

/** Road advisory statuses. */
export const ROAD_STATUS_ICONS = { Safe: "CircleCheck", Caution: "TrafficCone", Closed: "Ban" };
export const DEFAULT_ROAD_ICON = "Route";

function findRule(text) {
  const value = String(text || "").toLowerCase();
  return ALERT_TYPE_ICON_RULES.find((rule) => rule.match.some((word) => value.includes(word)));
}

/** Icon name for a crisis alert type, e.g. "Weather" → "CloudLightning". */
export function alertTypeIconName(type) {
  return findRule(type)?.icon || DEFAULT_ALERT_TYPE_ICON;
}

/** Icon name for an area hazard type; unknown types fall back to the alert keywords, then a warning sign. */
export function hazardTypeIconName(type) {
  if (HAZARD_TYPE_ICONS[type]) return HAZARD_TYPE_ICONS[type];
  return findRule(type)?.icon || DEFAULT_HAZARD_ICON;
}

export function roadStatusIconName(status) {
  return ROAD_STATUS_ICONS[status] || DEFAULT_ROAD_ICON;
}

/**
 * Icon name for an in-app notice, from its kind and the type written in its message.
 * Crisis notices read "Weather alert for …"; hazard notices read "Flooding reported at …".
 */
export function notificationIconName(notification) {
  const type = String(notification?.notification_type || "");
  const related = notification?.related_type;
  const title = String(notification?.title || "");
  const message = String(notification?.message || "");

  if (/_(cleared|resolved)$/.test(type) || /^(Resolved|Cleared):/i.test(title)) return "CircleCheck";
  if (/reward|points/.test(type) || /points/i.test(title)) return "Coins";
  if (type === "urgent_escalation") return "TriangleAlert";
  if (type.startsWith("crisis_checkin")) return "LifeBuoy";
  if (type.startsWith("missing_person") || related === "missing_person") return /_(found_safe|closed)$/.test(type) ? "CircleCheck" : "UserSearch";
  if (type.startsWith("crisis_alert") || related === "alert") {
    const fromMessage = message.match(/^(.+?) alert for /i);
    return alertTypeIconName(fromMessage ? fromMessage[1] : title);
  }
  if (type.startsWith("dangerous_location") || related === "dangerous_location") {
    const fromMessage = message.match(/^(.+?) reported at /i);
    return fromMessage ? hazardTypeIconName(fromMessage[1]) : DEFAULT_HAZARD_ICON;
  }
  if (type.startsWith("route_advisory") || related === "route_advisory") {
    const status = (message.match(/^(Safe|Caution|Closed)\b/i) || [])[1];
    return status ? roadStatusIconName(status[0].toUpperCase() + status.slice(1).toLowerCase()) : DEFAULT_ROAD_ICON;
  }
  if (type === "incident_message") return "MessageSquare";
  if (type.startsWith("tour_group") || related === "tour_group") return "Users";
  if (type.startsWith("incident") || related === "incident" || related === "incident_report") return "ClipboardList";
  if (type.startsWith("tourist_guide_assistance") || related === "tourist_guide_assistance") return "LifeBuoy";
  if (type.startsWith("guide_emergency") || related === "guide_emergency") return "ShieldAlert";
  return "Bell";
}
