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

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ error: "A valid JSON object is required" }, { status: 400 });
    }
    const warningId = body.warningId;
    const eventType = body.eventType || "created";

    if (
      typeof warningId !== "string"
      || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(warningId)
      || !["created", "updated"].includes(eventType)
    ) {
      return NextResponse.json({ error: "warningId and a valid eventType are required" }, { status: 400 });
    }

    const results = await broadcastDangerousLocationToTourists(auth.admin, warningId, eventType);

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
