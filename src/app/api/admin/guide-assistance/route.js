import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { enforceRateLimitByKey } from "@/lib/apiRateLimit";
import {
  getNotificationWarnings,
  notifyGuideAssistanceAssignment,
  notifyGuideAssistanceCancellation,
  notifyGuideAssistanceCompletion,
} from "@/lib/guideAssistanceNotifications.server";

const REQUEST_STATUSES = new Set(["Pending", "Assigned", "Accepted", "Declined", "Completed", "Cancelled"]);
const PAGE_SIZE = 10;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function getSearchTerm(value) {
  return String(value || "").replace(/[%(),_*"\\]/g, " ").trim().slice(0, 100);
}

async function getGuideAvailability(admin, guideIds) {
  const [groupsResult, assignmentsResult] = guideIds.length
    ? await Promise.all([
        admin.from("tour_groups").select("guide_id").in("guide_id", guideIds).eq("status", "active"),
        admin.from("guide_assignments").select("guide_id").in("guide_id", guideIds).eq("status", "active"),
      ])
    : [{ data: [], error: null }, { data: [], error: null }];
  if (groupsResult.error) throw groupsResult.error;
  if (assignmentsResult.error) throw assignmentsResult.error;

  const groups = new Map();
  const activeTourists = new Map();
  for (const row of groupsResult.data || []) groups.set(row.guide_id, (groups.get(row.guide_id) || 0) + 1);
  for (const row of assignmentsResult.data || []) activeTourists.set(row.guide_id, (activeTourists.get(row.guide_id) || 0) + 1);
  return { groups, activeTourists };
}

async function loadGuides(admin) {
  const { data: guides, error } = await admin
    .from("profiles")
    .select("id, full_name, email, phone, is_active")
    .eq("user_type", "guide")
    .eq("is_active", true)
    .order("full_name", { ascending: true });
  if (error) throw error;

  const guideIds = (guides || []).map((guide) => guide.id);
  const availability = await getGuideAvailability(admin, guideIds);
  return (guides || []).map((guide) => ({
    ...guide,
    activeTourGroups: availability.groups.get(guide.id) || 0,
    activeTourists: availability.activeTourists.get(guide.id) || 0,
  }));
}

export async function GET(request) {
  try {
    const auth = await requireAdmin(request);
    if (auth.error) return auth.error;

    const limited = enforceRateLimitByKey(auth.user.id, {
      name: "admin-tourist-guide-assistance",
      limit: 40,
      windowMs: 60_000,
    });
    if (limited) return limited;

    const requestedPage = Number(request.nextUrl.searchParams.get("page") || 1);
    if (!Number.isSafeInteger(requestedPage) || requestedPage < 1) {
      return NextResponse.json({ error: "Page must be a positive whole number." }, { status: 400 });
    }
    const status = request.nextUrl.searchParams.get("status") || "All";
    if (status !== "All" && !REQUEST_STATUSES.has(status)) {
      return NextResponse.json({ error: "Choose a valid request status." }, { status: 400 });
    }
    const searchTerm = getSearchTerm(request.nextUrl.searchParams.get("search"));

    const [guides, matchingProfilesResult] = await Promise.all([
      loadGuides(auth.admin),
      searchTerm
        ? auth.admin.from("profiles").select("id").or(
            `full_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`
          ).in("user_type", ["tourist", "guide"]).limit(500)
        : Promise.resolve({ data: [], error: null }),
    ]);
    if (matchingProfilesResult.error) throw matchingProfilesResult.error;
    const matchingProfileIds = (matchingProfilesResult.data || []).map((profile) => profile.id);
    const { data: matchingHistory, error: matchingHistoryError } = searchTerm && matchingProfileIds.length
      ? await auth.admin
          .from("tourist_guide_assistance_assignments")
          .select("request_id")
          .in("guide_id", matchingProfileIds)
      : { data: [], error: null };
    if (matchingHistoryError) throw matchingHistoryError;

    let requestQuery = auth.admin
      .from("tourist_guide_assistance_requests")
      .select("*", { count: "exact" });
    if (status !== "All") requestQuery = requestQuery.eq("status", status);
    if (searchTerm) {
      const filters = [
        `location.ilike.%${searchTerm}%`,
        `assistance_type.ilike.%${searchTerm}%`,
        `details.ilike.%${searchTerm}%`,
      ];
      if (matchingProfileIds.length) {
        filters.push(`tourist_id.in.(${matchingProfileIds.join(",")})`);
        filters.push(`assigned_guide_id.in.(${matchingProfileIds.join(",")})`);
      }
      const historicalRequestIds = [...new Set((matchingHistory || []).map((assignment) => assignment.request_id))];
      if (historicalRequestIds.length) {
        filters.push(`id.in.(${historicalRequestIds.join(",")})`);
      }
      requestQuery = requestQuery.or(filters.join(","));
    }

    const { data: requests, error, count } = await requestQuery
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .range((requestedPage - 1) * PAGE_SIZE, requestedPage * PAGE_SIZE - 1);
    if (error) throw error;

    const profileIds = [...new Set((requests || []).flatMap((item) => [item.tourist_id, item.assigned_guide_id]).filter(Boolean))];
    const { data: profiles, error: profilesError } = profileIds.length
      ? await auth.admin.from("profiles").select("id, full_name, email, phone, user_type, is_active").in("id", profileIds)
      : { data: [], error: null };
    if (profilesError) throw profilesError;

    const profileById = new Map((profiles || []).map((profile) => [profile.id, profile]));
    const requestIds = (requests || []).map((item) => item.id);
    const { data: assignmentHistory, error: historyError } = requestIds.length
      ? await auth.admin.from("tourist_guide_assistance_assignments").select("*").in("request_id", requestIds).order("assigned_at", { ascending: false })
      : { data: [], error: null };
    if (historyError) throw historyError;
    const historicalGuideIds = [...new Set((assignmentHistory || []).map((item) => item.guide_id).filter(Boolean))];
    const { data: historicalGuides, error: historicalGuidesError } = historicalGuideIds.length
      ? await auth.admin.from("profiles").select("id, full_name, email").in("id", historicalGuideIds)
      : { data: [], error: null };
    if (historicalGuidesError) throw historicalGuidesError;
    const historicalGuideById = new Map((historicalGuides || []).map((guide) => [guide.id, guide]));
    const historyByRequestId = new Map();
    for (const assignment of assignmentHistory || []) {
      const entries = historyByRequestId.get(assignment.request_id) || [];
      entries.push({ ...assignment, guide: historicalGuideById.get(assignment.guide_id) || null });
      historyByRequestId.set(assignment.request_id, entries);
    }
    return NextResponse.json(
      {
        success: true,
        requests: (requests || []).map((item) => ({
          ...item,
          tourist: profileById.get(item.tourist_id) || null,
          guide: profileById.get(item.assigned_guide_id) || null,
          assignmentHistory: historyByRequestId.get(item.id) || [],
        })),
        guides,
        totalCount: count || 0,
        page: requestedPage,
        pageSize: PAGE_SIZE,
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Unable to load Tourist Guide Assistance requests." },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}

export async function POST(request) {
  try {
    const auth = await requireAdmin(request);
    if (auth.error) return auth.error;

    const limited = enforceRateLimitByKey(auth.user.id, {
      name: "admin-tourist-guide-assistance-write",
      limit: 30,
      windowMs: 60_000,
    });
    if (limited) return limited;

    const body = await request.json().catch(() => null);
    if (body?.action !== "assign" || !UUID_PATTERN.test(body.requestId || "") || !UUID_PATTERN.test(body.guideId || "")) {
      return NextResponse.json({ error: "requestId, guideId, and action=assign are required." }, { status: 400 });
    }

    const { data: requestRow, error } = await auth.admin.rpc("assign_tourist_guide_assistance", {
      p_request_id: body.requestId,
      p_guide_id: body.guideId,
      p_admin_id: auth.user.id,
    });
    if (error) {
      const conflict = /not found|only pending or declined|administrator-approved/i.test(error.message || "");
      return NextResponse.json({ error: error.message }, { status: conflict ? 409 : 500 });
    }

    const { data: guide, error: guideError } = await auth.admin
      .from("profiles")
      .select("id, full_name, email, phone")
      .eq("id", body.guideId)
      .eq("user_type", "guide")
      .eq("is_active", true)
      .single();
    if (guideError) throw guideError;

    const notificationResults = await notifyGuideAssistanceAssignment(requestRow, guide);
    return NextResponse.json({
      success: true,
      request: requestRow,
      notificationWarnings: getNotificationWarnings([notificationResults]),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Unable to assign this assistance request." },
      { status: 500 }
    );
  }
}

export async function PATCH(request) {
  try {
    const auth = await requireAdmin(request);
    if (auth.error) return auth.error;

    const limited = enforceRateLimitByKey(auth.user.id, {
      name: "admin-tourist-guide-assistance-write",
      limit: 30,
      windowMs: 60_000,
    });
    if (limited) return limited;

    const body = await request.json().catch(() => null);
    if (!UUID_PATTERN.test(body?.requestId || "") || !["Completed", "Cancelled"].includes(body.status)) {
      return NextResponse.json({ error: "requestId and status (Completed or Cancelled) are required." }, { status: 400 });
    }

    const { data: requestRow, error } = await auth.admin.rpc("update_tourist_guide_assistance_status", {
      p_request_id: body.requestId,
      p_status: body.status,
    });
    if (error) {
      const conflict = /not found|only accepted|can no longer/i.test(error.message || "");
      return NextResponse.json({ error: error.message }, { status: conflict ? 409 : 500 });
    }

    const notificationResults = body.status === "Completed"
      ? [await notifyGuideAssistanceCompletion(requestRow)]
      : await notifyGuideAssistanceCancellation(requestRow);
    return NextResponse.json({
      success: true,
      request: requestRow,
      notificationWarnings: getNotificationWarnings(notificationResults),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Unable to update this assistance request." },
      { status: 500 }
    );
  }
}
