const cache = new Map();
const pending = new Map();
const NOMINATIM_DELAY_MS = 1100;
export const DEFAULT_GEOCODE_REGION = "Daet, Camarines Norte, Philippines";
let geocodeQueue = Promise.resolve();
let nextGeocodeAt = 0;

/** Stored map coordinates, or null when missing/blank/out of range (never "0, 0" by accident). */
export function parseMapCoordinates(latitude, longitude) {
  if (
    latitude == null ||
    longitude == null ||
    (typeof latitude === "string" && !latitude.trim()) ||
    (typeof longitude === "string" && !longitude.trim())
  ) {
    return null;
  }

  const lat = Number(latitude);
  const lng = Number(longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return null;
  }

  return [lat, lng];
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** OpenStreetMap's search allows about one request per second: every lookup waits its turn. */
function fetchGeocode(endpoint) {
  const request = geocodeQueue.then(async () => {
    const delay = Math.max(0, nextGeocodeAt - Date.now());
    if (delay > 0) await sleep(delay);
    nextGeocodeAt = Date.now() + NOMINATIM_DELAY_MS;
    return fetch(endpoint);
  });
  geocodeQueue = request.then(() => undefined, () => undefined);
  return request;
}

/**
 * Search the given area first, then wider (province, then the whole country), so places
 * outside the town — or names that already include the town — still get a pin.
 * Default area is Daet; routes pass "Camarines Norte, Philippines".
 */
export function buildGeocodeQueries(text, region = DEFAULT_GEOCODE_REGION) {
  const trimmed = String(text || "").trim();
  if (!trimmed) return [];
  const lower = trimmed.toLowerCase();
  const queries = [];
  if (region && region !== DEFAULT_GEOCODE_REGION) {
    const firstPart = region.split(",")[0].trim().toLowerCase();
    if (!lower.includes(firstPart)) queries.push(`${trimmed}, ${region}`);
  } else if (!lower.includes("daet")) {
    queries.push(`${trimmed}, Daet, Camarines Norte, Philippines`);
  }
  if (!lower.includes("camarines") && !queries.includes(`${trimmed}, Camarines Norte, Philippines`)) {
    queries.push(`${trimmed}, Camarines Norte, Philippines`);
  }
  queries.push(lower.includes("philippines") ? trimmed : `${trimmed}, Philippines`);
  return queries;
}

async function requestCoords(trimmed, region) {
  for (const query of buildGeocodeQueries(trimmed, region)) {
    try {
      const response = await fetchGeocode(`/api/geocode?q=${encodeURIComponent(query)}`);
      const data = await response.json();
      const coords = data?.[0] ? parseMapCoordinates(data[0].lat, data[0].lon) : null;
      if (coords) return coords;
    } catch (error) {
      console.error("Geocoding failed:", error);
    }
  }
  return null;
}

export async function geocodeLocation(locationText, region = DEFAULT_GEOCODE_REGION) {
  const trimmed = locationText?.trim();
  if (!trimmed) return null;

  const key = `${region}:${trimmed.toLowerCase()}`;
  if (cache.has(key)) return cache.get(key);

  const inFlight = pending.get(key);
  if (inFlight) return inFlight;

  const request = requestCoords(trimmed, region)
    .then((coords) => {
      if (coords) cache.set(key, coords);
      return coords;
    })
    .finally(() => {
      pending.delete(key);
    });

  pending.set(key, request);
  return request;
}

/** Positions for a list of alerts: stored map pins first, otherwise a (queued) place lookup. */
export async function geocodeAlerts(alerts) {
  const resolved = {};

  for (const alert of alerts) {
    const storedCoordinates = parseMapCoordinates(alert.latitude, alert.longitude);
    if (storedCoordinates) {
      resolved[alert.id] = storedCoordinates;
      continue;
    }

    // The request queue spaces out real lookups; places already found return at once.
    const coords = await geocodeLocation(alert.location);
    if (coords) resolved[alert.id] = coords;
  }

  return resolved;
}
