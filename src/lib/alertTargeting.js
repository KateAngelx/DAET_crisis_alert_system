/** Who a crisis alert reaches: everyone, tourists in Daet now, or tourists near the alert's area. */

export const ALERT_TARGET_SCOPES = ["all", "in_daet", "area", "radius"];

export const ALERT_TARGET_OPTIONS = [
  {
    value: "all",
    label: "Everyone",
    description: "All registered tourists (recommended for Critical alerts).",
  },
  {
    value: "in_daet",
    label: "Tourists in Daet now",
    description: "Shared location in Daet, visit dates or an active tour today, or used the app in the last 2 days.",
  },
  {
    value: "radius",
    label: "Within a distance of the alert pin",
    description: "Tourists whose shared location is near the pin, plus tourists in Daet now whose location is unknown.",
  },
  {
    value: "area",
    label: "Tourists near this area",
    description: "Tourists in active tour groups going to or starting from this location.",
  },
];

/** Someone who used the app this recently is treated as being in Daet. */
export const RECENT_ACTIVITY_MS = 2 * 24 * 60 * 60 * 1000;

/** Shared positions older than this are ignored (and deleted by the hourly job). */
export const LOCATION_MAX_AGE_MS = 48 * 60 * 60 * 1000;
export const RADIUS_CHOICES_KM = [1, 2, 3, 5, 10];
export const DEFAULT_RADIUS_KM = 3;

/** Daet town center and a radius that covers the municipality, including Bagasbas. */
export const DAET_CENTER = [14.1122, 122.9553];
export const DAET_RADIUS_KM = 10;

/** Saved positions are rounded to about 100 m. */
export function roundCoordinate(value) {
  return Math.round(Number(value) * 1000) / 1000;
}

/** Great-circle distance in kilometres between two [lat, lng] points. */
export function distanceKm(a, b) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(b[0] - a[0]);
  const dLng = toRad(b[1] - a[1]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a[0])) * Math.cos(toRad(b[0])) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

/** The tourist's shared position if it is recent enough to trust, else null. */
export function freshLocation(profile, nowMs = Date.now()) {
  const loc = profile?.location;
  if (!loc) return null;
  const at = Date.parse(loc.recorded_at);
  const lat = Number(loc.latitude);
  const lng = Number(loc.longitude);
  if (!Number.isFinite(at) || nowMs - at > LOCATION_MAX_AGE_MS) return null;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return [lat, lng];
}

export function normalizeRadiusKm(value) {
  const km = Number(value);
  if (!Number.isFinite(km)) return DEFAULT_RADIUS_KM;
  return Math.min(50, Math.max(0.5, km));
}

function alertPin(alert) {
  const lat = Number(alert?.latitude);
  const lng = Number(alert?.longitude);
  return alert?.latitude != null && alert?.longitude != null && Number.isFinite(lat) && Number.isFinite(lng)
    ? [lat, lng]
    : null;
}

export function normalizeTargetScope(scope) {
  return ALERT_TARGET_SCOPES.includes(scope) ? scope : "all";
}

/** Today's date in the Philippines as YYYY-MM-DD (dates in the app are PH dates). */
export function philippineDate(nowMs = Date.now()) {
  return new Date(nowMs + 8 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

function coversDate(start, end, today) {
  if (!start && !end) return false;
  return (!start || start <= today) && (!end || end >= today);
}

/** An active tour group running today (open-ended dates count as running). */
export function isTourGroupRunning(group, today) {
  if (!group || group.status !== "active") return false;
  if (!group.start_date && !group.end_date) return true;
  return coversDate(group.start_date, group.end_date, today);
}

/**
 * Whether a tourist counts as being in Daet now.
 * @param {object} profile  needs visit_start_date, visit_end_date, last_seen_at
 * @param {object[]} groups the tourist's tour groups (status, start_date, end_date)
 */
export function isTouristInDaetNow(profile, groups = [], nowMs = Date.now()) {
  const position = freshLocation(profile, nowMs);
  if (position && distanceKm(position, DAET_CENTER) <= DAET_RADIUS_KM) return true;
  const today = philippineDate(nowMs);
  if (coversDate(profile?.visit_start_date, profile?.visit_end_date, today)) return true;
  if (groups.some((group) => isTourGroupRunning(group, today))) return true;
  const lastSeen = profile?.last_seen_at ? Date.parse(profile.last_seen_at) : NaN;
  return Number.isFinite(lastSeen) && nowMs - lastSeen <= RECENT_ACTIVITY_MS;
}

/** Word-level match between a tour group's places and the alert's location text. */
export function groupMatchesAlertArea(group, alert) {
  const places = [group?.destination, group?.starting_location, group?.meeting_location]
    .map((s) => String(s || "").toLowerCase().trim())
    .filter((s) => s.length >= 3);
  const location = String(alert?.location || "").toLowerCase().trim();
  const area = `${location} ${String(alert?.title || "").toLowerCase()}`;
  if (!places.length || !area.trim()) return false;
  // "Bagasbas" matches "Bagasbas Beach"; "Bagasbas Beach, Daet" matches "Bagasbas".
  return places.some((place) => area.includes(place) || (location.length >= 3 && place.includes(location)));
}

/**
 * Decide whether one tourist should get this alert.
 * @param {string} scope "all" | "in_daet" | "area"
 */
export function touristMatchesAlertTarget({ scope, profile, groups = [], alert, nowMs = Date.now() }) {
  const target = normalizeTargetScope(scope);
  if (target === "all") return true;
  if (target === "in_daet") return isTouristInDaetNow(profile, groups, nowMs);
  if (target === "radius") {
    const pin = alertPin(alert);
    // No map pin on the alert: fall back to everyone in Daet now.
    if (!pin) return isTouristInDaetNow(profile, groups, nowMs);
    const position = freshLocation(profile, nowMs);
    if (position) return distanceKm(position, pin) <= normalizeRadiusKm(alert?.target_radius_km);
    // Location unknown: include them if they are in Daet now, so nobody nearby is missed.
    return isTouristInDaetNow(profile, groups, nowMs);
  }
  const today = philippineDate(nowMs);
  return groups.some((group) => isTourGroupRunning(group, today) && groupMatchesAlertArea(group, alert));
}

/** Validate dates a tourist enters in Profile. Returns an error message or null. */
export function validateVisitDates(
  start,
  end,
  { originalStart = null, originalEnd = null, nowMs = Date.now() } = {}
) {
  const pattern = /^\d{4}-\d{2}-\d{2}$/;
  if (!start && !end) return null;
  if ((start && !pattern.test(start)) || (end && !pattern.test(end))) return "Use valid dates.";
  const today = philippineDate(nowMs);
  if (start && start < today && start !== originalStart) {
    return "Arrival can't be in the past.";
  }
  if (end && end < today && end !== originalEnd) {
    return "Your leave date can't be in the past.";
  }
  if (start && end && end < start) return "The leave date must be on or after the arrival date.";
  const yearMs = 365 * 24 * 60 * 60 * 1000;
  if (end && end < philippineDate(nowMs - yearMs)) return "That visit ended over a year ago.";
  if (start && start > philippineDate(nowMs + 2 * yearMs)) return "Arrival must be within the next two years.";
  return null;
}
