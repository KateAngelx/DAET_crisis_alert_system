const cache = new Map();
const pending = new Map();
const NOMINATIM_DELAY_MS = 1100;

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

async function requestCoords(trimmed) {
  const locationQuery = `${trimmed}, Daet, Camarines Norte, Philippines`;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const response = await fetch(`/api/geocode?q=${encodeURIComponent(locationQuery)}`);
      const data = await response.json();

      if (data?.[0]?.lat && data?.[0]?.lon) {
        return [parseFloat(data[0].lat), parseFloat(data[0].lon)];
      }
    } catch (error) {
      console.error("Geocoding failed:", error);
    }

    if (attempt === 0) await sleep(NOMINATIM_DELAY_MS);
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
    const storedCoordinates = parseMapCoordinates(alert.latitude, alert.longitude);
    if (storedCoordinates) {
      resolved[alert.id] = storedCoordinates;
      continue;
    }

    const coords = await geocodeLocation(alert.location);
    if (coords) resolved[alert.id] = coords;

    if (alerts.length > 1) {
      await sleep(NOMINATIM_DELAY_MS);
    }
  }

  return resolved;
}
