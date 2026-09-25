import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import {
  INACTIVE_THRESHOLD_DAYS,
  ONLINE_THRESHOLD_MS,
  getInactiveDays,
  getLastActivityAt,
  isInactiveOverThreshold,
  isUserOnline,
} from "@/lib/userActivity";
import { API_RATE_LIMITS, enforceRateLimitByKey } from "@/lib/apiRateLimit";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

function startOfDay(daysAgo = 0) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString();
}

export async function GET(request) {
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

    const admin = getSupabaseAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
    }

    const { data: callerProfile } = await admin
      .from("profiles")
      .select("user_type")
      .eq("id", user.id)
      .single();

    if (callerProfile?.user_type !== "admin") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const limited = enforceRateLimitByKey(user.id, {
      name: "admin-user-stats",
      limit: 30,
      windowMs: 60_000,
    });
    if (limited) return limited;

    const nowMs = Date.now();
    const onlineCutoff = new Date(nowMs - ONLINE_THRESHOLD_MS).toISOString();
    const todayStart = startOfDay(0);
    const weekStart = startOfDay(7);

    const [
      { count: totalUsers },
      { count: touristCount },
      { count: onlineCount },
      { count: newTouristsToday },
      { count: newTouristsWeek },
      { data: profiles },
    ] = await Promise.all([
      admin.from("profiles").select("*", { count: "exact", head: true }),
      admin.from("profiles").select("*", { count: "exact", head: true }).eq("user_type", "tourist"),
      admin.from("profiles").select("*", { count: "exact", head: true }).gte("last_seen_at", onlineCutoff),
      admin
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .eq("user_type", "tourist")
        .gte("created_at", todayStart),
      admin
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .eq("user_type", "tourist")
        .gte("created_at", weekStart),
      admin
        .from("profiles")
        .select("id, user_type, last_login_at, last_seen_at, created_at, sms_suspended_at, is_active")
        .eq("is_active", true),
    ]);

    let inactiveOver30 = 0;
    let smsSuspended = 0;
    const inactiveUsers = [];

    for (const profile of profiles || []) {
      if (isInactiveOverThreshold(profile, INACTIVE_THRESHOLD_DAYS, nowMs)) {
        inactiveOver30 += 1;
        inactiveUsers.push({
          id: profile.id,
          user_type: profile.user_type,
          inactiveDays: getInactiveDays(profile, nowMs),
          lastActivityAt: getLastActivityAt(profile)
            ? new Date(getLastActivityAt(profile)).toISOString()
            : null,
        });
      }
      if (profile.sms_suspended_at) smsSuspended += 1;
    }

    inactiveUsers.sort((a, b) => (b.inactiveDays || 0) - (a.inactiveDays || 0));

    const stats = {
      totalUsers: totalUsers || 0,
      touristCount: touristCount || 0,
      onlineCount: onlineCount || 0,
      newTouristsToday: newTouristsToday || 0,
      newTouristsWeek: newTouristsWeek || 0,
      inactiveOver30Days: inactiveOver30,
      smsSuspendedCount: smsSuspended,
      inactiveThresholdDays: INACTIVE_THRESHOLD_DAYS,
      onlineThresholdMinutes: ONLINE_THRESHOLD_MS / 60000,
      topInactiveUsers: inactiveUsers.slice(0, 10),
    };

    return NextResponse.json({ stats });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
