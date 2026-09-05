/** Map route_advisories rows (advisory_kind = area) ↔ legacy warning UI shape */

export function areaAdvisoryToWarning(advisory) {
  if (!advisory) return null;
  const severity =
    advisory.route_status === "Caution"
      ? "Caution"
      : advisory.route_status === "Closed"
        ? "Dangerous"
        : "Caution";

  return {
    id: advisory.id,
    dangerous_location: advisory.affected_location || advisory.title,
    danger_type: advisory.hazard_type || "General",
    severity,
    warning_starts_at: advisory.warning_starts_at,
    warning_ends_at: advisory.warning_ends_at,
    current_location: advisory.from_location,
    alternative_route: advisory.via_location,
    destination: advisory.to_location,
    safety_instructions: advisory.safety_instructions,
    latitude: advisory.latitude,
    longitude: advisory.longitude,
    alt_latitude: null,
    alt_longitude: null,
    status: advisory.status,
    is_public: advisory.is_public,
    created_at: advisory.created_at,
    updated_at: advisory.updated_at,
  };
}

export function warningPayloadToAreaAdvisory(payload) {
  const severity = payload.severity || "Caution";
  return {
    advisory_kind: "area",
    title: payload.dangerous_location,
    route_status: severity === "Caution" ? "Caution" : "Closed",
    route_type: "primary",
    parent_route_id: null,
    from_location: payload.current_location || null,
    to_location: payload.destination,
    via_location: payload.alternative_route,
    affected_location: payload.dangerous_location,
    hazard_type: payload.danger_type,
    safety_instructions: payload.safety_instructions || null,
    warning_starts_at: payload.warning_starts_at || new Date().toISOString(),
    warning_ends_at: payload.warning_ends_at || null,
    status: payload.status || "Active",
    is_public: payload.is_public !== false,
    latitude: payload.latitude != null ? Number(payload.latitude) : null,
    longitude: payload.longitude != null ? Number(payload.longitude) : null,
    route_path: null,
  };
}

export function isAreaAdvisoryRow(row) {
  return row?.advisory_kind === "area";
}

export function isRouteAdvisoryRow(row) {
  return !row?.advisory_kind || row.advisory_kind === "route";
}
