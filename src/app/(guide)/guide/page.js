"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Users, Plus, Compass, ShieldCheck,
} from "lucide-react";
import { GuidePageHeader } from "@/app/components/guide/GuidePageHeader";
import { GuidePanel } from "@/app/components/guide/GuidePanel";
import { guideShell, iconSize, statGrid, portalLayout } from "@/lib/designSystem";
import { DashboardStatCard } from "@/app/components/dashboard/DashboardStatCard";
import { DestinationModal } from "@/app/components/tour/DestinationModal";
import { TourGroupCard } from "@/app/components/tour/TourGroupCard";
import { StatCardSkeletonGrid } from "@/app/components/ui/Skeletons";
import { useAuthStore, useCrisisStore } from "@/app/store/crisisStore";
import { useGuideStore } from "@/app/store/guideStore";
import { useRouteAdvisoryStore } from "@/app/store/routeAdvisoryStore";
import { ROLE_INTERFACE } from "@/lib/roleInterfaceCopy";
import { GuideEmergencyReporting } from "@/app/components/guide/GuideEmergencyReporting";
import { getActiveSession } from "@/lib/authSession";
import { isTourPastEndDate } from "@/lib/tourGroupRoute";

export default function GuideDashboard() {
  const { user } = useAuthStore();
  const { alerts, fetchAlerts, loading: alertsLoading } = useCrisisStore();
  const { advisories, fetchAdvisories } = useRouteAdvisoryStore();
  const [waitingAssistance, setWaitingAssistance] = useState(0);
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
  const overdueGroups = activeGroups.filter(isTourPastEndDate);
  const totalTourists = activeGroups.reduce((sum, g) => sum + (g.member_count || 0), 0);

  const visibleGroups = activeGroups.slice(0, 3);
  const attentionItems = [
    ...(waitingAssistance > 0
      ? [{
          id: "assistance",
          href: "/guide/assistance",
          title: `${waitingAssistance} assistance request${waitingAssistance === 1 ? "" : "s"}`,
          description: "Waiting for your response",
        }]
      : []),
    ...(criticalAlerts.length > 0
      ? [{
          id: "critical-alerts",
          href: "/guide/crisis",
          title: `${criticalAlerts.length} critical alert${criticalAlerts.length === 1 ? "" : "s"}`,
          description: "Review current safety information",
        }]
      : []),
    ...(openIncidents.length > 0
      ? [{
          id: "reports",
          href: "/guide/reports",
          title: `${openIncidents.length} open report${openIncidents.length === 1 ? "" : "s"}`,
          description: "Follow up on reports",
        }]
      : []),
    ...overdueGroups.map((group) => ({
      id: group.id,
      href: `/guide/groups/${group.id}`,
      title: group.name,
      description: "End date reached — review and mark done when safe",
    })),
  ];

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

      {attentionItems.length > 0 ? (
        <section
          aria-labelledby="guide-needs-attention"
          className="overflow-hidden rounded-2xl border border-amber-200 bg-white"
        >
          <h2 id="guide-needs-attention" className="bg-amber-50 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-amber-800 sm:px-5">
            Needs your attention <span className="ml-1 text-amber-600">({attentionItems.length})</span>
          </h2>
          <ul className="divide-y divide-zinc-100">
            {attentionItems.map((item) => (
              <li key={item.id}>
                <Link
                  href={item.href}
                  className="flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-amber-50/50 sm:px-5"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-bold text-zinc-900">{item.title}</span>
                    <span className="mt-0.5 block text-xs font-medium text-zinc-500">{item.description}</span>
                  </span>
                  <span aria-hidden="true" className="shrink-0 text-[10px] font-black uppercase tracking-widest text-amber-700">
                    Review
                  </span>
              </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {statsLoading ? (
        <StatCardSkeletonGrid count={3} className={statGrid.dashboardThree} />
      ) : (
        <div className={statGrid.dashboardThree}>
          <DashboardStatCard compact label="Active Groups" value={activeGroups.length} icon={<Compass size={iconSize.stat} />} accent="purple" href="/guide/groups" hrefLabel="Manage" />
          <DashboardStatCard compact label="Active Tourists" value={totalTourists} icon={<Users size={iconSize.stat} />} accent="blue" href="/guide/tourists" hrefLabel="Manage" />
          <DashboardStatCard compact label="Completed Tours" value={completedGroups.length} icon={<ShieldCheck size={iconSize.stat} />} accent="green" href="/guide/completed" hrefLabel="View" />
        </div>
      )}

      <GuidePanel
        title="Active tour groups"
        badgeCount={activeGroups.length}
        badgeLabel="active"
        badgeTone="green"
        bodyClassName={portalLayout.panelBodyStack}
        action={
          <Link href="/guide/groups" className="text-[10px] font-black uppercase tracking-widest text-blue-600 hover:underline">
            View all
          </Link>
        }
      >
        {activeGroups.length > 0 ? (
          <>
            <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white divide-y divide-zinc-100">
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
            {activeGroups.length > visibleGroups.length ? (
              <p className="text-center text-xs font-medium text-zinc-500">
                Showing {visibleGroups.length} of {activeGroups.length} active groups
              </p>
            ) : null}
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
