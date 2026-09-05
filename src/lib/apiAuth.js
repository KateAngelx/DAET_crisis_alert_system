import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/** Require any authenticated Supabase session for proxy APIs */
export async function requireAuthenticatedRequest(request) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return { ok: false, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const token = authHeader.replace("Bearer ", "");
  const supabaseUser = createClient(supabaseUrl, supabaseAnonKey);
  const { data: { user }, error } = await supabaseUser.auth.getUser(token);

  if (error || !user) {
    return { ok: false, response: NextResponse.json({ error: "Invalid session" }, { status: 401 }) };
  }

  return { ok: true, user };
}
