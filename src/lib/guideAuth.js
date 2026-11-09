import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export async function requireGuide(request) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const supabaseUser = createClient(supabaseUrl, supabaseAnonKey);
  const { data: { user }, error } = await supabaseUser.auth.getUser(authHeader.slice(7));
  if (error || !user) {
    return { error: NextResponse.json({ error: "Invalid session" }, { status: 401 }) };
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    return {
      error: NextResponse.json(
        { error: "Server misconfigured: SUPABASE_SERVICE_ROLE_KEY required" },
        { status: 500 }
      ),
    };
  }

  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("id, user_type, is_active")
    .eq("id", user.id)
    .maybeSingle();
  if (profileError) {
    return { error: NextResponse.json({ error: "Unable to verify guide access." }, { status: 503 }) };
  }
  if (profile?.user_type !== "guide" || profile.is_active !== true) {
    return { error: NextResponse.json({ error: "Active guide access required" }, { status: 403 }) };
  }

  return { admin, user, profile };
}
