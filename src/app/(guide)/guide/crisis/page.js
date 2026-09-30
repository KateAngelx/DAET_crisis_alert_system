"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle, Bell, ShieldCheck, Users, Compass, ArrowRight, Navigation, Route,
} from "lucide-react";
import { Card } from "@/app/components/ui/Card";
import { GuidePageHeader } from "@/app/components/guide/GuidePageHeader";
import { DashboardStatCard } from "@/app/components/dashboard/DashboardStatCard";
import { MapSkeleton, StatCardSkeletonGrid } from "@/app/components/ui/Skeletons";
import { AsyncState, EmptyState } from "@/app/components/ui/AsyncState";
import { useAuthStore, useCrisisStore } from "@/app/store/crisisStore";
import { useGuideStore } from "@/app/store/guideStore";
import { useRouteAdvisoryStore } from "@/app/store/routeAdvisoryStore";
import { RouteDetailModal } from "@/app/components/routes/RouteDetailModal";
import { CrisisHubMap } from "@/app/components/maps/CrisisHubMap";
import { AlertDetailModal } from "@/app/components/crisis/AlertDetailModal";
import { CategoryFilterSelect, StatusRecordList } from "@/app/components/shell/StatusRecordList";
import {
  DEFAULT_CRISIS_TYPE_OPTIONS,
  DEFAULT_SEVERITY_ORDER,
} from "@/app/components/shell/PublicCategorizedCardFilters";
import { buildRouteCatalog, getRouteStatusStyles } from "@/lib/routesUtils";
import { formatTourRoute, getRelevantRouteAdvisoriesForGroup } from "@/lib/tourGroupRoute";
import { iconSize, statGrid, getSeverityOutline, portalLayout } from "@/lib/designSystem";
import { GuidePanel } from "@/app/components/guide/GuidePanel";
import { ROLE_INTERFACE } from "@/lib/roleInterfaceCopy";
import { RoleContextBanner } from "@/app/components/dashboard/RoleContextBanner";
import { GuideDashboardQuickActions } from "@/app/components/guide/GuideDashboardQuickActions";
import { PublicCategorizedCardList } from "@/app/components/shell/PublicCategorizedCardList";
import { INCIDENT_SEVERITIES } from "@/lib/constants";

export default function GuideCrisisHubPage() {
  const { user } = useAuthStore();
  const { alerts, fetchAlerts, loading: alertsLoading, error: alertsError } = useCrisisStore();
  const {
    tourGroups,
    guideIncidents,
    fetchTourGroups,
    fetchGuideIncidents,
    resetGuideScope,
    loading: guideLoading,
  } = useGuideStore();
  const { advisories, fetchAdvisories } = useRouteAdvisoryStore();
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [severityFilter, setSeverityFilter] = useState("all");

  useEffect(() => {
    if (!user?.id) return;
    resetGuideScope();
    fetchTourGroups(user.id);
    fetchGuideIncidents(user.id);
    fetchAlerts();
    fetchAdvisories();
  }, [user?.id, resetGuideScope, fetchTourGroups, fetchGuideIncidents, fetchAlerts, fetchAdvisories]);

  const activeAlerts = alerts.filter((a) => a.status === "Active" && a.is_public);
  const criticalAlerts = activeAlerts.filter((a) => a.severity === "Critical");
  const activeGroups = tourGroups.filter((g) => g.status === "active");
  const totalTourists = activeGroups.reduce((sum, g) => sum + (g.member_count || 0), 0);
  const openIncidents = guideIncidents.filter(
    (i) => !["Resolved", "Closed", "Rejected"].includes(i.status)
  );

  const guideDestinations = useMemo(
    () => [...new Set(activeGroups.map((g) => g.destination?.toLowerCase()).filter(Boolean))],
    [activeGroups]
  );

  const relevantAlerts = useMemo(() => {
    if (guideDestinations.length === 0) return activeAlerts;
    return activeAlerts.filter((alert) => {
      const loc = (alert.location || alert.affected_area || "").toLowerCase();
      return guideDestinations.some((dest) => loc.includes(dest) || dest.includes(loc));
    });
  }, [activeAlerts, guideDestinations]);

  const filteredAlerts = useMemo(() => {
    return relevantAlerts.filter((alert) => {
      const type = alert.type || alert.alert_type || "General";
      if (categoryFilter !== "all" && type !== categoryFilter) return false;
      if (severityFilter !== "all" && alert.severity !== severityFilter) return false;
      return true;
    });
  }, [relevantAlerts, categoryFilter, severityFilter]);

  const alertRows = filteredAlerts.map((alert) => ({
    id: alert.id,
    status: alert.severity || "Low",
    statusClass: getSeverityOutline(alert.severity).badge,
    place: alert.location || alert.affected_area || alert.title,
    type: alert.type || alert.alert_type || "General",
    when: alert.created_at ? new Date(alert.created_at).toLocaleString() : "—",
    onSelect: () => setSelectedAlert(alert),
    ariaLabel: "View alert details",
  }));

  const catalog = useMemo(() => buildRouteCatalog(advisories), [advisories]);

  const relevantRouteAdvisories = useMemo(() => {
    const ids = new Set();
    activeGroups.forEach((group) => {
      getRelevantRouteAdvisoriesForGroup(catalog.published, group).forEach((a) => ids.add(a.id));
    });
    return [...catalog.active, ...catalog.affected, ...catalog.alternative].filter((r) => ids.has(r.advisoryId));
  }, [activeGroups, catalog.published, catalog.active, catalog.affected, catalog.alternative]);

  const routeRows = relevantRouteAdvisories.map((route) => ({
    id: route.id,
    status: route.statusLabel || getRouteStatusStyles(route.status).label,
    statusClass: getRouteStatusStyles(route.status).badge,
    place: [route.from, route.to].filter(Boolean).join(" → "),
    type: route.subtitle,
    when: route.timeRange || "—",
    onSelect: () => setSelectedRoute(route),
    ariaLabel: "View route details",
  }));

  const statsLoading = alertsLoading || guideLoading;

  return (
    <>
      <GuidePageHeader
        title={ROLE_INTERFACE.guide.crisis.title}
        description={ROLE_INTERFACE.guide.crisis.description}
        action={
          <Link
            href="/guide/routes"
            className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-blue-700 transition-colors"
          >
            <Route size={16} /> Roads & Travel
          </Link>
        }
      />

      <RoleContextBanner helper={ROLE_INTERFACE.guide.crisis.helper} tone="info" />

      {statsLoading ? (
        <StatCardSkeletonGrid count={4} className={statGrid.dashboard} />
      ) : (
        <div className={statGrid.dashboard}>
          <DashboardStatCard compact label="Active Alerts" value={activeAlerts.length} icon={<Bell size={iconSize.stat} />} accent="red" href="/guide/crisis" hrefLabel="View" />
          <DashboardStatCard compact label="Critical" value={criticalAlerts.length} icon={<AlertTriangle size={iconSize.stat} />} accent="red" />
          <DashboardStatCard compact label="Your Tourists" value={totalTourists} icon={<Users size={iconSize.stat} />} accent="blue" href="/guide/groups" hrefLabel="Groups" />
          <DashboardStatCard compact label="Open Reports" value={openIncidents.length} icon={<ShieldCheck size={iconSize.stat} />} accent="orange" href="/guide/reports" hrefLabel="Reports" />
        </div>
      )}

      {criticalAlerts.length > 0 && (
        <Card className="p-5 bg-red-50 border-red-200">
          <div className="flex items-start gap-4">
            <AlertTriangle className="text-red-600 shrink-0" size={iconSize.section} />
            <div>
              <p className="text-xs font-black uppercase text-red-600 tracking-widest mb-1">Critical Alert Active</p>
              <p className="text-sm text-red-800 font-medium">
                {criticalAlerts.length} critical alert{criticalAlerts.length > 1 ? "s" : ""} require immediate attention. Contact tourists in your active tour groups.
              </p>
            </div>
          </div>
        </Card>
      )}

      {relevantRouteAdvisories.length > 0 && (
        <Card className="p-5 bg-orange-50 border-orange-200">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex items-start gap-4">
              <Navigation className="text-orange-600 shrink-0" size={iconSize.section} />
              <div>
                <p className="text-xs font-black uppercase text-orange-600 tracking-widest mb-1">Route Advisories for Your Groups</p>
                <p className="text-sm text-orange-800 font-medium">
                  {relevantRouteAdvisories.length} route{relevantRouteAdvisories.length > 1 ? "s" : ""} affecting your active tour groups. Review alternatives before travel.
                </p>
              </div>
            </div>
            <Link href="/guide/routes" className="text-[10px] font-black uppercase text-blue-600 hover:underline shrink-0">
              View all routes
            </Link>
          </div>
          <StatusRecordList
            rows={routeRows}
            emptyMessage="No route advisories match your active tour groups."
          />
        </Card>
      )}

      <div className={portalLayout.splitGrid}>
        <GuidePanel
          title="Alerts affecting your destinations"
          subtitle="Status, place, type, and when. View opens the full details."
          className={portalLayout.panelFill}
          bodyClassName={portalLayout.panelBodyStack}
        >
          <AsyncState
            loading={alertsLoading}
            error={alertsError}
            isEmpty={!alertsLoading && !alertsError && relevantAlerts.length === 0}
            onRetry={fetchAlerts}
            emptyFallback={
              <EmptyState
                icon={ShieldCheck}
                title="No relevant alerts"
                description="No active advisories match your current tour destinations."
              />
            }
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
              <CategoryFilterSelect
                label="Crisis type"
                value={categoryFilter}
                onChange={setCategoryFilter}
                options={DEFAULT_CRISIS_TYPE_OPTIONS}
              />
              <CategoryFilterSelect
                label="Severity"
                value={severityFilter}
                onChange={setSeverityFilter}
                options={DEFAULT_SEVERITY_ORDER}
              />
            </div>
            <StatusRecordList
              rows={alertRows}
              emptyMessage="No alerts match this filter."
            />
          </AsyncState>
        </GuidePanel>

        <GuidePanel
          title="Affected areas map"
          subtitle="Pins follow the filters above"
          className={`${portalLayout.panelFill} ${selectedAlert ? "pointer-events-none opacity-40" : ""}`}
          noPadding
          bodyClassName={portalLayout.mapColumnBody}
        >
          {alertsLoading ? (
            <MapSkeleton height={portalLayout.mapColumnFill} />
          ) : (
            <CrisisHubMap
              alerts={filteredAlerts}
              warnings={[]}
              showWarnings={false}
              showTouristSpots={false}
              fitToAlerts
              heightClass={portalLayout.mapColumnFill}
            />
          )}
        </GuidePanel>
      </div>

      <GuidePanel
        title="Your active tour groups"
        className={portalLayout.panelFill}
        bodyClassName={portalLayout.panelBodyStack}
        action={
          <Link href="/guide/groups" className="text-[10px] font-black uppercase text-blue-600 hover:underline">
            Manage
          </Link>
        }
      >
          {activeGroups.length === 0 ? (
            <Card className="p-8 text-center border-zinc-100">
              <Compass size={32} className="mx-auto text-zinc-200 mb-2" />
              <p className="text-xs font-black uppercase text-zinc-400">No active tour groups</p>
            </Card>
          ) : (
            <div className={`space-y-3 ${portalLayout.listScrollPane}`}>
              {activeGroups.map((group) => (
                <Link key={group.id} href={`/guide/groups/${group.id}`} className="block no-underline">
                  <Card className="p-4 border-zinc-100 hover:shadow-md transition-all">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h3 className="font-black text-zinc-900 uppercase text-sm">{group.name}</h3>
                        <p className="text-xs text-blue-600 font-medium">{formatTourRoute(group)}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xl font-black text-blue-600">{group.member_count || 0}</p>
                        <p className="text-[10px] font-black uppercase text-zinc-400">Tourists</p>
                      </div>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          )}

          {openIncidents.length > 0 && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-black uppercase tracking-widest text-zinc-400">Recent Group Reports</h2>
                <Link href="/guide/reports" className="text-[10px] font-black uppercase text-blue-600 hover:underline flex items-center gap-1">
                  All reports <ArrowRight size={12} />
                </Link>
              </div>
              <PublicCategorizedCardList
                items={openIncidents}
                getCategory={(inc) => inc.category}
                getSeverity={(inc) => inc.severity}
                categoryLabel="Report category"
                severityOrder={[...INCIDENT_SEVERITIES].reverse()}
                listPaneClassName={portalLayout.listScrollPane}
                modalTitle="Recent group reports"
                renderItem={(inc) => (
                  <Link href={`/guide/reports/${inc.id}`} className="block no-underline">
                    <Card className="p-4 border-zinc-100 hover:shadow-md transition-all">
                      <p className="font-mono text-xs text-blue-600 font-black">{inc.reference_number}</p>
                      <h3 className="font-black text-zinc-900 uppercase text-sm">{inc.category}</h3>
                      <p className="text-xs text-zinc-500 line-clamp-1 mt-1">{inc.description}</p>
                    </Card>
                  </Link>
                )}
              />
            </div>
          )}
        </GuidePanel>

      <GuideDashboardQuickActions />

      <RouteDetailModal
        open={!!selectedRoute}
        route={selectedRoute}
        catalog={catalog}
        onClose={() => setSelectedRoute(null)}
        onSelectRoute={setSelectedRoute}
      />

      <AlertDetailModal alert={selectedAlert} onClose={() => setSelectedAlert(null)} />
    </>
  );
}
