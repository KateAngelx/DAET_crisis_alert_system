import { NextResponse } from "next/server";
import { requireGuide } from "@/lib/guideAuth";
import { enforceRateLimitByKey } from "@/lib/apiRateLimit";
import { alertAcceptsCheckins, validateCheckin } from "@/lib/alertCheckins";
import { isCheckinsNotSetUp, loadAlert, notifyUrgentCheckin, saveCheckin } from "@/lib/alertCheckins.server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Tourists in this guide's active tour groups. */
async function loadGuideTourists(admin, guideId) {
  const { data, error } = await admin
    .from("guide_assignments")
    .select("tourist_id, tourist:profiles!guide_assignments_tourist_id_fkey(full_name, phone), tour_group:tour_groups(id, name, status)")
    .eq("guide_id", guideId)
    .eq("status", "active");
  if (error) return { error };
  const tourists = (data || [])
    .filter((r) => r.tour_group?.status === "active")
    .map((r) => ({
      touristId: r.tourist_id,
      name: r.tourist?.full_name || "Tourist",
      phone: r.tourist?.phone || null,
      groupId: r.tour_group.id,
      groupName: r.tour_group.name,
    }));
  return { tourists, error: null };
}

/** Headcount for one alert: each tourist in the guide's active groups with their latest answer. */
export async function GET(request) {
  const auth = await requireGuide(request);
  if (auth.error) return auth.error;
  const alertId = request.nextUrl.searchParams.get("alertId") || "";
  if (!UUID.test(alertId)) return NextResponse.json({ error: "A valid alert ID is required." }, { status: 400 });

  const { tourists, error } = await loadGuideTourists(auth.admin, auth.user.id);
  if (error) return NextResponse.json({ error: "Could not load your tour groups." }, { status: 500 });

  const ids = tourists.map((t) => t.touristId);
  let answers = [];
  if (ids.length) {
    const { data, error: checkinError } = await auth.admin
      .from("crisis_alert_checkins")
      .select("user_id, status, note, source, updated_at")
      .eq("alert_id", alertId)
      .in("user_id", ids);
    if (checkinError) {
      return NextResponse.json({ available: !isCheckinsNotSetUp(checkinError), tourists: [] });
    }
    answers = data || [];
  }
  const byTourist = new Map(answers.map((a) => [a.user_id, a]));
  return NextResponse.json({
    available: true,
    tourists: tourists.map((t) => ({ ...t, checkin: byTourist.get(t.touristId) || null })),
  });
}

/** A guide marks a tourist in one of their active groups as safe, needing help, evacuated or missing. */
export async function POST(request) {
  const auth = await requireGuide(request);
  if (auth.error) return auth.error;
  const limited = enforceRateLimitByKey(auth.user.id, { name: "guide-headcount", limit: 120, windowMs: 60 * 60_000 });
  if (limited) return limited;

  const body = await request.json().catch(() => null);
  if (!UUID.test(body?.alertId || "") || !UUID.test(body?.touristId || "")) {
    return NextResponse.json({ error: "A valid alert and tourist are required." }, { status: 400 });
  }
  const check = validateCheckin(body, { byGuide: true });
  if (!check.ok) return NextResponse.json({ error: check.error }, { status: 400 });

  const { tourists, error } = await loadGuideTourists(auth.admin, auth.user.id);
  if (error) return NextResponse.json({ error: "Could not load your tour groups." }, { status: 500 });
  const tourist = tourists.find((t) => t.touristId === body.touristId);
  if (!tourist) return NextResponse.json({ error: "This tourist is not in your active tour groups." }, { status: 403 });

  const { data: alert, error: alertError } = await loadAlert(auth.admin, body.alertId);
  if (alertError || !alert) return NextResponse.json({ error: "Alert not found." }, { status: 404 });
  if (!alertAcceptsCheckins(alert)) return NextResponse.json({ error: "This alert is not asking for check-ins." }, { status: 409 });

  const { data: saved, error: saveError } = await saveCheckin(auth.admin, {
    alertId: alert.id,
    userId: tourist.touristId,
    ...check.value,
    source: "guide",
    reportedBy: auth.user.id,
  });
  if (saveError) {
    return NextResponse.json(
      { error: isCheckinsNotSetUp(saveError) ? "Check-ins are not set up yet." : "Could not save the headcount." },
      { status: isCheckinsNotSetUp(saveError) ? 503 : 500 }
    );
  }

  const { warnings } = await notifyUrgentCheckin(auth.admin, {
    alert,
    tourist: { id: tourist.touristId, full_name: tourist.name, phone: tourist.phone },
    status: check.value.status,
    note: check.value.note,
    reportedByGuide: true,
  });
  if (warnings.length) console.error("[Headcount] Some staff notices failed:", warnings);

  return NextResponse.json({ success: true, checkin: { status: saved.status, note: saved.note, source: saved.source, updated_at: saved.updated_at } });
}
