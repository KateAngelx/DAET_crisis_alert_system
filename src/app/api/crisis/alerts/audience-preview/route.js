import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { enforceRateLimitByKey } from "@/lib/apiRateLimit";
import { normalizeRadiusKm, normalizeTargetScope } from "@/lib/alertTargeting";
import { narrowRecipientsForAlert, TARGETING_PROFILE_COLUMNS } from "@/lib/alertAudience.server";

/**
 * "About N tourists will get this" for the Command Center, using the same rules as the broadcast.
 * Returns counts only — never names or locations.
 */
export async function POST(request) {
  const auth = await requireAdmin(request);
  if (auth.error) return auth.error;
  const limited = enforceRateLimitByKey(auth.user.id, { name: "alert-audience-preview", limit: 60, windowMs: 60_000 });
  if (limited) return limited;

  const body = await request.json().catch(() => ({}));
  const scope = normalizeTargetScope(body?.target_scope);
  const alert = {
    target_scope: scope,
    target_radius_km: normalizeRadiusKm(body?.target_radius_km),
    latitude: body?.latitude ?? null,
    longitude: body?.longitude ?? null,
    location: String(body?.location || "").slice(0, 300),
    title: String(body?.title || "").slice(0, 300),
  };

  const columns = "id, user_type" + (scope === "all" ? "" : TARGETING_PROFILE_COLUMNS);
  const { data: tourists, error } = await auth.admin
    .from("profiles")
    .select(columns)
    .eq("user_type", "tourist")
    .eq("is_active", true);

  if (error) {
    const notSetUp = error.code === "42703" || error.code === "PGRST204";
    return NextResponse.json({ available: false, reason: notSetUp ? "not_set_up" : "error" }, { status: 200 });
  }

  const total = tourists?.length || 0;
  if (scope === "all") return NextResponse.json({ available: true, total, targeted: total });

  const narrowed = await narrowRecipientsForAlert(auth.admin, tourists || [], alert);
  return NextResponse.json({
    available: true,
    total,
    targeted: narrowed.profiles.length,
    needsPin: scope === "radius" && (alert.latitude == null || alert.longitude == null),
    warning: narrowed.error || null,
  });
}
