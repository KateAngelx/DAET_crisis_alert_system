import { NextResponse } from "next/server";
import { requireTourist } from "@/lib/touristAuth";
import { dispatchNotificationServer } from "@/lib/notificationDispatch.server";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ACTIVITY_TYPES = new Set(["road_view", "hazard_view"]);

export async function POST(request) {
  const auth = await requireTourist(request);
  if (auth.error) return auth.error;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "Request body must be an object." }, { status: 400 });
  }
  if (Object.keys(body).some((field) => !["advisoryId", "activityType"].includes(field))) {
    return NextResponse.json({ error: "The request contains unsupported fields." }, { status: 400 });
  }
  if (typeof body.advisoryId !== "string" || !UUID_PATTERN.test(body.advisoryId)) {
    return NextResponse.json({ error: "A valid advisory ID is required." }, { status: 400 });
  }
  if (!ACTIVITY_TYPES.has(body.activityType)) {
    return NextResponse.json({ error: "A valid travel advisory activity is required." }, { status: 400 });
  }

  const { data, error } = await auth.admin.rpc("award_travel_advisory_view_points", {
    p_user_id: auth.user.id,
    p_advisory_id: body.advisoryId,
    p_activity_type: body.activityType,
  });

  if (error) {
    console.error("[Rewards] Travel advisory view award failed:", error.message);
    return NextResponse.json({ error: "Could not record this travel information view." }, { status: 500 });
  }

  let notificationWarning = null;
  if (data?.status === "awarded") {
    const delivery = await dispatchNotificationServer({
      userId: auth.user.id,
      title: "Points awarded",
      message: `You earned ${data.points} points for reviewing travel information.`,
      notificationType: "points_awarded",
      priority: "NORMAL",
      relatedType: "route_advisory",
      relatedId: body.advisoryId,
      eventKey: `travel-advisory-reward:${auth.user.id}:${body.advisoryId}`,
      channels: ["web"],
    });
    if (delivery.errors.length) notificationWarning = delivery.errors.join("; ");
  }

  return NextResponse.json({ success: true, result: data, notificationWarning });
}
