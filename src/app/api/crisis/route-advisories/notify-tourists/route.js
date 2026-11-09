import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { API_RATE_LIMITS, enforceRateLimitByKey } from "@/lib/apiRateLimit";
import { broadcastRouteAdvisoryToTourists } from "@/lib/routeAdvisoryBroadcast.server";

export async function POST(request) {
  try {
    const auth = await requireAdmin(request);
    if (auth.error) return auth.error;

    const limited = enforceRateLimitByKey(auth.user.id, {
      name: "admin-broadcast",
      ...API_RATE_LIMITS.adminBroadcast,
    });
    if (limited) return limited;

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ error: "A valid JSON object is required" }, { status: 400 });
    }
    const { advisoryId, eventType = "created" } = body;
    if (
      typeof advisoryId !== "string"
      || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(advisoryId)
      || !["created", "updated"].includes(eventType)
    ) {
      return NextResponse.json({ error: "advisoryId and a valid eventType are required" }, { status: 400 });
    }

    const results = await broadcastRouteAdvisoryToTourists(auth.admin, advisoryId, eventType);
    if (results.errors.length && results.notified === 0) {
      return NextResponse.json({ error: results.errors.join("; "), details: results.errors }, { status: 500 });
    }
    return NextResponse.json({ success: true, ...results });
  } catch (error) {
    return NextResponse.json({ error: error.message || "Failed to notify tourists" }, { status: 500 });
  }
}
