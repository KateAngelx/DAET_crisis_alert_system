import { formatWarningTimeRange, formatRouteUpdatedAt, formatRouteExpiry } from "@/lib/dangerousLocationUtils";
import {
  formatAdvisoryTitle,
  getPublishedRouteAdvisories,
} from "@/lib/routeAdvisoryUtils";

export const ROUTE_STATUS = {
  safe: {
    label: "Safe",
    border: "border-green-600",
    badge: "bg-green-100 text-green-700",
    text: "text-green-800",
    bg: "bg-green-50",
    accent: "green",
  },
  caution: {
    label: "Caution",
    border: "border-orange-500",
    badge: "bg-orange-100 text-orange-800",
    text: "text-orange-800",
    bg: "bg-orange-50",
    accent: "orange",
  },
  unsafe: {
    label: "Unsafe",
    border: "border-red-600",
    badge: "bg-red-100 text-red-800",
    text: "text-red-800",
    bg: "bg-red-50",
    accent: "red",
  },
};

function routeMetaFields(advisory) {
  return {
    timeRange: formatWarningTimeRange(advisory),
    updatedAtLabel: formatRouteUpdatedAt(advisory),
    expiry: formatRouteExpiry(advisory),
    advisory,
    warning: advisory,
  };
}

export function advisoryToRouteItem(advisory, view) {
  const resolvedView =
    view ||
    (advisory.route_type === "alternative"
      ? "alternative"
      : advisory.route_status === "Safe"
        ? "safe"
        : advisory.route_status === "Caution"
          ? "caution"
          : "affected");

  const status =
    resolvedView === "alternative" || resolvedView === "safe"
      ? "safe"
      : resolvedView === "caution"
        ? "caution"
        : "unsafe";

  const styles = ROUTE_STATUS[status];
  const title = formatAdvisoryTitle(advisory);

  const base = {
    kind: resolvedView,
    id: advisory.id,
    advisoryId: advisory.id,
    warningId: advisory.id,
    view: resolvedView,
    title,
    status,
    from: advisory.from_location || advisory.affected_location || "Start",
    to: advisory.to_location,
    via: advisory.via_location,
    affectedLocation: advisory.affected_location,
    reason:
      advisory.reason ||
      (advisory.hazard_type
        ? `${advisory.hazard_type}${advisory.affected_location ? ` at ${advisory.affected_location}` : ""}.`
        : "Route advisory published by Daet LGU."),
    recommendedAction:
      advisory.safety_instructions ||
      (resolvedView === "alternative"
        ? "Use this LGU-recommended detour and follow your guide's instructions."
        : resolvedView === "safe"
          ? "Route is open. Stay alert for updates before you travel."
          : resolvedView === "caution"
            ? "Proceed with caution and follow LGU guidance."
            : "Avoid this route and use a published detour below."),
    alternativeRoute: advisory.via_location,
    parentRouteId: advisory.parent_route_id,
    ...routeMetaFields(advisory),
    statusLabel:
      advisory.route_status === "Closed"
        ? "Closed / Unsafe"
        : styles.label,
  };

  if (resolvedView === "alternative") {
    return {
      ...base,
      subtitle: "Recommended detour",
    };
  }

  if (resolvedView === "safe") {
    return {
      ...base,
      subtitle: "Open / Safe",
    };
  }

  return {
    ...base,
    subtitle: `${advisory.hazard_type || "Advisory"} · ${base.statusLabel}`,
  };
}

export function buildRouteCatalog(advisories = []) {
  const published = getPublishedRouteAdvisories(advisories);

  const safe = published
    .filter((a) => a.route_type === "primary" && a.route_status === "Safe")
    .map((a) => advisoryToRouteItem(a, "safe"));

  const active = published
    .filter((a) => a.route_type === "primary" && a.route_status === "Caution")
    .map((a) => advisoryToRouteItem(a, "caution"));

  const affected = published
    .filter((a) => a.route_type === "primary" && a.route_status === "Closed")
    .map((a) => advisoryToRouteItem(a, "affected"));

  const alternative = published
    .filter((a) => a.route_type === "alternative")
    .map((a) => advisoryToRouteItem(a, "alternative"));

  return {
    safe,
    active,
    affected,
    alternative,
    published,
    isEmpty: published.length === 0,
  };
}

export function getRouteStatusStyles(status) {
  return ROUTE_STATUS[status] || ROUTE_STATUS.safe;
}

export function getRouteItemFromAdvisory(advisory, view) {
  if (!advisory) return null;
  return advisoryToRouteItem(advisory, view);
}

/** @deprecated use getRouteItemFromAdvisory */
export function getRouteItemFromWarning(warning, view) {
  return getRouteItemFromAdvisory(warning, view);
}

export function findRouteItem(catalog, advisoryId, view) {
  if (!advisoryId || !catalog) return null;
  const pools = [
    ...(catalog.safe || []),
    ...(catalog.active || []),
    ...(catalog.affected || []),
    ...(catalog.alternative || []),
  ];
  return (
    pools.find((r) => r.advisoryId === advisoryId && r.view === view) ||
    pools.find((r) => r.advisoryId === advisoryId) ||
    null
  );
}

export function getLinkedAlternatives(catalog, primaryAdvisoryId) {
  if (!catalog || !primaryAdvisoryId) return [];
  return (catalog.alternative || []).filter((r) => r.parentRouteId === primaryAdvisoryId);
}

export function resolveRouteItemView(advisory) {
  if (!advisory) return "affected";
  if (advisory.route_type === "alternative") return "alternative";
  if (advisory.route_status === "Safe") return "safe";
  if (advisory.route_status === "Caution") return "caution";
  return "affected";
}
