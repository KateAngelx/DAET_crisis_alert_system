import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { broadcastDangerousLocationToTourists } from "@/lib/dangerousLocationBroadcast.server";
import { API_RATE_LIMITS, enforceRateLimitByKey } from "@/lib/apiRateLimit";

export async function POST(request) {
  try {
    const auth = await requireAdmin(request);
    if (auth.error) return auth.error;

    const limited = enforceRateLimitByKey(auth.user.id, {
      name: "admin-hazard-broadcast",
      ...API_RATE_LIMITS.adminBroadcast,
    });
    if (limited) return limited;

    const body = await request.json().catch(() => ({}));
    const warningId = body.warningId;

    if (!warningId) {
      return NextResponse.json({ error: "warningId is required" }, { status: 400 });
    }

    const results = await broadcastDangerousLocationToTourists(auth.admin, warningId);

    if (results.errors.length && results.notified === 0) {
      return NextResponse.json({ error: results.errors.join("; ") }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      notified: results.notified,
      skipped: results.skipped,
      emailQueued: results.emailQueued,
      smsQueued: results.smsQueued,
      warnings: results.errors,
    });
  } catch (err) {
    return NextResponse.json({ error: err.message || "Failed to notify tourists" }, { status: 500 });
  }
}
