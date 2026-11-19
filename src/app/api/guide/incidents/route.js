import { NextResponse } from "next/server";
import { requireGuide } from "@/lib/guideAuth";
import { enforceRateLimitByKey } from "@/lib/apiRateLimit";
import { listGuideVisibleIncidents } from "@/lib/guideIncidentAccess.server";

export async function GET(request) {
  try {
    const auth = await requireGuide(request);
    if (auth.error) return auth.error;

    const limited = enforceRateLimitByKey(auth.user.id, {
      name: "guide-incident-list",
      limit: 60,
      windowMs: 60_000,
    });
    if (limited) return limited;

    const incidents = await listGuideVisibleIncidents(auth.admin, auth.user.id);
    return NextResponse.json(
      { success: true, incidents },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Unable to load your reports." },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}