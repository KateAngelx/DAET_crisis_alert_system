import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { API_RATE_LIMITS, enforceRateLimit } from "@/lib/apiRateLimit";

const MAX_NAME = 80;
const MAX_MESSAGE = 500;
const VALID_TYPES = new Set(["feedback", "comment", "suggestion"]);

export async function GET(request) {
  const limited = enforceRateLimit(request, { name: "feedback-get", ...API_RATE_LIMITS.feedbackGet });
  if (limited) return limited;

  try {
    const admin = getSupabaseAdmin();
    if (!admin) {
      return NextResponse.json({ items: [], source: "unavailable" });
    }

    const { data, error } = await admin
      .from("public_feedback")
      .select("id, name, message, feedback_type, created_at")
      .eq("is_public", true)
      .order("created_at", { ascending: false })
      .limit(24);

    if (error?.code === "42P01") {
      return NextResponse.json({ items: [], source: "not_migrated" });
    }
    if (error) throw error;

    return NextResponse.json({ items: data || [], source: "database" });
  } catch (err) {
    return NextResponse.json({ items: [], source: "error", error: err.message });
  }
}

export async function POST(request) {
  const limited = enforceRateLimit(request, { name: "feedback-post", ...API_RATE_LIMITS.feedbackPost });
  if (limited) return limited;

  try {
    const body = await request.json().catch(() => ({}));
    const message = String(body?.message || "").trim();
    const nameRaw = body?.name ? String(body.name).trim() : "";
    const feedbackType = VALID_TYPES.has(body?.feedback_type) ? body.feedback_type : "suggestion";

    if (!message) {
      return NextResponse.json({ error: "Please enter your feedback." }, { status: 400 });
    }
    if (message.length > MAX_MESSAGE) {
      return NextResponse.json({ error: "Feedback is too long (max 500 characters)." }, { status: 400 });
    }

    const name = nameRaw.slice(0, MAX_NAME) || "Anonymous";

    const admin = getSupabaseAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
    }

    const { data, error } = await admin
      .from("public_feedback")
      .insert({
        name,
        message,
        feedback_type: feedbackType,
        is_public: true,
      })
      .select("id, name, message, feedback_type, created_at")
      .single();

    if (error?.code === "42P01") {
      return NextResponse.json(
        { error: "Feedback storage is not set up yet. Please try again later." },
        { status: 503 }
      );
    }
    if (error) throw error;

    return NextResponse.json({ success: true, item: data });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
