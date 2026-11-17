import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { requireAuthenticatedRequest } from "@/lib/apiAuth";
import { enforceRateLimitByKey } from "@/lib/apiRateLimit";
import { roundCoordinate } from "@/lib/alertTargeting";

const LOCATION_LIMIT = { limit: 30, windowMs: 60 * 60_000 };

function readCoords(body) {
  const lat = Number(body?.latitude);
  const lng = Number(body?.longitude);
  if (body?.latitude == null || body?.longitude == null) return null;
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  return { latitude: roundCoordinate(lat), longitude: roundCoordinate(lng) };
}

function notSetUp(error) {
  return ["42703", "PGRST204", "42P01", "PGRST205"].includes(error?.code);
}

async function loadTourist(admin, userId) {
  const { data, error } = await admin
    .from("profiles")
    .select("user_type, location_sharing_enabled")
    .eq("id", userId)
    .maybeSingle();
  return { profile: data, error };
}

async function saveLocation(admin, userId, coords) {
  return admin
    .from("tourist_locations")
    .upsert({ user_id: userId, ...coords, recorded_at: new Date().toISOString() }, { onConflict: "user_id" });
}

/** Turn location sharing on or off. Off deletes the saved position immediately. */
export async function PATCH(request) {
  const auth = await requireAuthenticatedRequest(request);
  if (!auth.ok) return auth.response;
  const body = await request.json().catch(() => null);
  if (typeof body?.enabled !== "boolean") {
    return NextResponse.json({ error: "Say whether location sharing is on or off." }, { status: 400 });
  }
  const admin = getSupabaseAdmin();
  if (!admin) return NextResponse.json({ error: "Location sharing is temporarily unavailable." }, { status: 503 });

  const { profile, error: profileError } = await loadTourist(admin, auth.user.id);
  if (profileError) {
    return NextResponse.json(
      { error: notSetUp(profileError) ? "Location sharing is not set up yet." : "Could not load your profile." },
      { status: notSetUp(profileError) ? 503 : 500 }
    );
  }
  if (profile?.user_type !== "tourist") {
    return NextResponse.json({ error: "Location sharing is for tourist accounts." }, { status: 403 });
  }

  const { error: flagError } = await admin
    .from("profiles")
    .update({ location_sharing_enabled: body.enabled })
    .eq("id", auth.user.id);
  if (flagError) return NextResponse.json({ error: "Could not update location sharing." }, { status: 500 });

  if (!body.enabled) {
    await admin.from("tourist_locations").delete().eq("user_id", auth.user.id);
    return NextResponse.json({ success: true, enabled: false });
  }

  const coords = readCoords(body);
  if (coords) {
    const { error } = await saveLocation(admin, auth.user.id, coords);
    if (error) return NextResponse.json({ error: "Sharing is on, but your location could not be saved." }, { status: 500 });
  }
  return NextResponse.json({ success: true, enabled: true, saved: Boolean(coords) });
}

/** Save the current (rounded) position while sharing is on. */
export async function POST(request) {
  const auth = await requireAuthenticatedRequest(request);
  if (!auth.ok) return auth.response;
  const limited = enforceRateLimitByKey(auth.user.id, { name: "tourist-location", ...LOCATION_LIMIT });
  if (limited) return limited;

  const coords = readCoords(await request.json().catch(() => null));
  if (!coords) return NextResponse.json({ error: "A valid location is required." }, { status: 400 });

  const admin = getSupabaseAdmin();
  if (!admin) return NextResponse.json({ error: "Location sharing is temporarily unavailable." }, { status: 503 });

  const { profile, error: profileError } = await loadTourist(admin, auth.user.id);
  if (profileError) return NextResponse.json({ error: "Location sharing is not available." }, { status: 503 });
  if (profile?.user_type !== "tourist" || !profile.location_sharing_enabled) {
    return NextResponse.json({ error: "Location sharing is off." }, { status: 409 });
  }

  const { error } = await saveLocation(admin, auth.user.id, coords);
  if (error) return NextResponse.json({ error: "Could not save your location." }, { status: 500 });
  return NextResponse.json({ success: true });
}
