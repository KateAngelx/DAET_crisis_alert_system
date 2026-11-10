import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { enforceRateLimitByKey } from "@/lib/apiRateLimit";

const CRISIS_OPERATION_NOTIFICATION_TYPES = {
  commandCenter: ["alert", "guide_emergency"],
  roadsHazards: ["dangerous_location", "route_advisory"],
  incidentReports: ["incident"],
  guideAssistance: ["tourist_guide_assistance"],
  crisisFeedback: ["crisis_feedback"],
};

async function countUnreadNotifications(admin, userId, relatedTypes) {
  const { count, error } = await admin
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("is_read", false)
    .in("related_type", relatedTypes);
  if (error) throw error;
  return count || 0;
}

export async function GET(request) {
  try {
    const auth = await requireAdmin(request);
    if (auth.error) return auth.error;

    const limited = enforceRateLimitByKey(auth.user.id, {
      name: "admin-crisis-navigation-unread",
      limit: 60,
      windowMs: 60_000,
    });
    if (limited) return limited;

    const entries = await Promise.all(
      Object.entries(CRISIS_OPERATION_NOTIFICATION_TYPES).map(async ([key, relatedTypes]) => [
        key,
        await countUnreadNotifications(auth.admin, auth.user.id, relatedTypes),
      ])
    );

    return NextResponse.json(
      { counts: Object.fromEntries(entries) },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("[DashboardNavigationCounts] Failed to load unread notifications:", error);
    return NextResponse.json(
      { error: "Unable to load unread crisis-operation notifications." },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
