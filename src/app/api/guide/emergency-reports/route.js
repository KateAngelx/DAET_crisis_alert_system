import { NextResponse } from "next/server";
import { requireGuide } from "@/lib/guideAuth";
import { enforceRateLimitByKey } from "@/lib/apiRateLimit";
import {
  getGuideEmergencyNotificationWarnings,
  notifyGuideEmergencySubmitted,
} from "@/lib/guideEmergencyNotifications.server";

const EMERGENCY_TYPES = new Set([
  "Medical emergency",
  "Accident or injury",
  "Lost tourist",
  "Safety or security concern",
  "Natural disaster or hazardous situation",
  "Other emergency",
]);
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const GUIDE_LIST_LIMIT = 15;

const trimOrNull = (value) => {
  if (value == null || value === "") return null;
  return typeof value === "string" ? value.trim() : value;
};

export async function GET(request) {
  try {
    const auth = await requireGuide(request);
    if (auth.error) return auth.error;

    const limited = enforceRateLimitByKey(auth.user.id, {
      name: "guide-emergency-report-list",
      limit: 60,
      windowMs: 60_000,
    });
    if (limited) return limited;

    const { data: reports, error } = await auth.admin
      .from("guide_emergency_reports")
      .select("id, reference_number, emergency_type, location, status, submitted_at")
      .eq("reporter_id", auth.user.id)
      .order("submitted_at", { ascending: false })
      .limit(GUIDE_LIST_LIMIT);
    if (error) throw error;

    const reportIds = (reports || []).map((row) => row.id);
    const { data: history, error: historyError } = reportIds.length
      ? await auth.admin
          .from("guide_emergency_report_history")
          .select("report_id, note, new_status, changed_at")
          .in("report_id", reportIds)
          .not("note", "is", null)
          .order("changed_at", { ascending: false })
      : { data: [], error: null };
    if (historyError) throw historyError;

    const latestNoteByReport = new Map();
    for (const event of history || []) {
      const note = String(event.note || "").trim();
      if (!note || latestNoteByReport.has(event.report_id)) continue;
      latestNoteByReport.set(event.report_id, { note, at: event.changed_at, status: event.new_status });
    }

    return NextResponse.json(
      {
        success: true,
        reports: (reports || []).map((report) => ({
          ...report,
          latestOfficeNote: latestNoteByReport.get(report.id) || null,
        })),
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Unable to load your emergency reports." },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}

export async function POST(request) {
  try {
    const auth = await requireGuide(request);
    if (auth.error) return auth.error;

    const limited = enforceRateLimitByKey(auth.user.id, {
      name: "guide-emergency-report",
      limit: 10,
      windowMs: 60_000,
    });
    if (limited) return limited;

    const body = await request.json().catch(() => null);
    const location = trimOrNull(body?.location);
    const description = trimOrNull(body?.description);
    const affectedInfo = trimOrNull(body?.affectedInfo);
    const affectedCount = body?.affectedTourists === "" || body?.affectedTourists == null
      ? null
      : Number(body.affectedTourists);
    const latitude = body?.latitude == null ? null : Number(body.latitude);
    const longitude = body?.longitude == null ? null : Number(body.longitude);

    if (!UUID_PATTERN.test(body?.idempotencyKey || "")) {
      return NextResponse.json({ error: "Please submit the form again; its request key is missing." }, { status: 400 });
    }
    if (!EMERGENCY_TYPES.has(body?.emergencyType)) {
      return NextResponse.json({ error: "Choose a valid emergency type." }, { status: 400 });
    }
    if (typeof location !== "string" || location.length < 1 || location.length > 500) {
      return NextResponse.json({ error: "Enter an emergency location (up to 500 characters)." }, { status: 400 });
    }
    if (typeof description !== "string" || description.length < 1 || description.length > 5000) {
      return NextResponse.json({ error: "Describe the emergency (up to 5000 characters)." }, { status: 400 });
    }
    if (affectedInfo != null && (typeof affectedInfo !== "string" || affectedInfo.length > 1000)) {
      return NextResponse.json({ error: "Affected tourist or group information must be 1000 characters or fewer." }, { status: 400 });
    }
    if (affectedCount != null && (!Number.isInteger(affectedCount) || affectedCount < 1 || affectedCount > 500)) {
      return NextResponse.json({ error: "Affected tourist count must be between 1 and 500." }, { status: 400 });
    }
    if (
      (latitude == null) !== (longitude == null) ||
      (latitude != null && (!Number.isFinite(latitude) || latitude < -90 || latitude > 90)) ||
      (longitude != null && (!Number.isFinite(longitude) || longitude < -180 || longitude > 180))
    ) {
      return NextResponse.json({ error: "Device coordinates are invalid. Enter the location manually or try again." }, { status: 400 });
    }

    const { data: report, error } = await auth.admin.rpc("submit_guide_emergency_report", {
      p_guide_id: auth.user.id,
      p_idempotency_key: body.idempotencyKey,
      p_emergency_type: body.emergencyType,
      p_location: location,
      p_latitude: latitude,
      p_longitude: longitude,
      p_description: description,
      p_affected_tourists: affectedCount,
      p_affected_info: affectedInfo,
    });
    if (error) {
      const forbidden = /active guide access required/i.test(error.message || "");
      return NextResponse.json({ error: error.message }, { status: forbidden ? 403 : 500 });
    }

    const { data: guide, error: guideError } = await auth.admin
      .from("profiles")
      .select("id, full_name")
      .eq("id", auth.user.id)
      .single();
    if (guideError) throw guideError;
    const notificationResults = await notifyGuideEmergencySubmitted(report, guide);

    return NextResponse.json({
      success: true,
      report: { id: report.id, referenceNumber: report.reference_number, submittedAt: report.submitted_at },
      notificationWarnings: getGuideEmergencyNotificationWarnings(notificationResults),
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Unable to submit the emergency report." },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
