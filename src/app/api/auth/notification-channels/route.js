import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const DEFAULT_CHANNELS = { email: true, sms: true, app: true };

export async function POST(request) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.replace("Bearer ", "");
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey);
    const {
      data: { user },
      error: authError,
    } = await supabaseUser.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    const admin = getSupabaseAdmin();
    if (!admin) {
      return NextResponse.json(
        { error: "Server misconfigured: SUPABASE_SERVICE_ROLE_KEY required" },
        { status: 500 }
      );
    }

    const { data: existing, error: readError } = await admin
      .from("profiles")
      .select("user_type, notification_channels")
      .eq("id", user.id)
      .maybeSingle();

    if (readError || !existing) {
      return NextResponse.json({ error: readError?.message || "Profile not found" }, { status: 404 });
    }

    if (existing.user_type === "admin") {
      return NextResponse.json(
        { error: "Administrators do not use tourist/guide notification preferences" },
        { status: 403 }
      );
    }

    const body = await request.json().catch(() => ({}));

    if (body.skip) {
      const { data, error } = await admin
        .from("profiles")
        .update({
          notification_channels: existing.notification_channels || DEFAULT_CHANNELS,
          notification_channels_configured: true,
        })
        .eq("id", user.id)
        .select()
        .single();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ success: true, profile: data, skipped: true });
    }

    const channels = body.channels;
    if (!channels?.email && !channels?.sms && !channels?.app) {
      return NextResponse.json(
        { error: "Enable at least one communication channel" },
        { status: 400 }
      );
    }

    const { data, error } = await admin
      .from("profiles")
      .update({
        notification_channels: {
          email: Boolean(channels.email),
          sms: Boolean(channels.sms),
          app: Boolean(channels.app),
        },
        notification_channels_configured: true,
      })
      .eq("id", user.id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, profile: data });
  } catch (err) {
    return NextResponse.json({ error: err.message || "Failed to save preferences" }, { status: 500 });
  }
}
