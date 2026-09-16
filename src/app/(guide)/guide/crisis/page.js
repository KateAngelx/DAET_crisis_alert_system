"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle, Bell, MapPin, Clock, ShieldCheck, Users, Compass, ArrowRight, Navigation, Route,
} from "lucide-react";
import { OutlinedCard } from "@/app/components/ui/OutlinedCard";
import { Card } from "@/app/components/ui/Card";
import { outlinedCard } from "@/lib/designSystem";
import { GuidePageHeader } from "@/app/components/guide/GuidePageHeader";
import { DashboardStatCard } from "@/app/components/dashboard/DashboardStatCard";
import { StatCardSkeletonGrid } from "@/app/components/ui/Skeletons";
import { AsyncState, EmptyState } from "@/app/components/ui/AsyncState";
import { useAuthStore, useCrisisStore } from "@/app/store/crisisStore";
import { useGuideStore } from "@/app/store/guideStore";
import { useRouteAdvisoryStore } from "@/app/store/routeAdvisoryStore";
import { RouteListCard } from "@/app/components/routes/RouteListCard";
import { RouteDetailModal } from "@/app/components/routes/RouteDetailModal";
import { buildRouteCatalog } from "@/lib/routesUtils";
import { formatTourRoute, getRelevantRouteAdvisoriesForGroup } from "@/lib/tourGroupRoute";
import { iconSize, statGrid, typography, getSeverityOutline, portalLayout } from "@/lib/designSystem";
import { GuidePanel } from "@/app/components/guide/GuidePanel";
import { CardIconBox } from "@/app/components/ui/CardIconBox";
import { AlertSeverityIcon } from "@/app/components/ui/cardTypeIcons";
import { ROLE_INTERFACE } from "@/lib/roleInterfaceCopy";
import { RoleContextBanner } from "@/app/components/dashboard/RoleContextBanner";
import { GuideDashboardQuickActions } from "@/app/components/guide/GuideDashboardQuickActions";
import { PublicCategorizedCardList } from "@/app/components/shell/PublicCategorizedCardList";
import { PublicCardListPreview } from "@/app/components/shell/PublicCardListPreview";
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

  const catalog = useMemo(() => buildRouteCatalog(advisories), [advisories]);

  const relevantRouteAdvisories = useMemo(() => {
    const ids = new Set();
    activeGroups.forEach((group) => {
      getRelevantRouteAdvisoriesForGroup(catalog.published, group).forEach((a) => ids.add(a.id));
    });
    return [...catalog.active, ...catalog.affected, ...catalog.alternative].filter((r) => ids.has(r.advisoryId));
  }, [activeGroups, catalog.published, catalog.active, catalog.affected, catalog.alternative]);

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
          <PublicCardListPreview
            items={relevantRouteAdvisories}
            modalTitle="Route advisories for your groups"
            scrollPaneClassName={portalLayout.listScrollPane}
            renderItem={(route) => <RouteListCard route={route} onSelect={setSelectedRoute} />}
          />
        </Card>
      )}

      <div className={portalLayout.splitGrid}>
        <GuidePanel
          title="Alerts affecting your destinations"
          className={portalLayout.panelFill}
          bodyClassName={portalLayout.panelBodyStack}
          action={
            <Link href="/guide/crisis" className="text-[10px] font-black uppercase text-blue-600 hover:underline">
              View all
            </Link>
          }
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
            <PublicCategorizedCardList
              items={relevantAlerts}
              getCategory={(alert) => alert.type || alert.alert_type}
              getSeverity={(alert) => alert.severity}
              listPaneClassName={portalLayout.listScrollPane}
              modalTitle="Alerts affecting your destinations"
              modalSubtitle={`${relevantAlerts.length} relevant`}
              renderItem={(alert) => {
                const alertStyles = getSeverityOutline(alert.severity);
                return (
                  <OutlinedCard variant="severity" severity={alert.severity} padding={outlinedCard.statPadding}>
                    <div className="flex items-start gap-3">
                      <CardIconBox boxClass={alertStyles.icon}>
                        <AlertSeverityIcon severity={alert.severity} size={iconSize.stat} />
                      </CardIconBox>
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-1">
                          {alert.severity} · {alert.alert_type || alert.type}
                        </p>
                        <h3 className={`${typography.cardTitleBase} ${alertStyles.titleStatic}`}>{alert.title}</h3>
                        <p className="text-sm text-zinc-600 mt-2 line-clamp-2">{alert.description || alert.message}</p>
                        <div className="flex flex-wrap gap-3 mt-3 text-xs text-zinc-500">
                          {(alert.location || alert.affected_area) && (
                            <span className="flex items-center gap-1">
                              <MapPin size={12} /> {alert.location || alert.affected_area}
                            </span>
                          )}
                          {alert.created_at && (
                            <span className="flex items-center gap-1">
                              <Clock size={12} /> {new Date(alert.created_at).toLocaleString()}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </OutlinedCard>
                );
              }}
            />
          </AsyncState>
        </GuidePanel>

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
      </div>

      <GuideDashboardQuickActions />

      <RouteDetailModal
        open={!!selectedRoute}
        route={selectedRoute}
        catalog={catalog}
        onClose={() => setSelectedRoute(null)}
        onSelectRoute={setSelectedRoute}
      />
    </>
  );
}
