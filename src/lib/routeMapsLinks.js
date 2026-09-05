/**
 * Build Google Maps URLs for route advisories.
 * Uses coordinates when available, otherwise falls back to place-name search.
 */

function encodePlace(label) {
  return encodeURIComponent(String(label).trim());
}

export function buildGoogleMapsDestinationUrl({ latitude, longitude, label }) {
  if (latitude != null && longitude != null) {
    return `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;
  }
  if (label?.trim()) {
    return `https://www.google.com/maps/dir/?api=1&destination=${encodePlace(label)}`;
  }
  return null;
}

export function getRouteMapsLinks(route) {
  const advisory = route?.advisory || route?.warning;
  if (!advisory) {
    return { primary: null, alternative: null, destination: null };
  }

  const isAlternativeView = route.view === "alternative";

  const primary = isAlternativeView
    ? buildGoogleMapsDestinationUrl({
        latitude: advisory.latitude,
        longitude: advisory.longitude,
        label: advisory.via_location
          ? `${advisory.via_location} → ${advisory.to_location}`
          : advisory.to_location,
      })
    : buildGoogleMapsDestinationUrl({
        latitude: advisory.latitude,
        longitude: advisory.longitude,
        label: advisory.affected_location || advisory.title,
      });

  const alternative = buildGoogleMapsDestinationUrl({
    latitude: advisory.latitude,
    longitude: advisory.longitude,
    label: advisory.via_location
      ? `${advisory.via_location}, ${advisory.to_location}`
      : advisory.to_location,
  });

  const destination = buildGoogleMapsDestinationUrl({
    label: advisory.to_location,
  });

  return { primary, alternative, destination };
}

export function getPrimaryMapsLink(route) {
  const links = getRouteMapsLinks(route);
  if (route?.view === "alternative") {
    return links.primary || links.alternative || links.destination;
  }
  if (route?.view === "safe") {
    return links.primary || links.destination;
  }
  if (route?.view === "caution" || route?.view === "affected") {
    return links.alternative || links.primary || links.destination;
  }
  return links.primary || links.alternative || links.destination;
}
