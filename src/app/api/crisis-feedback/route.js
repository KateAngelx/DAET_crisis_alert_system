import { NextResponse } from "next/server";
import { requireTourist } from "@/lib/touristAuth";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { enforceRateLimit, enforceRateLimitByKey } from "@/lib/apiRateLimit";

const VALID_TYPES = new Set(["comment", "feedback", "suggestion"]);
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SUBMISSION_LIMIT = { limit: 5, windowMs: 60 * 60_000 };

export async function GET(request) {
  const limited = enforceRateLimit(request, {
    name: "crisis-feedback-get",
    limit: 60,
    windowMs: 60_000,
  });
  if (limited) return limited;

  const admin = getSupabaseAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Feedback service is unavailable." }, { status: 503 });
  }

  const params = new URL(request.url).searchParams;
  const alertId = params.get("alertId");
  if (alertId && !UUID_PATTERN.test(alertId)) {
    return NextResponse.json({ error: "Invalid alert ID." }, { status: 400 });
  }

  let query = admin
    .from("crisis_feedback_submissions")
    .select("id, submitter_category, display_name, submission_type, message, created_at")
    .eq("status", "approved")
    .eq("is_hidden", false)
    .order("created_at", { ascending: false })
    .limit(100);

  if (alertId) query = query.eq("crisis_alert_id", alertId);

  const { data, error } = await query;
  if (error) {
    if (error.code === "42P01") {
      return NextResponse.json({ error: "Crisis feedback is not available yet." }, { status: 503 });
    }
    return NextResponse.json({ error: "Unable to load crisis feedback." }, { status: 500 });
  }

  return NextResponse.json({
    items: (data || []).map((item) => ({
      ...item,
      display_name: item.display_name || (
        item.submitter_category === "registered_tourist"
          ? "Registered tourist"
          : "Anonymous"
      ),
    })),
  });
}

export async function POST(request) {
  const limited = enforceRateLimit(request, {
    name: "crisis-feedback-post",
    limit: 8,
    windowMs: 60 * 60_000,
  });
  if (limited) return limited;

  const auth = await requireTourist(request);
  if (auth.error) return auth.error;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const message = typeof body.message === "string" ? body.message.trim() : "";
  const submissionType = body.submission_type;
  const alertId = body.crisis_alert_id || null;
  const displayName = typeof body.display_name === "string" ? body.display_name.trim() : "";

  if (!VALID_TYPES.has(submissionType)) {
    return NextResponse.json({ error: "Choose a valid submission type." }, { status: 400 });
  }
  if (!message || message.length > 1000) {
    return NextResponse.json({ error: "Message must be between 1 and 1000 characters." }, { status: 400 });
  }
  if (displayName.length > 80) {
    return NextResponse.json({ error: "Name must be 80 characters or fewer." }, { status: 400 });
  }
  if (alertId !== null && (typeof alertId !== "string" || !UUID_PATTERN.test(alertId))) {
    return NextResponse.json({ error: "Invalid alert ID." }, { status: 400 });
  }

  const userLimit = enforceRateLimitByKey(auth.user.id, {
    name: "crisis-feedback-tourist-post",
    ...SUBMISSION_LIMIT,
  });
  if (userLimit) return userLimit;

  if (alertId) {
    const { data: alert, error: alertError } = await auth.admin
      .from("crisis_alerts")
      .select("id")
      .eq("id", alertId)
      .eq("is_public", true)
      .maybeSingle();
    if (alertError) {
      return NextResponse.json({ error: "Unable to verify the selected alert." }, { status: 500 });
    }
    if (!alert) {
      return NextResponse.json({ error: "The selected alert is unavailable." }, { status: 400 });
    }
  }

  const { data, error } = await auth.admin
    .from("crisis_feedback_submissions")
    .insert({
      submitter_category: "registered_tourist",
      user_id: auth.user.id,
      display_name: displayName || null,
      crisis_alert_id: alertId,
      submission_type: submissionType,
      message,
    })
    .select("id, submission_type, status, created_at")
    .single();

  if (error) {
    if (error.code === "42P01") {
      return NextResponse.json({ error: "Crisis feedback is not available yet." }, { status: 503 });
    }
    return NextResponse.json({ error: "Unable to save your submission." }, { status: 500 });
  }

  return NextResponse.json({ success: true, submission: data }, { status: 201 });
}
