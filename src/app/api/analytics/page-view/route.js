import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { getPageLabel } from "@/lib/publicAnalytics";
import { API_RATE_LIMITS, enforceRateLimit } from "@/lib/apiRateLimit";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const MAX_PATH_LENGTH = 512;
const MAX_SESSION_LENGTH = 64;

export async function POST(request) {
  const limited = enforceRateLimit(request, { name: "page-view", ...API_RATE_LIMITS.pageView });
  if (limited) return limited;

  try {
    const body = await request.json().catch(() => ({}));
    const path = String(body?.path || "/").slice(0, MAX_PATH_LENGTH);
    const sessionId = String(body?.sessionId || "").slice(0, MAX_SESSION_LENGTH);
    const referrer = body?.referrer ? String(body.referrer).slice(0, 512) : null;

    if (!sessionId || !path.startsWith("/")) {
      return NextResponse.json({ error: "Invalid tracking payload" }, { status: 400 });
    }

    const admin = getSupabaseAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
    }

    let userId = null;
    let viewerType = "guest";

    const authHeader = request.headers.get("authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.replace("Bearer ", "");
      const supabaseUser = createClient(supabaseUrl, supabaseAnonKey);
      const { data: { user } } = await supabaseUser.auth.getUser(token);
      if (user?.id) {
        userId = user.id;
        const { data: profile } = await admin
          .from("profiles")
          .select("user_type")
          .eq("id", user.id)
          .maybeSingle();
        viewerType = profile?.user_type || "tourist";
      }
    }

    const { error } = await admin.from("page_views").insert({
      path,
      page_title: getPageLabel(path),
      user_id: userId,
      session_id: sessionId,
      viewer_type: viewerType,
      referrer,
    });

    if (error) {
      if (error.code === "42P01") {
        return NextResponse.json({ success: false, skipped: true, reason: "analytics_not_migrated" });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
