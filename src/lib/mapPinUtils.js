/** Map pin colors and categories for the crisis / tourism map */

export const MAP_PIN_LEGEND = [
  { id: "weather", label: "Weather Alert", color: "#2563eb", kind: "pin" },
  { id: "crisis", label: "Crisis / Alert", color: "#dc2626", kind: "pin" },
  { id: "danger", label: "Danger — Avoid", color: "#b91c1c", kind: "pin" },
  { id: "caution", label: "Caution / Route Risk", color: "#f97316", kind: "pin" },
  { id: "route_safe", label: "Safe Alternative Route", color: "#16a34a", kind: "pin" },
  { id: "tourist", label: "Tourist Location", color: "#9333ea", kind: "pin" },
];

export const ROUTE_LINE_LEGEND = [
  { id: "route_safe_line", label: "Safe Route Path", color: "#16a34a", kind: "line" },
  { id: "route_caution_line", label: "Caution Route Path", color: "#f97316", kind: "line" },
  { id: "route_closed_line", label: "Closed Route Path", color: "#dc2626", kind: "line" },
];

export const ROUTES_MAP_LEGEND = [
  ...MAP_PIN_LEGEND.filter((item) =>
    ["caution", "danger", "route_safe"].includes(item.id)
  ),
  ...ROUTE_LINE_LEGEND,
];

export const TOURIST_LANDMARKS = [
  { id: "municipal-hall", name: "Daet Municipal Hall", location: "Municipal Hall, Daet, Camarines Norte" },
  { id: "bagasbas", name: "Bagasbas Beach", location: "Bagasbas, Daet, Camarines Norte" },
  { id: "camarines-norte-capital", name: "Daet Town Center", location: "Daet, Camarines Norte" },
  { id: "mercedes", name: "Mercedes", location: "Mercedes, Camarines Norte" },
];

export function getAlertPinCategory(alert) {
  const type = (alert?.type || "").toLowerCase();
  const severity = alert?.severity || "Low";

  if (type === "weather") return "weather";
  if (severity === "Critical" || severity === "High") return "crisis";
  if (severity === "Medium") return "caution";
  return "crisis";
}

export function getDangerPinCategory(warning) {
  if (warning?.severity === "Caution") return "caution";
  return "danger";
}

export function getLegendItem(categoryId) {
  return MAP_PIN_LEGEND.find((item) => item.id === categoryId) || MAP_PIN_LEGEND[1];
}

export function getPinColor(categoryId) {
  return getLegendItem(categoryId).color;
}

export function createCategoryPinIcon(categoryId) {
  if (typeof window === "undefined") return undefined;

  const color = getPinColor(categoryId);
  const L = require("leaflet");

  return L.divIcon({
    className: "map-category-pin",
    html: `<div aria-hidden="true" style="width:24px;height:32px;position:relative">
      <div style="background:${color};width:20px;height:20px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:2.5px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.35);position:absolute;top:2px;left:2px"></div>
      <div style="background:${color};width:8px;height:8px;border-radius:50%;position:absolute;bottom:0;left:8px;opacity:.35"></div>
    </div>`,
    iconSize: [24, 32],
    iconAnchor: [12, 32],
    popupAnchor: [0, -30],
  });
}

export function createSafeRoutePinIcon() {
  return createCategoryPinIcon("route_safe");
}
