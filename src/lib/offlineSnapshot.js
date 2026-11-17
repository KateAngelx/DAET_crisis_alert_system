/**
 * Keeps the latest public crisis information on the phone so it can still be read offline:
 * active alerts, area hazards and road advisories. Only public fields are saved.
 */

const STORAGE_KEY = "connect-daet:offline-snapshot:v1";
const MAX_ITEMS = 40;
const PARTS = ["alerts", "hazards", "roads"];

function isActive(status) {
  return String(status || "active").toLowerCase() === "active";
}

const PICKERS = {
  alerts: (a) => ({
    id: a.id,
    title: a.title,
    message: a.message,
    severity: a.severity,
    type: a.type,
    location: a.location,
    status: a.status,
    latitude: a.latitude ?? null,
    longitude: a.longitude ?? null,
    published_at: a.published_at || a.created_at || null,
  }),
  hazards: (w) => ({
    id: w.id,
    dangerous_location: w.dangerous_location,
    danger_type: w.danger_type,
    severity: w.severity,
    alternative_route: w.alternative_route,
    destination: w.destination,
    safety_instructions: w.safety_instructions,
    status: w.status,
    created_at: w.created_at || null,
  }),
  roads: (r) => ({
    id: r.id,
    title: r.title,
    route_status: r.route_status,
    from_location: r.from_location,
    to_location: r.to_location,
    via_location: r.via_location,
    reason: r.reason,
    safety_instructions: r.safety_instructions,
    status: r.status,
    created_at: r.created_at || null,
  }),
};

/** Only active, public records are kept for offline reading. */
export function selectOfflineItems(part, records = []) {
  const pick = PICKERS[part];
  if (!pick) return [];
  return (records || [])
    .filter((r) => r && r.is_public !== false && isActive(r.status))
    .slice(0, MAX_ITEMS)
    .map(pick);
}

function readAll(storage) {
  try {
    const raw = storage?.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function defaultStorage() {
  try {
    return typeof window !== "undefined" ? window.localStorage : null;
  } catch {
    return null;
  }
}

/** Save the latest records for one part ("alerts" | "hazards" | "roads"). Never throws. */
export function saveOfflineSnapshot(part, records, { storage = defaultStorage(), now = Date.now() } = {}) {
  if (!PARTS.includes(part) || !storage) return;
  try {
    const all = readAll(storage);
    all[part] = { items: selectOfflineItems(part, records), savedAt: new Date(now).toISOString() };
    storage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch {
    /* storage full or blocked: offline copy is a convenience only */
  }
}

/** @returns {{ items: object[], savedAt: string } | null} */
export function loadOfflineSnapshot(part, { storage = defaultStorage() } = {}) {
  const entry = readAll(storage)[part];
  return entry && Array.isArray(entry.items) ? entry : null;
}

/** True when an error looks like "no connection" rather than a server problem. */
export function isConnectionError(error) {
  if (typeof navigator !== "undefined" && navigator.onLine === false) return true;
  const message = String(error?.message || error || "").toLowerCase();
  return /failed to fetch|networkerror|network request failed|load failed|fetch failed|err_internet_disconnected/.test(message);
}
