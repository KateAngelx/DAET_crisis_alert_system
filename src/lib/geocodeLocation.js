const cache = new Map();
const NOMINATIM_DELAY_MS = 1100;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function geocodeLocation(locationText) {
  const trimmed = locationText?.trim();
  if (!trimmed) return null;

  const key = trimmed.toLowerCase();
  if (cache.has(key)) return cache.get(key);

  try {
    const locationQuery = `${trimmed}, Daet, Camarines Norte, Philippines`;
    const response = await fetch(`/api/geocode?q=${encodeURIComponent(locationQuery)}`);
    const data = await response.json();

    if (data?.[0]?.lat && data?.[0]?.lon) {
      const coords = [parseFloat(data[0].lat), parseFloat(data[0].lon)];
      cache.set(key, coords);
      return coords;
    }
  } catch (error) {
    console.error("Geocoding failed:", error);
  }

  cache.set(key, null);
  return null;
}

export async function geocodeAlerts(alerts) {
  const resolved = {};

  for (const alert of alerts) {
    if (alert.latitude != null && alert.longitude != null) {
      resolved[alert.id] = [Number(alert.latitude), Number(alert.longitude)];
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
