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
    },
    Caution: {
      border: "border-orange-500",
      badge: "bg-orange-100 text-orange-800",
      label: "Caution",
    },
    Closed: {
      border: "border-red-600",
      badge: "bg-red-100 text-red-800",
      label: "Closed",
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

/** Adapter for map markers and legacy display components */
export function advisoryToMapWarning(advisory) {
  if (!advisory) return null;
  return {
    id: advisory.id,
    dangerous_location: advisory.affected_location || advisory.via_location || advisory.title,
    destination: advisory.to_location,
    current_location: advisory.from_location,
    alternative_route: advisory.route_type === "alternative" ? advisory.via_location : null,
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
