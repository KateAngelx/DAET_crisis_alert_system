"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Users, FileText, Plus, Compass, ShieldCheck,
} from "lucide-react";
import { GuidePageHeader } from "@/app/components/guide/GuidePageHeader";
import { GuidePanel } from "@/app/components/guide/GuidePanel";
import { guideShell, iconSize, statGrid, portalLayout } from "@/lib/designSystem";
import { DashboardStatCard } from "@/app/components/dashboard/DashboardStatCard";
import { DestinationModal } from "@/app/components/tour/DestinationModal";
import { TourGroupCard } from "@/app/components/tour/TourGroupCard";
import { ListPager } from "@/app/components/shell/ListPager";
import { StatCardSkeletonGrid } from "@/app/components/ui/Skeletons";
import { useAuthStore, useCrisisStore } from "@/app/store/crisisStore";
import { useGuideStore } from "@/app/store/guideStore";
import { useRouteAdvisoryStore } from "@/app/store/routeAdvisoryStore";
import { ROLE_INTERFACE } from "@/lib/roleInterfaceCopy";
import { GuideEmergencyReporting } from "@/app/components/guide/GuideEmergencyReporting";
import { getActiveSession } from "@/lib/authSession";

export default function GuideDashboard() {
  const { user } = useAuthStore();
  const { alerts, fetchAlerts, loading: alertsLoading } = useCrisisStore();
  const { advisories, fetchAdvisories } = useRouteAdvisoryStore();
  const [waitingAssistance, setWaitingAssistance] = useState(0);
  const [groupPage, setGroupPage] = useState(1);
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

  const statsLoading = alertsLoading || guideLoading;

  const activeGroups = tourGroups.filter((g) => g.status === "active");
  const completedGroups = tourGroups.filter((g) => g.status === "completed");

  useEffect(() => {
    if (!user?.id) return;
    resetGuideScope();
    fetchTourGroups(user.id);
    fetchGuideIncidents(user.id);
    fetchAlerts();
    fetchAdvisories();
  }, [user?.id, resetGuideScope, fetchTourGroups, fetchGuideIncidents, fetchAlerts, fetchAdvisories]);

  useEffect(() => {
    if (!user?.id) return undefined;
    let cancelled = false;
    async function loadWaiting() {
      const session = await getActiveSession();
      if (!session?.access_token || cancelled) return;
      const response = await fetch("/api/guide/assistance", {
        headers: { Authorization: `Bearer ${session.access_token}` },
        cache: "no-store",
      });
      const result = await response.json().catch(() => ({}));
      if (!cancelled && response.ok) {
        setWaitingAssistance((result.requests || []).filter((item) => item.status === "Assigned").length);
      }
    }
    loadWaiting();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const activeAlerts = alerts.filter((a) => a.status === "Active" && a.is_public);
  const criticalAlerts = activeAlerts.filter((a) => a.severity === "Critical");
  const openIncidents = guideIncidents.filter(
    (i) => !["Resolved", "Closed", "Rejected"].includes(i.status)
  );
  const totalTourists = activeGroups.reduce((sum, g) => sum + (g.member_count || 0), 0);

  const groupPageSize = 5;
  const groupPageCount = Math.max(1, Math.ceil(activeGroups.length / groupPageSize));
  const safeGroupPage = Math.min(groupPage, groupPageCount);
  const visibleGroups = activeGroups.slice((safeGroupPage - 1) * groupPageSize, safeGroupPage * groupPageSize);

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

      <GuideEmergencyReporting />

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

      {waitingAssistance > 0 || criticalAlerts.length > 0 ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-950">
          <p className="text-[10px] font-black uppercase tracking-widest text-amber-700">Needs you</p>
          {waitingAssistance > 0 ? (
            <Link href="/guide/assistance" className="mt-1 block text-amber-950 hover:underline">
              {waitingAssistance} assistance request{waitingAssistance === 1 ? "" : "s"} waiting.
            </Link>
          ) : null}
          {criticalAlerts.length > 0 ? (
            <Link href="/guide/crisis" className="mt-1 block text-amber-950 hover:underline">
              {criticalAlerts.length} critical alert{criticalAlerts.length === 1 ? "" : "s"}.
            </Link>
          ) : null}
        </div>
      ) : null}

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
          <>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {visibleGroups.map((group) => (
                <TourGroupCard
                  key={group.id}
                  group={group}
                  guideId={user?.id}
                  compact
                  onOpenDestination={openDestination}
                  onCompleted={() => user?.id && fetchTourGroups(user.id)}
                />
              ))}
            </div>
            <ListPager page={safeGroupPage} pageCount={groupPageCount} onPage={setGroupPage} />
          </>
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
    </>
  );
}
