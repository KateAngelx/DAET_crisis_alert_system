import { NextResponse } from "next/server";
import { requireTourist } from "@/lib/touristAuth";
import { enforceRateLimitByKey } from "@/lib/apiRateLimit";
import { alertAcceptsCheckins, validateCheckin } from "@/lib/alertCheckins";
import { isCheckinsNotSetUp, loadAlert, notifyUrgentCheckin, saveCheckin } from "@/lib/alertCheckins.server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** A tourist's own answer on an alert. */
export async function GET(request) {
  const auth = await requireTourist(request);
  if (auth.error) return auth.error;
  const alertId = request.nextUrl.searchParams.get("alertId") || "";
  if (!UUID.test(alertId)) return NextResponse.json({ error: "A valid alert ID is required." }, { status: 400 });

  const { data, error } = await auth.admin
    .from("crisis_alert_checkins")
    .select("status, note, updated_at")
    .eq("alert_id", alertId)
    .eq("user_id", auth.user.id)
    .maybeSingle();
  if (error) return NextResponse.json({ checkin: null, available: !isCheckinsNotSetUp(error) });
  return NextResponse.json({ checkin: data || null, available: true });
}

/** "I'm safe", "I need help" or "Evacuated" on an alert that asks for check-ins. */
export async function POST(request) {
  const auth = await requireTourist(request);
  if (auth.error) return auth.error;
  const limited = enforceRateLimitByKey(auth.user.id, { name: "alert-checkin", limit: 20, windowMs: 60 * 60_000 });
  if (limited) return limited;

  const body = await request.json().catch(() => null);
  if (!UUID.test(body?.alertId || "")) return NextResponse.json({ error: "A valid alert ID is required." }, { status: 400 });
  const check = validateCheckin(body);
  if (!check.ok) return NextResponse.json({ error: check.error }, { status: 400 });

  const { data: alert, error: alertError } = await loadAlert(auth.admin, body.alertId);
  if (alertError || !alert) return NextResponse.json({ error: "Alert not found." }, { status: 404 });
  if (!alertAcceptsCheckins(alert)) {
    return NextResponse.json({ error: "This alert is not asking for check-ins." }, { status: 409 });
  }

  const { data: saved, error } = await saveCheckin(auth.admin, {
    alertId: alert.id,
    userId: auth.user.id,
    ...check.value,
    source: "tourist",
    reportedBy: auth.user.id,
  });
  if (error) {
    return NextResponse.json(
      { error: isCheckinsNotSetUp(error) ? "Check-ins are not set up yet." : "Could not save your answer." },
      { status: isCheckinsNotSetUp(error) ? 503 : 500 }
    );
  }

  const { data: tourist } = await auth.admin.from("profiles").select("id, full_name, phone").eq("id", auth.user.id).maybeSingle();
  const { warnings } = await notifyUrgentCheckin(auth.admin, {
    alert,
    tourist: tourist || { id: auth.user.id },
    status: check.value.status,
    note: check.value.note,
    reportedByGuide: false,
  });
  if (warnings.length) console.error("[Checkin] Some staff notices failed:", warnings);

  return NextResponse.json({ success: true, checkin: { status: saved.status, note: saved.note, updated_at: saved.updated_at } });
}
