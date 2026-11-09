import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { enforceRateLimitByKey } from "@/lib/apiRateLimit";
import {
  getGuideEmergencyNotificationWarnings,
  notifyGuideEmergencyStatus,
} from "@/lib/guideEmergencyNotifications.server";

const STATUSES = new Set(["New", "Acknowledged", "Responding", "Resolved", "Closed"]);
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const PAGE_SIZE = 50;

export async function GET(request) {
  try {
    const auth = await requireAdmin(request);
    if (auth.error) return auth.error;
    const limited = enforceRateLimitByKey(auth.user.id, {
      name: "admin-guide-emergency-list",
      limit: 60,
      windowMs: 60_000,
    });
    if (limited) return limited;

    const url = new URL(request.url);
    const page = Number(url.searchParams.get("page") || 1);
    const status = url.searchParams.get("status") || "All";
    const search = String(url.searchParams.get("search") || "").replace(/[%(),_*"\\]/g, " ").trim().slice(0, 100);
    if (!Number.isSafeInteger(page) || page < 1) {
      return NextResponse.json({ error: "Page must be a positive whole number." }, { status: 400 });
    }
    if (status !== "All" && !STATUSES.has(status)) {
      return NextResponse.json({ error: "Choose a valid emergency status." }, { status: 400 });
    }

    let query = auth.admin.from("guide_emergency_reports").select("*", { count: "exact" });
    if (status !== "All") query = query.eq("status", status);
    if (search) {
      query = query.or([
        `reference_number.ilike.%${search}%`,
        `emergency_type.ilike.%${search}%`,
        `location.ilike.%${search}%`,
        `description.ilike.%${search}%`,
      ].join(","));
    }
    const { data: reports, error, count } = await query
      .order("submitted_at", { ascending: false })
      .order("id", { ascending: false })
      .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
    if (error) throw error;

    const reportIds = (reports || []).map((report) => report.id);
    const reporterIds = [...new Set((reports || []).map((report) => report.reporter_id))];
    const [{ data: guides, error: guidesError }, { data: history, error: historyError }] = await Promise.all([
      reporterIds.length
        ? auth.admin.from("profiles").select("id, full_name, email, phone").in("id", reporterIds)
        : Promise.resolve({ data: [], error: null }),
      reportIds.length
        ? auth.admin.from("guide_emergency_report_history").select("*").in("report_id", reportIds).order("changed_at", { ascending: false })
        : Promise.resolve({ data: [], error: null }),
    ]);
    if (guidesError) throw guidesError;
    if (historyError) throw historyError;

    const guideById = new Map((guides || []).map((guide) => [guide.id, guide]));
    const changedByIds = [...new Set((history || []).map((event) => event.changed_by).filter(Boolean))];
    const { data: changers, error: changersError } = changedByIds.length
      ? await auth.admin.from("profiles").select("id, full_name").in("id", changedByIds)
      : { data: [], error: null };
    if (changersError) throw changersError;
    const changerById = new Map((changers || []).map((profile) => [profile.id, profile]));
    const historyByReportId = new Map();
    for (const event of history || []) {
      const events = historyByReportId.get(event.report_id) || [];
      events.push({ ...event, actor: changerById.get(event.changed_by) || null });
      historyByReportId.set(event.report_id, events);
    }

    return NextResponse.json({
      success: true,
      reports: (reports || []).map((report) => ({
        ...report,
        guide: guideById.get(report.reporter_id) || null,
        history: historyByReportId.get(report.id) || [],
      })),
      totalCount: count || 0,
      page,
      pageSize: PAGE_SIZE,
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Unable to load guide emergency reports." },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}

export async function PATCH(request) {
  try {
    const auth = await requireAdmin(request);
    if (auth.error) return auth.error;
    const limited = enforceRateLimitByKey(auth.user.id, {
      name: "admin-guide-emergency-update",
      limit: 30,
      windowMs: 60_000,
    });
    if (limited) return limited;

    const body = await request.json().catch(() => null);
    const note = body?.note == null ? null : String(body.note).trim();
    if (!UUID_PATTERN.test(body?.reportId || "") || !STATUSES.has(body.status) || (note && note.length > 1000)) {
      return NextResponse.json({ error: "Provide a valid report ID, status, and a note no longer than 1000 characters." }, { status: 400 });
    }

    const { data: report, error } = await auth.admin.rpc("update_guide_emergency_report_status", {
      p_report_id: body.reportId,
      p_admin_id: auth.user.id,
      p_status: body.status,
      p_note: note,
    });
    if (error) {
      const conflict = /not found|invalid emergency status transition|active administrator access required/i.test(error.message || "");
      return NextResponse.json({ error: error.message }, { status: conflict ? 409 : 500 });
    }
    const notificationResults = await notifyGuideEmergencyStatus(report, report.reporter_id);
    return NextResponse.json({
      success: true,
      report,
      notificationWarnings: getGuideEmergencyNotificationWarnings(notificationResults),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Unable to update emergency report status." },
      { status: 500 }
    );
  }
}
