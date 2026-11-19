/** Map pin colors and categories for the crisis / tourism map */

export const MAP_PIN_LEGEND = [
  { id: "weather", label: "Weather Alert", color: "#2563eb", kind: "pin" },
  { id: "crisis", label: "Crisis / Alert", color: "#dc2626", kind: "pin" },
  { id: "danger", label: "Danger — Avoid", color: "#b91c1c", kind: "pin" },
  { id: "caution", label: "Caution / Route Risk", color: "#f97316", kind: "pin" },
  { id: "route_safe", label: "Safe Alternative Route", color: "#16a34a", kind: "pin" },
  { id: "tourist", label: "Tourist Location", color: "#9333ea", kind: "pin" },
];

/** Matches `getRoutePolylineStyle` and map polylines. */
export const ROUTE_POLYLINE_COLORS = {
  safe: "#16a34a",
  caution: "#f97316",
  closed: "#dc2626",
  default: "#2563eb",
  hazardAlt: "#16a34a",
};

export const ROUTE_LINE_LEGEND = [
  { id: "route_safe_line", label: "Safe route path", color: ROUTE_POLYLINE_COLORS.safe, kind: "line", lineStyle: "solid" },
  { id: "route_caution_line", label: "Caution route path", color: ROUTE_POLYLINE_COLORS.caution, kind: "line", lineStyle: "dashed" },
  { id: "route_closed_line", label: "Closed route path", color: ROUTE_POLYLINE_COLORS.closed, kind: "line", lineStyle: "solid" },
  { id: "hazard_alt_line", label: "Safer path (area hazard)", color: ROUTE_POLYLINE_COLORS.hazardAlt, kind: "line", lineStyle: "dashed" },
  { id: "route_start", label: "Route start (S)", color: ROUTE_POLYLINE_COLORS.default, kind: "pin" },
  { id: "route_end", label: "Route end (E)", color: ROUTE_POLYLINE_COLORS.safe, kind: "pin" },
];

/** Public travel map: hazard pins + route lines. */
export const ROUTES_MAP_LEGEND = [
  ...MAP_PIN_LEGEND.filter((item) => ["caution", "danger", "route_safe"].includes(item.id)),
  ...ROUTE_LINE_LEGEND,
];

/** Admin / hazard maps: pins and suggested safer paths only (no crisis route status lines). */
export const HAZARDS_MAP_LEGEND = [
  { id: "danger", label: "Danger — avoid", color: "#b91c1c", kind: "pin" },
  { id: "caution", label: "Caution area", color: "#f97316", kind: "pin" },
  { id: "route_safe", label: "Safer destination", color: ROUTE_POLYLINE_COLORS.safe, kind: "pin" },
  { id: "hazard_alt_line", label: "Suggested safer path", color: ROUTE_POLYLINE_COLORS.hazardAlt, kind: "line", lineStyle: "dashed" },
];

/** Admin route advisories map (route polylines only). */
export const ADMIN_ROADS_MAP_LEGEND = ROUTE_LINE_LEGEND.filter((item) => item.id !== "hazard_alt_line");

export const ALERT_STATUS_LEGEND = [
  { id: "Critical", label: "Critical", color: "#dc2626", kind: "pin" },
  { id: "High", label: "High", color: "#f97316", kind: "pin" },
  { id: "Medium", label: "Medium", color: "#eab308", kind: "pin" },
  { id: "Low", label: "Low", color: "#2563eb", kind: "pin" },
];

export function crisisAlertLegendItems({ showTouristSpots = false, showWarnings = false } = {}) {
  const extraIds = [];
  if (showWarnings) extraIds.push("danger");
  if (showTouristSpots) extraIds.push("tourist");
  const extras = MAP_PIN_LEGEND.filter((item) => extraIds.includes(item.id));
  return [...ALERT_STATUS_LEGEND, ...extras];
}

export const TOURIST_LANDMARKS = [
  { id: "municipal-hall", name: "Daet Municipal Hall", location: "Municipal Hall, Daet, Camarines Norte" },
  { id: "bagasbas", name: "Bagasbas Beach", location: "Bagasbas, Daet, Camarines Norte" },
  { id: "camarines-norte-capital", name: "Daet Town Center", location: "Daet, Camarines Norte" },
  { id: "mercedes", name: "Mercedes", location: "Mercedes, Camarines Norte" },
];

export function getAlertPinCategory(alert) {
  const severity = alert?.severity || "Low";
  return ALERT_STATUS_LEGEND.some((item) => item.id === severity) ? severity : "Low";
}

export function getDangerPinCategory(warning) {
  if (warning?.severity === "Caution") return "caution";
  return "danger";
}

export function getLegendItem(categoryId) {
  return (
    ALERT_STATUS_LEGEND.find((item) => item.id === categoryId) ||
    MAP_PIN_LEGEND.find((item) => item.id === categoryId) ||
    MAP_PIN_LEGEND[1]
  );
}

export function getPinColor(categoryId) {
  return getLegendItem(categoryId).color;
}

