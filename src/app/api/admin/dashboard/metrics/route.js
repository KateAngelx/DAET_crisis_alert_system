import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { buildAdminDashboardMetrics } from "@/lib/adminDashboardMetrics";
import { normalizeDashboardPeriod } from "@/lib/dashboardTrends";
import { enforceRateLimitByKey } from "@/lib/apiRateLimit";

export async function GET(request) {
  try {
    const auth = await requireAdmin(request);
    if (auth.error) return auth.error;

    const limited = enforceRateLimitByKey(auth.user.id, {
      name: "admin-dashboard-metrics",
      limit: 40,
      windowMs: 60_000,
    });
    if (limited) return limited;

    const period = normalizeDashboardPeriod(
      request.nextUrl.searchParams.get("period") || "7d"
    );

    const metrics = await buildAdminDashboardMetrics(auth.admin, { period });

    return NextResponse.json({ metrics });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
