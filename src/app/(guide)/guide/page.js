"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Users, Bell, AlertTriangle, FileText, ArrowRight, Plus, Compass, ShieldCheck, Navigation, Route,
} from "lucide-react";
import { GuidePageHeader } from "@/app/components/guide/GuidePageHeader";
import { GuidePanel } from "@/app/components/guide/GuidePanel";
import { guideShell, iconSize, statGrid, typography, portalLayout } from "@/lib/designSystem";
import { DashboardStatCard } from "@/app/components/dashboard/DashboardStatCard";
import { DestinationModal } from "@/app/components/tour/DestinationModal";
import { TourGroupCard } from "@/app/components/tour/TourGroupCard";
import { RouteListCard } from "@/app/components/routes/RouteListCard";
import { RouteDetailModal } from "@/app/components/routes/RouteDetailModal";
import { StatCardSkeletonGrid } from "@/app/components/ui/Skeletons";
import { useAuthStore, useCrisisStore } from "@/app/store/crisisStore";
import { useGuideStore } from "@/app/store/guideStore";
import { useRouteAdvisoryStore } from "@/app/store/routeAdvisoryStore";
import { buildRouteCatalog } from "@/lib/routesUtils";
import { formatTourRoute, getRelevantRouteAdvisoriesForGroup } from "@/lib/tourGroupRoute";
import { ROLE_INTERFACE } from "@/lib/roleInterfaceCopy";
import { CompletedToursPanel } from "@/app/components/tour/CompletedToursPanel";
import { GuideDashboardQuickActions } from "@/app/components/guide/GuideDashboardQuickActions";
import { PublicCardListPreview } from "@/app/components/shell/PublicCardListPreview";
import { PublicCategorizedCardList } from "@/app/components/shell/PublicCategorizedCardList";
import { INCIDENT_SEVERITIES } from "@/lib/constants";

export default function GuideDashboard() {
  const { user } = useAuthStore();
  const { alerts, fetchAlerts, loading: alertsLoading } = useCrisisStore();
  const { advisories, fetchAdvisories } = useRouteAdvisoryStore();
  const {
    tourGroups,
    guideIncidents,
    groupMembers,
    fetchTourGroups,
    fetchGuideIncidents,
    fetchGroupMembers,
    updateTourGroupRoute,
    resetGuideScope,
    loading: guideLoading,
  } = useGuideStore();

  const [modalGroup, setModalGroup] = useState(null);
  const [selectedRoute, setSelectedRoute] = useState(null);

  const statsLoading = alertsLoading || guideLoading;

  const activeGroups = tourGroups.filter((g) => g.status === "active");
  const completedGroups = tourGroups.filter((g) => g.status === "completed");
  const catalog = useMemo(() => buildRouteCatalog(advisories), [advisories]);

  const groupRouteAdvisories = useMemo(() => {
    const map = new Map();
    activeGroups.forEach((group) => {
      const relevant = getRelevantRouteAdvisoriesForGroup(catalog.published, group);
      if (relevant.length > 0) map.set(group.id, { group, advisories: relevant });
    });
    return map;
  }, [activeGroups, catalog.published]);

  const relevantRouteItems = useMemo(() => {
    const ids = new Set();
    groupRouteAdvisories.forEach(({ advisories: items }) => items.forEach((a) => ids.add(a.id)));
    return [...catalog.affected, ...catalog.active, ...catalog.alternative].filter((r) => ids.has(r.advisoryId));
  }, [groupRouteAdvisories, catalog.affected, catalog.active, catalog.alternative]);

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
  const openIncidents = guideIncidents.filter(
    (i) => !["Resolved", "Closed", "Rejected"].includes(i.status)
  );
  const totalTourists = activeGroups.reduce((sum, g) => sum + (g.member_count || 0), 0);

  const openDestination = async (group) => {
    setModalGroup(group);
    if (user?.id) await fetchGroupMembers(group.id, user.id);
  };

  return (
    <>
      <GuidePageHeader
        title={`Welcome, ${user?.name || "Guide"}`}
        description={ROLE_INTERFACE.guide.dashboard.description}
        action={
          <Link href="/guide/groups" className={`${guideShell.btnGuide} no-underline`}>
            <Plus size={16} /> New Tour Group
          </Link>
        }
      />

      {statsLoading ? (
        <StatCardSkeletonGrid count={4} className={statGrid.dashboard} />
      ) : (
        <div className={statGrid.dashboard}>
          <DashboardStatCard compact label="Active Groups" value={activeGroups.length} icon={<Compass size={iconSize.stat} />} accent="purple" href="/guide/groups" hrefLabel="Manage" />
          <DashboardStatCard compact label="Active Tourists" value={totalTourists} icon={<Users size={iconSize.stat} />} accent="blue" href="/guide/tourists" hrefLabel="Manage" />
          <DashboardStatCard compact label="Completed Tours" value={completedGroups.length} icon={<ShieldCheck size={iconSize.stat} />} accent="green" href="/guide/completed" hrefLabel="View" />
          <DashboardStatCard compact label="Open Reports" value={openIncidents.length} icon={<FileText size={iconSize.stat} />} accent="orange" href="/guide/reports" hrefLabel="View" />
        </div>
      )}

      {criticalAlerts.length > 0 && (
        <GuidePanel title="Critical alert active" bodyClassName="bg-red-50/60">
          <div className="flex items-start gap-4">
            <AlertTriangle className="text-red-600 shrink-0" size={iconSize.section} />
            <div>
              <p className="text-xs font-black uppercase text-red-600 tracking-widest mb-1">Critical Alert Active</p>
              <p className="text-sm text-red-800 font-medium">
                {criticalAlerts.length} critical alert{criticalAlerts.length > 1 ? "s" : ""} active. Check on tourists in your tour groups.
              </p>
              <Link href="/guide/crisis" className="inline-flex items-center gap-2 mt-3 text-[10px] font-black uppercase text-red-600 tracking-widest hover:underline">
                View Advisories <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        </GuidePanel>
      )}

      {relevantRouteItems.length > 0 && (
        <GuidePanel title="Routes affecting your groups" bodyClassName={`bg-orange-50/50 ${portalLayout.panelBodyStack}`}>
          <div className="flex justify-end mb-3">
            <Link href="/guide/routes" className="text-[10px] font-black uppercase text-blue-600 hover:underline">
              All routes
            </Link>
          </div>
          <p className="text-sm text-orange-900 font-medium mb-4">
            {relevantRouteItems.length} published route advisories match your active tour group paths.
          </p>
          {activeGroups.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-4">
              {[...groupRouteAdvisories.values()].map(({ group, advisories: items }) => (
                <div key={group.id} className="p-3 bg-white/80 rounded-xl border border-orange-100 text-sm">
                  <p className="font-black text-zinc-900 uppercase text-xs">{group.name}</p>
                  <p className="text-blue-600 text-xs font-medium mt-0.5">{formatTourRoute(group)}</p>
                  <p className="text-[10px] font-black uppercase text-orange-700 mt-1">
                    {items.length} advis{items.length > 1 ? "ories" : "ory"} on this path
                  </p>
                </div>
              ))}
            </div>
          )}

          <PublicCardListPreview
            items={relevantRouteItems}
            modalTitle="Routes affecting your groups"
            listClassName="space-y-3"
            scrollPaneClassName={portalLayout.listScrollPane}
            renderItem={(route) => <RouteListCard route={route} onSelect={setSelectedRoute} />}
          />
        </GuidePanel>
      )}

      {activeAlerts.length > 0 && (
        <GuidePanel
          title="Active crisis alerts"
          bodyClassName={portalLayout.panelBodyStack}
          action={
            <Link href="/guide/crisis" className="text-[10px] font-black uppercase text-blue-600 hover:underline">
              Crisis Hub
            </Link>
          }
        >
          <PublicCategorizedCardList
            items={activeAlerts}
            getCategory={(alert) => alert.type}
            getSeverity={(alert) => alert.severity}
            listPaneClassName={portalLayout.listScrollPane}
            modalTitle="Active crisis alerts"
            renderItem={(alert) => (
              <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-100">
                <p className="text-[10px] font-black uppercase text-zinc-400">
                  {alert.severity} · {alert.type}
                </p>
                <p className="font-bold text-zinc-900 text-sm">{alert.title}</p>
              </div>
            )}
          />
        </GuidePanel>
      )}

      <GuidePanel
        title="Active tour groups"
        bodyClassName={portalLayout.panelBodyStack}
        action={
          <Link href="/guide/groups" className="text-[10px] font-black uppercase tracking-widest text-blue-600 hover:underline">
            View all
          </Link>
        }
      >
        {activeGroups.length > 0 ? (
          <PublicCardListPreview
            items={activeGroups}
            modalTitle="Active tour groups"
            listClassName="grid grid-cols-1 md:grid-cols-2 gap-4"
            scrollPaneClassName={portalLayout.listScrollPane}
            renderItem={(group) => (
              <TourGroupCard
                group={group}
                guideId={user?.id}
                compact
                onOpenDestination={openDestination}
                onCompleted={() => user?.id && fetchTourGroups(user.id)}
              />
            )}
          />
        ) : (
          <div className="py-10 text-center rounded-xl border border-dashed border-zinc-200 bg-zinc-50/50">
            <Compass size={40} className="mx-auto text-zinc-200 mb-3" />
            <p className="text-zinc-400 font-black uppercase text-xs">No active tour groups</p>
            <Link href="/guide/groups" className="inline-block mt-3 text-[10px] font-black uppercase text-blue-600 hover:underline">
              Create your first tour group
            </Link>
          </div>
        )}
      </GuidePanel>

      {completedGroups.length > 0 && (
        <GuidePanel
          title="Completed tours"
          action={
            <Link href="/guide/completed" className={`${guideShell.btnGhost} no-underline text-[10px] py-2`}>
              View all
            </Link>
          }
        >
          <CompletedToursPanel groups={completedGroups} guideId={user?.id} compact limit={2} />
        </GuidePanel>
      )}

      <GuidePanel title="History & records" subtitle="Completed work and closed reports">
        <div className="flex flex-wrap gap-3">
          <Link href="/guide/history" className={`${guideShell.btnGuide} no-underline`}>
            Open history
          </Link>
          <Link href="/guide/completed" className={`${guideShell.btnGhost} no-underline`}>
            Completed tours
          </Link>
          <Link href="/guide/reports" className={`${guideShell.btnGhost} no-underline`}>
            Group reports
          </Link>
        </div>
      </GuidePanel>

      <GuideDashboardQuickActions showCompleted={false} />

      {openIncidents.length > 0 && (
        <GuidePanel
          title="Group reports"
          bodyClassName={portalLayout.panelBodyStack}
          action={
            <Link href="/guide/reports" className={`${guideShell.btnGhost} no-underline text-[10px] py-2`}>
              View all
            </Link>
          }
        >
          <PublicCategorizedCardList
            items={openIncidents}
            getCategory={(inc) => inc.category}
            getSeverity={(inc) => inc.severity}
            categoryLabel="Report category"
            severityOrder={[...INCIDENT_SEVERITIES].reverse()}
            listPaneClassName={portalLayout.listScrollPane}
            modalTitle="Group reports"
            renderItem={(inc) => (
              <Link href={`/guide/reports/${inc.id}`} className="block no-underline">
                <div className="rounded-xl border border-zinc-200 p-4 hover:border-zinc-300 transition-colors">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="font-mono text-xs text-blue-600 font-black">{inc.reference_number}</p>
                      <h3 className="font-black text-zinc-900 uppercase text-sm">{inc.category}</h3>
                      <p className="text-sm text-zinc-500 line-clamp-1">{inc.description}</p>
                    </div>
                    <ArrowRight size={18} className="text-zinc-400 shrink-0" />
                  </div>
                </div>
              </Link>
            )}
          />
        </GuidePanel>
      )}
      <DestinationModal
        open={!!modalGroup}
        onClose={() => setModalGroup(null)}
        group={modalGroup}
        guide={user ? { full_name: user.name, phone: user.phone, email: user.email } : null}
        members={groupMembers}
        alerts={alerts}
        routeAdvisories={advisories}
        editable
        onSave={async (updates) => {
          const result = await updateTourGroupRoute(modalGroup.id, user.id, updates);
          if (result.success) setModalGroup(result.group);
          return result;
        }}
      />
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

