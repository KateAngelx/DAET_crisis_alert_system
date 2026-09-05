/** Route path geometry: waypoints, polylines, GPX export */

import { geocodeLocation } from "@/lib/geocodeLocation";

function normalizePathInput(raw) {
  if (!raw) return [];
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }
  return raw;
}

export function parseRoutePath(source) {
  const raw = normalizePathInput(source?.route_path ?? source);
  if (!Array.isArray(raw) || raw.length < 2) return [];

  return raw
    .map((point) => {
      if (Array.isArray(point)) {
        const lat = Number(point[0]);
        const lng = Number(point[1]);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
        return [lat, lng];
      }

      const lat = Number(point.lat ?? point.latitude);
      const lng = Number(point.lng ?? point.longitude);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
      return [lat, lng];
    })
    .filter(Boolean);
}

export function serializeRoutePath(points) {
  if (!Array.isArray(points)) return [];

  return points
    .map((point) => {
      if (Array.isArray(point)) {
        const lat = Number(point[0]);
        const lng = Number(point[1]);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
        return { lat, lng };
      }

      const lat = Number(point.lat ?? point.latitude);
      const lng = Number(point.lng ?? point.longitude);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
      return { lat, lng };
    })
    .filter(Boolean);
}

export function hasRoutePath(source) {
  return parseRoutePath(source).length >= 2;
}

/** Paths with only endpoint waypoints are straight-line segments */
export function isLikelyStraightLinePath(source) {
  const points = serializeRoutePath(source?.route_path ?? source);
  return points.length > 0 && points.length <= 3;
}

function sameCoords(a, b) {
  if (!a || !b) return false;
  return Math.abs(a.lat - b.lat) < 0.00001 && Math.abs(a.lng - b.lng) < 0.00001;
}

async function geocodeEndpointWaypoints({ from, to, via }) {
  const startLabel = from?.trim();
  const endLabel = to?.trim();
  const viaLabel = via?.trim();

  if (!startLabel && !endLabel) return [];

  const waypoints = [];

  if (startLabel) {
    const fromCoords = await geocodeLocation(startLabel);
    if (fromCoords) waypoints.push({ lat: fromCoords[0], lng: fromCoords[1] });
  }

  if (viaLabel) {
    const viaCoords = await geocodeLocation(viaLabel);
    if (viaCoords) {
      const point = { lat: viaCoords[0], lng: viaCoords[1] };
      if (!sameCoords(waypoints[waypoints.length - 1], point)) waypoints.push(point);
    }
  }

  if (endLabel) {
    const toCoords = await geocodeLocation(endLabel);
    if (toCoords) {
      const point = { lat: toCoords[0], lng: toCoords[1] };
      if (!sameCoords(waypoints[waypoints.length - 1], point)) waypoints.push(point);
    }
  }

  return waypoints.length >= 2 ? waypoints : [];
}

import { getActiveSession } from "@/lib/authSession";

/** Snap waypoints to drivable roads using OSRM via our API route */
export async function snapWaypointsToRoads(waypoints) {
  if (!Array.isArray(waypoints) || waypoints.length < 2) return [];

  const normalized = serializeRoutePath(waypoints);
  if (normalized.length < 2) return [];

  try {
    const pointsParam = normalized.map((p) => `${p.lat},${p.lng}`).join("|");
    const session = await getActiveSession();
    const headers = session?.access_token
      ? { Authorization: `Bearer ${session.access_token}` }
      : {};
    const response = await fetch(`/api/route-geometry?points=${encodeURIComponent(pointsParam)}`, { headers });
    const data = await response.json();

    if (Array.isArray(data.path) && data.path.length >= 2) {
      return serializeRoutePath(data.path);
    }
  } catch {
    /* fall through to straight line */
  }

  return normalized;
}

/** Geocode From → Via? → To, then snap to actual road geometry */
export async function buildRoutePathFromLocations({ from, to, via }) {
  const waypoints = await geocodeEndpointWaypoints({ from, to, via });
  if (waypoints.length < 2) return [];

  const roadPath = await snapWaypointsToRoads(waypoints);
  return roadPath.length >= 2 ? roadPath : waypoints;
}

/** Rebuild road path for advisories stored with straight-line geometry */
export async function ensureRoadSnappedPath(advisory) {
  if (!advisory) return [];

  const existing = serializeRoutePath(advisory.route_path);
  if (existing.length > 3) return existing;

  return buildRoutePathFromLocations({
    from: advisory.from_location,
    to: advisory.to_location,
    via: advisory.via_location,
  });
}

export function getRoutePolylineStyle(advisory) {
  const status = advisory?.route_status;
  const type = advisory?.route_type;

  if (type === "alternative" || status === "Safe") {
    return { color: "#16a34a", weight: 5, dashArray: null, opacity: 0.85 };
  }
  if (status === "Caution") {
    return { color: "#f97316", weight: 5, dashArray: "10 8", opacity: 0.9 };
  }
  if (status === "Closed") {
    return { color: "#dc2626", weight: 5, dashArray: null, opacity: 0.9 };
  }
  return { color: "#2563eb", weight: 4, dashArray: null, opacity: 0.8 };
}

function escapeXml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function buildGpxFromAdvisory(advisory, name) {
  const points = parseRoutePath(advisory);
  if (points.length < 2) return null;

  const trackName = name || advisory?.title || "Route advisory";
  const trkpts = points
    .map(([lat, lng]) => `      <trkpt lat="${lat}" lon="${lng}"></trkpt>`)
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="DAET Crisis Alert System">
  <trk>
    <name>${escapeXml(trackName)}</name>
    <trkseg>
${trkpts}
    </trkseg>
  </trk>
</gpx>`;
}

export function downloadGpx(filename, content) {
  if (typeof window === "undefined" || !content) return;

  const blob = new Blob([content], { type: "application/gpx+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename.endsWith(".gpx") ? filename : `${filename}.gpx`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function getRoutePathBounds(advisories = []) {
  const coords = advisories.flatMap((a) => parseRoutePath(a));
  if (coords.length === 0) return null;

  let minLat = coords[0][0];
  let maxLat = coords[0][0];
  let minLng = coords[0][1];
  let maxLng = coords[0][1];

  coords.forEach(([lat, lng]) => {
    minLat = Math.min(minLat, lat);
    maxLat = Math.max(maxLat, lat);
    minLng = Math.min(minLng, lng);
    maxLng = Math.max(maxLng, lng);
  });

  return [
    [minLat, minLng],
    [maxLat, maxLng],
  ];
}

export function suggestRouteTitle(from, to, via) {
  const start = from?.trim();
  const end = to?.trim();
  const middle = via?.trim();
  if (start && end && middle) return `${start} → ${end} via ${middle}`;
  if (start && end) return `${start} → ${end}`;
  return end || start || "";
}
