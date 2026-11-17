const cache = new Map();
const pending = new Map();
const NOMINATIM_DELAY_MS = 1100;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Search Daet first, then the province, then the whole country, so places outside the
 * town (or names that already include "Daet") still get a pin instead of none.
 */
export function buildGeocodeQueries(text) {
  const trimmed = String(text || "").trim();
  if (!trimmed) return [];
  const lower = trimmed.toLowerCase();
  const queries = [];
  if (!lower.includes("daet")) queries.push(`${trimmed}, Daet, Camarines Norte, Philippines`);
  if (!lower.includes("camarines")) queries.push(`${trimmed}, Camarines Norte, Philippines`);
  queries.push(lower.includes("philippines") ? trimmed : `${trimmed}, Philippines`);
  return queries;
}

async function requestCoords(trimmed) {
  const queries = buildGeocodeQueries(trimmed);

  for (let index = 0; index < queries.length; index += 1) {
    try {
      const response = await fetch(`/api/geocode?q=${encodeURIComponent(queries[index])}`);
      const data = await response.json();

      if (data?.[0]?.lat && data?.[0]?.lon) {
        return [parseFloat(data[0].lat), parseFloat(data[0].lon)];
      }
    } catch (error) {
      console.error("Geocoding failed:", error);
    }

    // OpenStreetMap's search service allows about one request per second.
    if (index < queries.length - 1) await sleep(NOMINATIM_DELAY_MS);
  }

  return null;
}

export async function geocodeLocation(locationText) {
  const trimmed = locationText?.trim();
  if (!trimmed) return null;

  const key = trimmed.toLowerCase();
  if (cache.has(key)) return cache.get(key);

  const inFlight = pending.get(key);
  if (inFlight) return inFlight;

  const request = requestCoords(trimmed)
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

export async function geocodeAlerts(alerts) {
  const resolved = {};

  for (const alert of alerts) {
    if (alert.latitude != null && alert.longitude != null) {
      resolved[alert.id] = [Number(alert.latitude), Number(alert.longitude)];
      continue;
    }

    const key = alert.location?.trim().toLowerCase();
    const alreadyKnown = Boolean(key) && cache.has(key);
    const coords = await geocodeLocation(alert.location);
    if (coords) resolved[alert.id] = coords;

    // Only pause after a real network lookup; places already found need no wait.
    if (alerts.length > 1 && !alreadyKnown) {
      await sleep(NOMINATIM_DELAY_MS);
    }
  }

  return resolved;
}
