export const ROUTE_ADVISORY_STATUSES = ["Safe", "Caution", "Closed"];
export const ROUTE_ADVISORY_TYPES = ["primary", "alternative"];
export const HAZARD_TYPES = [
  "Flooding",
  "Landslide",
  "Road Closure",
  "Crime/Security",
  "Weather Hazard",
  "Construction",
  "Accident",
  "Other",
];

export function routeStatusToUiKey(routeStatus) {
  if (routeStatus === "Safe") return "safe";
  if (routeStatus === "Caution") return "caution";
  return "unsafe";
}

export function getRouteAdvisoryStatusStyles(routeStatus) {
  const map = {
    Safe: {
      border: "border-green-600",
      badge: "bg-green-100 text-green-700",
      label: "Safe",
      title: "text-zinc-900 group-hover:text-green-700 group-active:text-green-700 transition-colors",
      titleStatic: "text-green-700",
      icon: "border-green-200 bg-green-50 text-green-700",
    },
    Caution: {
      border: "border-orange-500",
      badge: "bg-orange-100 text-orange-800",
      label: "Caution",
      title: "text-zinc-900 group-hover:text-orange-700 group-active:text-orange-700 transition-colors",
      titleStatic: "text-orange-700",
      icon: "border-orange-200 bg-orange-50 text-orange-700",
    },
    Closed: {
      border: "border-red-600",
      badge: "bg-red-100 text-red-800",
      label: "Closed",
      title: "text-zinc-900 group-hover:text-red-700 group-active:text-red-700 transition-colors",
      titleStatic: "text-red-700",
      icon: "border-red-200 bg-red-50 text-red-700",
    },
  };
  return map[routeStatus] || map.Caution;
}

export function formatAdvisoryTitle(advisory) {
  if (advisory?.title?.trim()) return advisory.title.trim();
  const from = advisory?.from_location;
  const to = advisory?.to_location;
  if (from && to) return `${from} → ${to}`;
  return to || "Route advisory";
}

function normalizeMapPlace(value) {
  if (typeof value !== "string") return null;
  const place = value.replace(/\s*\([^)]*\)/g, " ").trim();
  return !place || /^:?\s*enter\b/i.test(place) ? null : place;
}

/** Adapter for map markers and legacy display components */
export function advisoryToMapWarning(advisory) {
  if (!advisory) return null;
  const isAlternative = advisory.route_type === "alternative";
  const from = normalizeMapPlace(advisory.from_location);
  const via = normalizeMapPlace(advisory.via_location);

  return {
    id: advisory.id,
    dangerous_location: normalizeMapPlace(advisory.affected_location) || via || from || advisory.title,
    destination: normalizeMapPlace(advisory.to_location),
    current_location: from,
    alternative_route: isAlternative ? via : null,
    danger_type: advisory.hazard_type,
    severity:
      advisory.route_status === "Closed"
        ? "Dangerous"
        : advisory.route_status === "Caution"
          ? "Caution"
          : "Caution",
    latitude: advisory.latitude,
    longitude: advisory.longitude,
    alt_latitude: advisory.route_type === "alternative" ? advisory.latitude : null,
    alt_longitude: advisory.route_type === "alternative" ? advisory.longitude : null,
    status: advisory.status,
    is_public: advisory.is_public,
  };
}

export function getPublishedRouteAdvisories(advisories = []) {
  return advisories.filter((a) => a.status === "Active" && a.is_public !== false);
}
