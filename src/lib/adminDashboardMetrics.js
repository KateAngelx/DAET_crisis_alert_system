import {
  bucketCountByPeriod,
  getDashboardPeriodConfig,
  getTimeBuckets,
  normalizeDashboardPeriod,
  openIncidentBacklogSeries,
  rangeStartIso,
  sumSeriesValues,
} from "@/lib/dashboardTrends";
import { aggregatePageViews, countUniqueSessions } from "@/lib/publicAnalytics";
import { ONLINE_THRESHOLD_MS } from "@/lib/userActivity";

const CLOSED_INCIDENT_STATUSES = ["Resolved", "Closed", "Rejected"];
const CLOSURE_HISTORY_STATUSES = ["Resolved", "Closed"];

function buildClosureMap(incidents, historyRows) {
  const byIncident = new Map();

  for (const row of historyRows || []) {
    if (!CLOSED_INCIDENT_STATUSES.includes(row.new_status)) continue;
    const ms = new Date(row.created_at).getTime();
    if (Number.isNaN(ms)) continue;
    const prev = byIncident.get(row.incident_id);
    if (prev == null || ms < prev) byIncident.set(row.incident_id, ms);
  }

  for (const incident of incidents || []) {
    if (byIncident.has(incident.id)) continue;
    if (!CLOSED_INCIDENT_STATUSES.includes(incident.status)) continue;
    const ms = new Date(incident.updated_at || incident.created_at).getTime();
    if (!Number.isNaN(ms)) byIncident.set(incident.id, ms);
  }

  return byIncident;
}

function bucketUniqueVisitorsByPeriod(rows, period, timeZone) {
  const buckets = getTimeBuckets(period, timeZone);
  const config = getDashboardPeriodConfig(period);

  return buckets.map((bucket, index) => {
    const dayRows = (rows || []).filter((row) => {
      const keyed = bucketCountByPeriod([row], "created_at", period, timeZone);
      return keyed[index]?.value > 0;
    });
    return {
      ...bucket,
      value: countUniqueSessions(dayRows),
    };
  });
}

async function fetchResolvedAlertsInRange(admin, rangeStart) {
  const primary = await admin
    .from("crisis_alerts")
    .select("id, created_at, status, resolved_at")
    .in("status", ["Resolved", "resolved"])
    .not("resolved_at", "is", null)
    .gte("resolved_at", rangeStart);

  if (!primary.error) return primary.data || [];

  const fallback = await admin
    .from("crisis_alerts")
    .select("id, created_at, status")
    .in("status", ["Resolved", "resolved"])
    .gte("created_at", rangeStart);

  return fallback.data || [];
}

export async function buildAdminDashboardMetrics(
  admin,
  { period = "7d", timeZone = "Asia/Manila" } = {}
) {
  const normalizedPeriod = normalizeDashboardPeriod(period);
  const periodConfig = getDashboardPeriodConfig(normalizedPeriod);
  const rangeStart = rangeStartIso(normalizedPeriod, timeZone);
  const onlineCutoff = new Date(Date.now() - ONLINE_THRESHOLD_MS).toISOString();

  const [
    { data: alertsInRange },
    alertsResolvedInRange,
    { data: incidentsInRange },
    { data: allIncidents },
    { data: closureHistoryInRange },
    { data: allClosureHistory },
    { count: touristCount },
    { count: onlineCount },
    { count: newTouristsInPeriod },
    { data: activeTourGroups },
    { count: assignedTourists },
    { data: pageViewsInRange },
    { data: activeAlertsRows },
    { data: allOpenIncidents },
  ] = await Promise.all([
    admin
      .from("crisis_alerts")
      .select("id, created_at, status, resolved_at")
      .gte("created_at", rangeStart),
    fetchResolvedAlertsInRange(admin, rangeStart),
    admin
      .from("incident_reports")
      .select("id, created_at, status, updated_at")
      .gte("created_at", rangeStart),
    admin.from("incident_reports").select("id, created_at, status, updated_at"),
    admin
      .from("incident_history")
      .select("incident_id, new_status, created_at")
      .in("new_status", CLOSURE_HISTORY_STATUSES)
      .gte("created_at", rangeStart),
    admin
      .from("incident_history")
      .select("incident_id, new_status, created_at")
      .in("new_status", CLOSED_INCIDENT_STATUSES),
    admin.from("profiles").select("*", { count: "exact", head: true }).eq("user_type", "tourist"),
    admin.from("profiles").select("*", { count: "exact", head: true }).gte("last_seen_at", onlineCutoff),
    admin
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("user_type", "tourist")
      .gte("created_at", rangeStart),
    admin.from("tour_groups").select("id").eq("status", "active"),
    admin
      .from("guide_assignments")
      .select("*", { count: "exact", head: true })
      .eq("status", "active"),
    admin
      .from("page_views")
      .select("path, session_id, viewer_type, created_at")
      .gte("created_at", rangeStart),
    admin.from("crisis_alerts").select("id").in("status", ["Active", "active"]),
    admin.from("incident_reports").select("id, status"),
  ]);

  const openIncidents = (allOpenIncidents || []).filter(
    (i) => !CLOSED_INCIDENT_STATUSES.includes(i.status)
  );

  const alertsIssued = bucketCountByPeriod(alertsInRange || [], "created_at", normalizedPeriod, timeZone);
  const incidentsReported = bucketCountByPeriod(
    incidentsInRange || [],
    "created_at",
    normalizedPeriod,
    timeZone
  );
  const resolvedAlertRows = (alertsResolvedInRange || []).map((a) =>
    a.resolved_at ? a : { ...a, resolved_at: a.created_at }
  );
  const alertsResolved = bucketCountByPeriod(
    resolvedAlertRows,
    "resolved_at",
    normalizedPeriod,
    timeZone
  );
  const incidentsClosed = bucketCountByPeriod(
    closureHistoryInRange || [],
    "created_at",
    normalizedPeriod,
    timeZone
  );

  const closureMap = buildClosureMap(allIncidents || [], allClosureHistory || []);
  const openIncidentBacklog = openIncidentBacklogSeries(
    allIncidents || [],
    normalizedPeriod,
    timeZone,
    closureMap
  );

  const dailyPageViews = bucketCountByPeriod(
    pageViewsInRange || [],
    "created_at",
    normalizedPeriod,
    timeZone
  );
  const dailyUniqueVisitors = bucketUniqueVisitorsByPeriod(
    pageViewsInRange || [],
    normalizedPeriod,
    timeZone
  );

  const alertsIssuedInPeriod = sumSeriesValues(alertsIssued);
  const incidentsReportedInPeriod = sumSeriesValues(incidentsReported);
  const alertsResolvedInPeriod = sumSeriesValues(alertsResolved);
  const incidentsClosedInPeriod = sumSeriesValues(incidentsClosed);

  return {
    kpis: {
      crisisEventsInPeriod: alertsIssuedInPeriod + incidentsReportedInPeriod,
      alertsIssuedInPeriod,
      incidentsReportedInPeriod,
      resolvedInPeriod: alertsResolvedInPeriod + incidentsClosedInPeriod,
      alertsResolvedInPeriod,
      incidentsClosedInPeriod,
      activeAlerts: activeAlertsRows?.length || 0,
      openIncidents: openIncidents.length,
      touristCount: touristCount || 0,
      onlineCount: onlineCount || 0,
      newTouristsInPeriod: newTouristsInPeriod || 0,
      activeTourGroups: activeTourGroups?.length || 0,
      assignedTourists: assignedTourists || 0,
    },
    series: {
      alertsIssued,
      incidentsReported,
      alertsResolved,
      incidentsClosed,
      openIncidentBacklog,
      dailyPageViews,
      dailyUniqueVisitors,
    },
    topPages: aggregatePageViews(pageViewsInRange || []).slice(0, 8),
    meta: {
      period: normalizedPeriod,
      periodLabel: periodConfig.label,
      chartTitle: periodConfig.chartTitle,
      granularity: periodConfig.granularity,
      bucketCount: periodConfig.count,
      timeZone,
      rangeStart,
      source: "database",
    },
  };
}
