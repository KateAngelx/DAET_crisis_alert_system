import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { buildAdminDashboardMetrics } from "@/lib/adminDashboardMetrics";
import { normalizeDashboardPeriod } from "@/lib/dashboardTrends";

export async function GET(request) {
  try {
    const auth = await requireAdmin(request);
    if (auth.error) return auth.error;

    const period = normalizeDashboardPeriod(
      request.nextUrl.searchParams.get("period") || "7d"
    );

    const metrics = await buildAdminDashboardMetrics(auth.admin, { period });

    // #region agent log
    fetch("http://127.0.0.1:7540/ingest/3142bff0-53ba-4c2c-9606-b4d021977f0c", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "197cec" },
      body: JSON.stringify({
        sessionId: "197cec",
        runId: "admin-db-metrics",
        hypothesisId: "DB",
        location: "api/admin/dashboard/metrics/route.js:GET",
        message: "Admin dashboard metrics from database",
        data: {
          source: metrics.meta?.source,
          period: metrics.meta?.period,
          granularity: metrics.meta?.granularity,
          alertsIssuedInPeriod: metrics.kpis?.alertsIssuedInPeriod,
          incidentsReportedInPeriod: metrics.kpis?.incidentsReportedInPeriod,
          bucketCount: metrics.meta?.bucketCount,
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion

    return NextResponse.json({ metrics });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
