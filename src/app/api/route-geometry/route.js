import { NextResponse } from "next/server";
import { requireAuthenticatedRequest } from "@/lib/apiAuth";
import { API_RATE_LIMITS, enforceRateLimit } from "@/lib/apiRateLimit";

const MAX_WAYPOINTS = 25;

const OSRM_BASE = "https://router.project-osrm.org/route/v1/driving";

function parseWaypointsParam(raw) {
  if (!raw) return [];
  return raw
    .split("|")
    .map((pair) => {
      const [lat, lng] = pair.split(",").map(Number);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
      return { lat, lng };
    })
    .filter(Boolean);
}

/** Downsample dense road geometry for storage while keeping road shape */
function simplifyPath(points, maxPoints = 400) {
  if (points.length <= maxPoints) return points;
  const step = Math.ceil(points.length / maxPoints);
  const simplified = points.filter((_, index) => index % step === 0 || index === points.length - 1);
  return simplified.length >= 2 ? simplified : points.slice(0, maxPoints);
}

async function fetchRoadGeometry(waypoints) {
  if (waypoints.length < 2) return [];

  const osrmCoords = waypoints.map((p) => `${p.lng},${p.lat}`).join(";");
  const url = `${OSRM_BASE}/${osrmCoords}?overview=full&geometries=geojson&steps=false`;

  const response = await fetch(url, {
    headers: { "User-Agent": "CONNECT-DAET-Crisis-Alert-System/1.0" },
    next: { revalidate: 86400 },
  });

  if (!response.ok) {
    throw new Error(`OSRM request failed (${response.status})`);
  }

  const data = await response.json();
  if (data.code !== "Ok" || !data.routes?.[0]?.geometry?.coordinates) {
    throw new Error(data.message || "No drivable route found");
  }

  const coordinates = data.routes[0].geometry.coordinates;
  return simplifyPath(
    coordinates.map(([lng, lat]) => ({ lat, lng }))
  );
}

export async function GET(request) {
  const limited = enforceRateLimit(request, { name: "route-geometry", limit: 30, windowMs: 60_000 });
  if (limited) return limited;

  const auth = await requireAuthenticatedRequest(request);
  if (!auth.ok) return auth.response;

  let waypoints = parseWaypointsParam(request.nextUrl.searchParams.get("points"));
  waypoints = waypoints.slice(0, MAX_WAYPOINTS);

  if (waypoints.length < 2) {
    return NextResponse.json({ error: "At least two waypoints required" }, { status: 400 });
  }

  try {
    const path = await fetchRoadGeometry(waypoints);
    return NextResponse.json({
      path,
      source: "osrm",
      waypointCount: waypoints.length,
      pointCount: path.length,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error.message || "Road routing failed",
        path: waypoints,
        source: "fallback",
      },
      { status: 200 }
    );
  }
}

export async function POST(request) {
  const limited = enforceRateLimit(request, { name: "route-geometry-post", limit: 30, windowMs: 60_000 });
  if (limited) return limited;

  const auth = await requireAuthenticatedRequest(request);
  if (!auth.ok) return auth.response;

  try {
    const body = await request.json().catch(() => ({}));
    let waypoints = Array.isArray(body?.waypoints)
      ? body.waypoints
          .map((p) => ({ lat: Number(p.lat), lng: Number(p.lng) }))
          .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng))
      : [];
    waypoints = waypoints.slice(0, MAX_WAYPOINTS);

    if (waypoints.length < 2) {
      return NextResponse.json({ error: "At least two waypoints required" }, { status: 400 });
    }

    const path = await fetchRoadGeometry(waypoints);
    return NextResponse.json({
      path,
      source: "osrm",
      waypointCount: waypoints.length,
      pointCount: path.length,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Road routing failed" },
      { status: 500 }
    );
  }
}
