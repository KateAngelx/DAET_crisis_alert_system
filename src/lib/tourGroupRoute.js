export function formatTourRoute(group) {
  if (!group) return "—";
  const from = group.starting_location?.trim();
  const to = group.destination?.trim();
  if (from && to) return `${from} → ${to}`;
  return to || from || "—";
}

export function formatTourDate(group) {
  if (!group?.start_date) return null;
  try {
    return new Date(`${group.start_date}T12:00:00`).toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return group.start_date;
  }
}

export function getRelevantAlertsForGroup(alerts, group) {
  if (!group || !alerts?.length) return [];
  const terms = [group.destination, group.starting_location]
    .filter(Boolean)
    .map((s) => s.toLowerCase());

  if (terms.length === 0) return [];

  return alerts.filter((alert) => {
    if (alert.status !== "Active" || alert.is_public === false) return false;
    const loc = `${alert.location || ""} ${alert.affected_area || ""} ${alert.title || ""}`.toLowerCase();
    return terms.some((term) => loc.includes(term) || term.includes(loc.trim()));
  });
}

export function getRelevantDangerWarningsForGroup(warnings, group) {
  if (!group || !warnings?.length) return [];
  const terms = [group.destination, group.starting_location, group.meeting_location]
    .filter(Boolean)
    .map((s) => s.toLowerCase());

  if (terms.length === 0) return [];

  return warnings.filter((warning) => {
    if (warning.status !== "Active" || warning.is_public === false) return false;
    const loc = [
      warning.dangerous_location,
      warning.destination,
      warning.current_location,
      warning.alternative_route,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return terms.some((term) => loc.includes(term) || term.includes(loc.trim()));
  });
}

export function getRelevantRouteAdvisoriesForGroup(advisories, group) {
  if (!group || !advisories?.length) return [];
  const terms = [group.destination, group.starting_location, group.meeting_location]
    .filter(Boolean)
    .map((s) => s.toLowerCase());

  if (terms.length === 0) return [];

  return advisories.filter((advisory) => {
    if (advisory.status !== "Active" || advisory.is_public === false) return false;
    const loc = [
      advisory.title,
      advisory.from_location,
      advisory.to_location,
      advisory.via_location,
      advisory.affected_location,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return terms.some((term) => loc.includes(term) || term.includes(loc.trim()));
  });
}

export const EMPTY_ROUTE_FORM = {
  name: "",
  starting_location: "",
  destination: "",
  trip_info: "",
  start_date: "",
  end_date: "",
  meeting_location: "",
  estimated_travel_time: "",
  destination_notes: "",
};

export function groupToRouteForm(group) {
  if (!group) return { ...EMPTY_ROUTE_FORM };
  return {
    name: group.name || "",
    starting_location: group.starting_location || "",
    destination: group.destination || "",
    trip_info: group.trip_info || "",
    start_date: group.start_date || "",
    end_date: group.end_date || "",
    meeting_location: group.meeting_location || "",
    estimated_travel_time: group.estimated_travel_time || "",
    destination_notes: group.destination_notes || "",
  };
}
