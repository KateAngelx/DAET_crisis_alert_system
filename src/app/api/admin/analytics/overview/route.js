import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { ONLINE_THRESHOLD_MS } from "@/lib/userActivity";
import {
  aggregatePageViews,
  countUniqueSessions,
  getPageLabel,
  startOfDayIso,
} from "@/lib/publicAnalytics";
import { getLastNDays } from "@/lib/dashboardTrends";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

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

    const todayStart = startOfDayIso(0);
    const weekStart = startOfDayIso(7);
    const onlineCutoff = new Date(Date.now() - ONLINE_THRESHOLD_MS).toISOString();

    const [
      { data: todayViews },
      { data: weekViews },
      { data: recentViews },
      { count: registeredOnline },
    ] = await Promise.all([
      admin.from("page_views").select("path, session_id, viewer_type, created_at").gte("created_at", todayStart),
      admin.from("page_views").select("path, session_id, viewer_type, created_at").gte("created_at", weekStart),
      admin
        .from("page_views")
        .select("id, path, page_title, viewer_type, user_id, created_at, profiles(full_name, user_type)")
        .order("created_at", { ascending: false })
        .limit(25),
      admin.from("profiles").select("*", { count: "exact", head: true }).gte("last_seen_at", onlineCutoff),
    ]);

    const guestToday = (todayViews || []).filter((v) => v.viewer_type === "guest").length;
    const signedInToday = (todayViews || []).filter((v) => v.viewer_type !== "guest").length;

    const dayBuckets = getLastNDays(7);
    const dailyPageViews = dayBuckets.map((day) => ({
      ...day,
      value: (weekViews || []).filter((v) => v.created_at?.slice(0, 10) === day.key).length,
    }));
    const dailyUniqueVisitors = dayBuckets.map((day) => {
      const dayRows = (weekViews || []).filter((v) => v.created_at?.slice(0, 10) === day.key);
      return {
        ...day,
        value: countUniqueSessions(dayRows),
      };
    });

    const recentViewers = (recentViews || []).map((row) => {
      const profile = row.profiles;
      const isGuest = !row.user_id || row.viewer_type === "guest";
      return {
        id: row.id,
        path: row.path,
        pageLabel: row.page_title || getPageLabel(row.path),
        viewerLabel: isGuest ? "Guest visitor" : profile?.full_name || "Registered user",
        viewerType: isGuest ? "guest" : profile?.user_type || row.viewer_type || "tourist",
        viewedAt: row.created_at,
      };
    });

    return NextResponse.json({
      stats: {
        viewsToday: todayViews?.length || 0,
        viewsThisWeek: weekViews?.length || 0,
        uniqueVisitorsToday: countUniqueSessions(todayViews || []),
        guestViewsToday: guestToday,
        signedInViewsToday: signedInToday,
        registeredOnline: registeredOnline || 0,
        topPages: aggregatePageViews(weekViews || []).slice(0, 8),
        dailyPageViews,
        dailyUniqueVisitors,
        recentViewers,
      },
    });
  } catch (err) {
    if (err?.code === "42P01") {
      return NextResponse.json({
        stats: { available: false, viewsToday: 0, viewsThisWeek: 0, recentViewers: [], topPages: [] },
      });
    }
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
