import { NextResponse } from "next/server";
import { requireGuide } from "@/lib/guideAuth";
import { API_RATE_LIMITS, enforceRateLimitByKey } from "@/lib/apiRateLimit";
import { getNotificationWarnings, notifyGuideAssistanceOutcome } from "@/lib/guideAssistanceNotifications.server";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(request) {
  try {
    const auth = await requireGuide(request);
    if (auth.error) return auth.error;

    const limited = enforceRateLimitByKey(auth.user.id, {
      name: "guide-assistance-list",
      limit: 60,
      windowMs: 60_000,
    });
    if (limited) return limited;

    const { data: requests, error } = await auth.admin
      .from("tourist_guide_assistance_requests")
      .select("*")
      .eq("assigned_guide_id", auth.user.id)
      .in("status", ["Assigned", "Accepted"])
      .order("assigned_at", { ascending: false });
    if (error) throw error;

    const touristIds = [...new Set((requests || []).map((item) => item.tourist_id).filter(Boolean))];
    const { data: tourists, error: touristError } = touristIds.length
      ? await auth.admin.from("profiles").select("id, full_name, email, phone").in("id", touristIds)
      : { data: [], error: null };
    if (touristError) throw touristError;
    const touristById = new Map((tourists || []).map((tourist) => [tourist.id, tourist]));

    return NextResponse.json(
      {
        success: true,
        requests: (requests || []).map((item) => {
          const tourist = touristById.get(item.tourist_id);
          return {
            ...item,
            tourist: tourist
              ? item.status === "Accepted"
                ? { full_name: tourist.full_name, email: tourist.email, phone: tourist.phone }
                : { full_name: tourist.full_name }
              : null,
          };
        }),
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Unable to load your assistance assignments." },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}

export async function POST(request) {
  try {
    const auth = await requireGuide(request);
    if (auth.error) return auth.error;

    const limited = enforceRateLimitByKey(auth.user.id, {
      name: "guide-assistance-respond",
      ...API_RATE_LIMITS.assignmentRespond,
    });
    if (limited) return limited;

    const body = await request.json().catch(() => null);
    if (!UUID_PATTERN.test(body?.requestId || "") || !["accept", "decline"].includes(body.action)) {
      return NextResponse.json({ error: "requestId and action (accept or decline) are required." }, { status: 400 });
    }

    const { data: requestRow, error } = await auth.admin.rpc("respond_tourist_guide_assistance", {
      p_request_id: body.requestId,
      p_guide_id: auth.user.id,
      p_action: body.action,
    });
    if (error) {
      const conflict = /no longer available/i.test(error.message || "");
      return NextResponse.json({ error: error.message }, { status: conflict ? 409 : 500 });
    }

    const notificationResults = await notifyGuideAssistanceOutcome(
      requestRow,
      body.action === "accept" ? "Accepted" : "Declined"
    );
    return NextResponse.json({
      success: true,
      request: requestRow,
      notificationWarnings: getNotificationWarnings(notificationResults),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Unable to respond to this assignment." },
      { status: 500 }
    );
  }
}
