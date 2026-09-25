import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { API_RATE_LIMITS, enforceRateLimitByKey } from "@/lib/apiRateLimit";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export async function POST(request) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.replace("Bearer ", "");
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey);
    const { data: { user }, error: authError } = await supabaseUser.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    const limited = enforceRateLimitByKey(user.id, {
      name: "heartbeat",
      ...API_RATE_LIMITS.heartbeat,
    });
    if (limited) return limited;

    const admin = getSupabaseAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
    }

    const now = new Date().toISOString();
    const { error } = await admin
      .from("profiles")
      .update({ last_seen_at: now })
      .eq("id", user.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, last_seen_at: now });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
