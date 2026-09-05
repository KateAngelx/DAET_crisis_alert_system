"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Users, Bell, AlertTriangle, FileText, ArrowRight, MapPin, Plus, Compass, ShieldCheck, Navigation,
} from "lucide-react";
import { Card } from "@/app/components/ui/Card";
import { DashboardPageHeader } from "@/app/components/dashboard/DashboardPageHeader";
import { DashboardStatCard } from "@/app/components/dashboard/DashboardStatCard";
import { DestinationButton, DestinationModal } from "@/app/components/tour/DestinationModal";
import { StatCardSkeletonGrid } from "@/app/components/ui/Skeletons";
import { useAuthStore, useCrisisStore } from "@/app/store/crisisStore";
import { useGuideStore } from "@/app/store/guideStore";
import { formatTourRoute } from "@/lib/tourGroupRoute";
import { iconSize, statGrid, typography } from "@/lib/designSystem";

export default function GuideDashboard() {
  const { user } = useAuthStore();
  const { alerts, fetchAlerts, loading: alertsLoading } = useCrisisStore();
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

  useEffect(() => {
    if (!user?.id) return;
    resetGuideScope();
    fetchTourGroups(user.id);
    fetchGuideIncidents(user.id);
    fetchAlerts();

  }, [user?.id, resetGuideScope, fetchTourGroups, fetchGuideIncidents, fetchAlerts]);

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
    <div className="space-y-6 text-left">
      <DashboardPageHeader
        title={`Welcome, ${user?.name || "Guide"}`}
        description="Manage your tour groups, monitor assigned tourists, and stay updated on crisis alerts."
        action={
          <Link
            href="/guide/groups"
            className="flex items-center gap-2 bg-purple-600 text-white px-5 py-2.5 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-purple-700 transition-colors"
          >
            <Plus size={16} /> New Tour Group
          </Link>
        }
      />

      {statsLoading ? (
        <StatCardSkeletonGrid count={4} className={statGrid.dashboard} />
      ) : (
        <div className={statGrid.dashboard}>
          <DashboardStatCard label="Active Tour Groups" value={activeGroups.length} icon={<Compass size={iconSize.stat} />} accent="purple" href="/guide/groups" hrefLabel="Manage" />
          <DashboardStatCard label="Tourists in Groups" value={totalTourists} icon={<Users size={iconSize.stat} />} accent="blue" href="/guide/tourists" hrefLabel="Manage" />
          <DashboardStatCard label="Active Alerts" value={activeAlerts.length} icon={<Bell size={iconSize.stat} />} accent="red" href="/guide/alerts" hrefLabel="View" />
          <DashboardStatCard label="Open Reports" value={openIncidents.length} icon={<FileText size={iconSize.stat} />} accent="orange" href="/guide/reports" hrefLabel="View" />
        </div>
      )}

      {criticalAlerts.length > 0 && (
        <Card className="p-5 bg-red-50 border-red-200">
          <div className="flex items-start gap-4">
            <AlertTriangle className="text-red-600 shrink-0" size={iconSize.section} />
            <div>
              <p className="text-xs font-black uppercase text-red-600 tracking-widest mb-1">Critical Alert Active</p>
              <p className="text-sm text-red-800 font-medium">
                {criticalAlerts.length} critical alert{criticalAlerts.length > 1 ? "s" : ""} active. Check on tourists in your tour groups.
              </p>
              <Link href="/guide/alerts" className="inline-flex items-center gap-2 mt-3 text-[10px] font-black uppercase text-red-600 tracking-widest hover:underline">
                View Advisories <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        </Card>
      )}

      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className={`${typography.sectionTitle} flex items-center gap-2`}>
            <ShieldCheck size={16} /> Crisis Overview
          </h2>
          <Link href="/guide/crisis" className="text-[10px] font-black uppercase tracking-widest text-blue-600 hover:underline">
            Open Crisis Hub
          </Link>
        </div>
        <Card className="p-5 border-zinc-100">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-[10px] font-black uppercase text-zinc-400 mb-1">Active Advisories</p>
              <p className="text-2xl font-black text-zinc-900">{activeAlerts.length}</p>
            </div>
            <div>
              <p className="text-[10px] font-black uppercase text-zinc-400 mb-1">Critical</p>
              <p className="text-2xl font-black text-red-600">{criticalAlerts.length}</p>
            </div>
            <div>
              <p className="text-[10px] font-black uppercase text-zinc-400 mb-1">Open Group Reports</p>
              <p className="text-2xl font-black text-orange-600">{openIncidents.length}</p>
            </div>
          </div>
          {activeAlerts.slice(0, 2).map((alert) => (
            <div key={alert.id} className="mt-4 pt-4 border-t border-zinc-100">
              <p className="text-[10px] font-black uppercase text-zinc-400">{alert.severity}</p>
              <p className="font-bold text-zinc-900 text-sm">{alert.title}</p>
            </div>
          ))}
        </Card>
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className={typography.sectionTitle}>Your Tour Groups</h2>
          <Link href="/guide/groups" className="text-[10px] font-black uppercase tracking-widest text-blue-600 hover:underline">
            View all
          </Link>
        </div>
        {activeGroups.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeGroups.slice(0, 4).map((group) => (
              <Card key={group.id} className="p-5 border-zinc-100 hover:shadow-md transition-all h-full flex flex-col">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-black text-zinc-900 uppercase tracking-tight">{group.name}</h3>
                    <p className="text-xs font-bold text-blue-600 flex items-center gap-1 mt-1">
                      <Navigation size={12} /> {formatTourRoute(group)}
                    </p>
                  </div>
                  <span className="text-[10px] font-black uppercase px-2 py-1 rounded-full bg-green-100 text-green-700 shrink-0">
                    {group.status}
                  </span>
                </div>
                <p className="text-sm text-zinc-600 mt-3 line-clamp-2 flex-1">{group.trip_info || "No trip details added."}</p>
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-zinc-100">
                  <p className="text-[10px] font-black uppercase text-zinc-400">
                    {group.member_count || 0} tourist{(group.member_count || 0) !== 1 ? "s" : ""}
                  </p>
                  <div className="flex items-center gap-2">
                    <DestinationButton onClick={() => openDestination(group)} />
                    <Link href={`/guide/groups/${group.id}`} className="p-1.5 hover:bg-zinc-100 rounded-lg">
                      <ArrowRight size={16} className="text-zinc-400" />
                    </Link>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="p-10 text-center border-zinc-100">
            <Compass size={40} className="mx-auto text-zinc-200 mb-3" />
            <p className="text-zinc-400 font-black uppercase text-xs">No tour groups yet</p>
            <Link href="/guide/groups" className="inline-block mt-3 text-[10px] font-black uppercase text-blue-600 hover:underline">
              Create your first tour group
            </Link>
          </Card>
        )}
      </div>

      {openIncidents.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className={typography.sectionTitle}>Group Reports</h2>
            <Link href="/guide/reports" className="text-[10px] font-black uppercase tracking-widest text-blue-600 hover:underline">
              View all
            </Link>
          </div>
          <div className="space-y-3">
            {openIncidents.slice(0, 5).map((inc) => (
              <Link key={inc.id} href={`/guide/reports/${inc.id}`} className="block no-underline">
                <Card className="p-5 border-zinc-100 hover:shadow-md transition-all">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="font-mono text-xs text-blue-600 font-black">{inc.reference_number}</p>
                      <h3 className="font-black text-zinc-900 uppercase text-sm">{inc.category}</h3>
                      <p className="text-sm text-zinc-500 line-clamp-1">{inc.description}</p>
                    </div>
                    <ArrowRight size={18} className="text-zinc-400 shrink-0" />
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}
      <DestinationModal
        open={!!modalGroup}
        onClose={() => setModalGroup(null)}
        group={modalGroup}
        guide={user ? { full_name: user.name, phone: user.phone, email: user.email } : null}
        members={groupMembers}
        alerts={alerts}
        editable
        onSave={async (updates) => {
          const result = await updateTourGroupRoute(modalGroup.id, user.id, updates);
          if (result.success) setModalGroup(result.group);
          return result;
        }}
      />
    </div>
  );
}

