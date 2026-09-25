import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { ONLINE_THRESHOLD_MS } from "@/lib/userActivity";
import {
  aggregatePageViews,
  countUniqueSessions,
  startOfDayIso,
} from "@/lib/publicAnalytics";
import { API_RATE_LIMITS, enforceRateLimit } from "@/lib/apiRateLimit";

export const revalidate = 60;

export async function GET(request) {
  const limited = enforceRateLimit(request, { name: "public-stats", ...API_RATE_LIMITS.publicStats });
  if (limited) return limited;

  try {
    const admin = getSupabaseAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
    }

    const todayStart = startOfDayIso(0);
    const weekStart = startOfDayIso(7);
    const onlineCutoff = new Date(Date.now() - ONLINE_THRESHOLD_MS).toISOString();

    const [
      { data: todayViews, error: todayError },
      { data: weekViews, error: weekError },
      { count: registeredOnline },
      { count: totalRegistered },
    ] = await Promise.all([
      admin.from("page_views").select("path, session_id").gte("created_at", todayStart),
      admin.from("page_views").select("path, session_id").gte("created_at", weekStart),
      admin.from("profiles").select("*", { count: "exact", head: true }).gte("last_seen_at", onlineCutoff),
      admin.from("profiles").select("*", { count: "exact", head: true }).eq("user_type", "tourist"),
    ]);

    if (todayError?.code === "42P01" || weekError?.code === "42P01") {
      return NextResponse.json({
        stats: {
          available: false,
          viewsToday: 0,
          viewsThisWeek: 0,
          uniqueVisitorsToday: 0,
          registeredOnline: registeredOnline || 0,
          totalRegistered: totalRegistered || 0,
          topPages: [],
        },
      });
    }

    if (todayError) throw todayError;
    if (weekError) throw weekError;

    const stats = {
      available: true,
      viewsToday: todayViews?.length || 0,
      viewsThisWeek: weekViews?.length || 0,
      uniqueVisitorsToday: countUniqueSessions(todayViews || []),
      registeredOnline: registeredOnline || 0,
      totalRegistered: totalRegistered || 0,
      topPages: aggregatePageViews(weekViews || []).slice(0, 5),
    };

    return NextResponse.json({ stats });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
