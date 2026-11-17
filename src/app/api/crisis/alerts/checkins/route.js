import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { isCheckinsNotSetUp, loadCheckinOverview } from "@/lib/alertCheckins.server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Check-in counts and the people who need help, for one alert. */
export async function GET(request) {
  const auth = await requireAdmin(request);
  if (auth.error) return auth.error;
  const alertId = request.nextUrl.searchParams.get("alertId") || "";
  if (!UUID.test(alertId)) return NextResponse.json({ error: "A valid alert ID is required." }, { status: 400 });

  const overview = await loadCheckinOverview(auth.admin, alertId);
  if (overview.error) {
    return NextResponse.json(
      { available: false, error: isCheckinsNotSetUp(overview.error) ? "not_set_up" : "Could not load check-ins." },
      { status: isCheckinsNotSetUp(overview.error) ? 200 : 500 }
    );
  }
  return NextResponse.json({ available: true, ...overview });
}

/** Mark a "needs help" / "missing" person as handled (or not). */
export async function PATCH(request) {
  const auth = await requireAdmin(request);
  if (auth.error) return auth.error;
  const body = await request.json().catch(() => null);
  if (!UUID.test(body?.alertId || "") || !UUID.test(body?.userId || "") || typeof body?.handled !== "boolean") {
    return NextResponse.json({ error: "alertId, userId and handled are required." }, { status: 400 });
  }
  const { error } = await auth.admin
    .from("crisis_alert_checkins")
    .update({
      handled_at: body.handled ? new Date().toISOString() : null,
      handled_by: body.handled ? auth.user.id : null,
    })
    .eq("alert_id", body.alertId)
    .eq("user_id", body.userId);
  if (error) return NextResponse.json({ error: "Could not update." }, { status: 500 });
  return NextResponse.json({ success: true });
}
