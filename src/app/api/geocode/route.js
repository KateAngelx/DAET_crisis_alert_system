import { NextResponse } from "next/server";
import { API_RATE_LIMITS, enforceRateLimit } from "@/lib/apiRateLimit";

const MAX_QUERY_LEN = 200;

export async function GET(request) {
  const limited = enforceRateLimit(request, { name: "geocode", ...API_RATE_LIMITS.geocode });
  if (limited) return limited;

  const params = request.nextUrl.searchParams;
  const rawLat = params.get("lat");
  const rawLon = params.get("lon");
  const lat = Number(rawLat);
  const lon = Number(rawLon);
  // Number(null) is 0, so a plain name search must not be treated as a reverse lookup at 0,0.
  const hasReverse =
    rawLat !== null && rawLat.trim() !== "" &&
    rawLon !== null && rawLon.trim() !== "" &&
    Number.isFinite(lat) &&
    Number.isFinite(lon) &&
    lat >= -90 &&
    lat <= 90 &&
    lon >= -180 &&
    lon <= 180;
  const query = request.nextUrl.searchParams.get("q")?.trim().slice(0, MAX_QUERY_LEN);
  if (!hasReverse && !query) {
    return NextResponse.json({ error: "Missing query" }, { status: 400 });
  }

  try {
    const endpoint = hasReverse
      ? `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`
      : `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`;
    const response = await fetch(
      endpoint,
      {
        headers: {
          "Accept-Language": "en",
          "User-Agent": "CONNECT-DAET-Crisis-Alert-System/1.0 (Daet Municipal Tourism Office; crisis@connect-daet.ai)",
        },
        next: { revalidate: 86400 },
      }
    );

    const text = await response.text();
    if (!response.ok) {
      return NextResponse.json({ error: text || "Geocoding failed" }, { status: response.status });
    }

    return NextResponse.json(JSON.parse(text));
  } catch (error) {
    return NextResponse.json({ error: error.message || "Geocoding failed" }, { status: 500 });
  }
}
