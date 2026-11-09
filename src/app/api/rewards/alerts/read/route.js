import { NextResponse } from "next/server";
import { requireTourist } from "@/lib/touristAuth";
import { dispatchNotificationServer } from "@/lib/notificationDispatch.server";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request) {
  const auth = await requireTourist(request);
  if (auth.error) return auth.error;

  const body = await request.json().catch(() => null);
  if (!UUID_PATTERN.test(body?.alertId || "")) {
    return NextResponse.json({ error: "A valid alert ID is required." }, { status: 400 });
  }

  const { data, error } = await auth.admin.rpc("award_alert_read_points", {
    p_user_id: auth.user.id,
    p_alert_id: body.alertId,
  });

  if (error) {
    console.error("[Rewards] Alert-reading award failed:", error.message);
    return NextResponse.json({ error: "Could not record this advisory as read." }, { status: 500 });
  }

  let notificationWarning = null;
  if (data?.status === "awarded") {
    const delivery = await dispatchNotificationServer({
      userId: auth.user.id,
      title: "Points awarded",
      message: `You earned ${data.points} points for reading a crisis alert.`,
      notificationType: "points_awarded",
      priority: "NORMAL",
      relatedType: "alert",
      relatedId: body.alertId,
      eventKey: `alert-read-reward:${auth.user.id}:${body.alertId}`,
      channels: ["web"],
    });
    if (delivery.errors.length) notificationWarning = delivery.errors.join("; ");
  }

  return NextResponse.json({ success: true, result: data, notificationWarning });
}
