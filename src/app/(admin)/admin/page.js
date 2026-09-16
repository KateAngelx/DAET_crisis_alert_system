"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Bell,
  Clock,
  FileWarning,
  Radio,
  Users,
} from "lucide-react";
import { Card } from "@/app/components/ui/Card";
import { DashboardPageHeader } from "@/app/components/dashboard/DashboardPageHeader";
import { DashboardStatCard } from "@/app/components/dashboard/DashboardStatCard";
import { useCrisisStore } from "@/app/store/crisisStore";
import { useDangerousLocationStore } from "@/app/store/dangerousLocationStore";
import { useIncidentStore } from "@/app/store/incidentStore";
import {
  AlertCardSkeletonList,
  ReportCardSkeletonList,
  StatCardSkeletonGrid,
} from "@/app/components/ui/Skeletons";
import { ErrorState } from "@/app/components/ui/AsyncState";
import { getStatusColor } from "@/lib/constants";
import { iconSize, statGrid, portalLayout } from "@/lib/designSystem";
import { ROLE_INTERFACE } from "@/lib/roleInterfaceCopy";
import { RoleContextBanner } from "@/app/components/dashboard/RoleContextBanner";
import { AdminDashboardCharts } from "@/app/components/dashboard/AdminDashboardCharts";
import { AdminDashboardActivityPanel } from "@/app/components/dashboard/AdminDashboardActivityPanel";
import { PublicCardListPreview } from "@/app/components/shell/PublicCardListPreview";
import { AdminQuickActions } from "@/app/components/admin/AdminQuickActions";
import { AdminPanel } from "@/app/components/admin/AdminPanel";

const PENDING_STATUSES = ["Submitted", "Approved", "Received", "Under Review"];
const ACTION_STATUSES = ["Assigned", "Responding"];
const CLOSED_STATUSES = ["Resolved", "Closed", "Rejected"];

function formatRelativeTime(date) {
  if (!date) return "—";
  const d = new Date(date);
  const diffMs = Date.now() - d.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return d.toLocaleString();
}

export default function AdminDashboard() {
  const {
    alerts,
    totalUsers,
    userStats,
    fetchTotalUsers,
    fetchUserStats,
    fetchAlerts,
    loading: alertsLoading,
    error: alertsError,
  } = useCrisisStore();
  const { warnings, fetchWarnings } = useDangerousLocationStore();
  const {
    incidents,
    fetchIncidents,
    getDashboardStats,
    loading: incidentsLoading,
    error: incidentsError,
  } = useIncidentStore();
  const [statsReady, setStatsReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await Promise.all([
        fetchAlerts(),
        fetchIncidents(),
        fetchTotalUsers(),
        fetchUserStats(),
        fetchWarnings(),
      ]);
      if (!cancelled) setStatsReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [fetchAlerts, fetchIncidents, fetchTotalUsers, fetchUserStats, fetchWarnings]);

  const isLoading = !statsReady || alertsLoading || incidentsLoading;

  const hasError = alertsError || incidentsError;

  const metrics = useMemo(() => {
    const activeAlerts = alerts.filter((a) => a.status === "Active");
    const resolvedAlerts = alerts.filter((a) => a.status === "Resolved");
    const urgentAlerts = activeAlerts.filter(
      (a) => a.severity === "Critical" || a.severity === "High"
    );

    const openIncidents = incidents.filter((i) => !CLOSED_STATUSES.includes(i.status));
    const pendingReports = incidents.filter((i) => PENDING_STATUSES.includes(i.status));
    const actionRequired = incidents.filter((i) => ACTION_STATUSES.includes(i.status));
    const resolvedIncidents = incidents.filter((i) =>
      ["Resolved", "Closed"].includes(i.status)
    );

    const activeDangerWarnings = warnings.filter((w) => w.status === "Active");

    const areaSet = new Set();
    activeAlerts.forEach((a) => {
      if (a.location?.trim()) areaSet.add(a.location.trim());
    });
    activeDangerWarnings.forEach((w) => {
      if (w.dangerous_location?.trim()) areaSet.add(w.dangerous_location.trim());
    });
    openIncidents.forEach((i) => {
      if (i.location?.trim()) areaSet.add(i.location.trim());
    });

    const activityTimestamps = [
      ...alerts.map((a) => a.created_at),
      ...incidents.map((i) => i.created_at),
      ...incidents.map((i) => i.updated_at),
    ]
      .filter(Boolean)
      .map((d) => new Date(d).getTime());

    const latestActivity =
      activityTimestamps.length > 0 ? new Date(Math.max(...activityTimestamps)) : null;

    return {
      activeAlerts,
      resolvedAlerts,
      urgentAlerts,
      activeDangerWarnings,
      pendingReports,
      actionRequired,
      resolvedIncidents,
      affectedAreas: Array.from(areaSet).sort(),
      latestActivity,
      recentAlerts: alerts.slice(0, 5),
      recentIncidents: incidents.slice(0, 5),
      recentlyResolved: [...resolvedIncidents]
        .sort(
          (a, b) =>
            new Date(b.updated_at || b.created_at).getTime() -
            new Date(a.updated_at || a.created_at).getTime()
        )
        .slice(0, 5),
      incidentStats: getDashboardStats(),
    };
  }, [alerts, incidents, warnings, getDashboardStats]);

  const handleRetry = () => {
    setStatsReady(false);
    Promise.all([
      fetchAlerts(),
      fetchIncidents(),
      fetchTotalUsers(),
      fetchUserStats(),
      fetchWarnings(),
    ]).finally(() =>
      setStatsReady(true)
    );
  };

  return (
    <>
      <DashboardPageHeader
        title={ROLE_INTERFACE.admin.dashboard.title}
        description={ROLE_INTERFACE.admin.dashboard.description}
        action={
          !isLoading && metrics.latestActivity ? (
            <div className="flex items-center gap-2 bg-zinc-50 text-zinc-600 px-4 py-2 rounded-2xl border border-zinc-100">
              <Clock size={14} className="text-zinc-400 shrink-0" />
              <div>
                <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400">
                  Latest Activity
                </p>
                <p className="text-xs font-bold text-zinc-700">
                  {formatRelativeTime(metrics.latestActivity)}
                </p>
              </div>
            </div>
          ) : null
        }
      />

      <RoleContextBanner helper={ROLE_INTERFACE.admin.dashboard.helper} tone="info" />

      {hasError && !isLoading && (
        <ErrorState
          message={alertsError || incidentsError}
          onRetry={handleRetry}
          title="Dashboard data failed to load"
        />
      )}

      {isLoading ? (
        <>
          <StatCardSkeletonGrid count={4} />
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6 mt-6">
            <StatCardSkeletonGrid count={1} className="col-span-1" />
            <StatCardSkeletonGrid count={1} className="col-span-1" />
            <StatCardSkeletonGrid count={1} className="col-span-1" />
            <StatCardSkeletonGrid count={1} className="col-span-1" />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <AlertCardSkeletonList count={3} />
            <ReportCardSkeletonList count={3} />
          </div>
        </>
      ) : (
        <>
          {metrics.activeDangerWarnings.length > 0 && (
            <Card className="p-5 bg-red-50 border-2 border-red-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="text-red-600 shrink-0" size={22} />
                  <div>
                    <p className="text-xs font-black uppercase text-red-700 tracking-widest">Active Area Hazards</p>
                    <p className="text-sm text-red-800 font-medium mt-1">
                      {metrics.activeDangerWarnings.length} unsafe area{metrics.activeDangerWarnings.length > 1 ? "s" : ""} with alternative routes published for tourists.
                    </p>
                  </div>
                </div>
                <Link
                  href="/crisis/admin/routes?tab=areas"
                  className="inline-flex items-center gap-2 bg-red-600 text-white px-5 py-2.5 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-red-700 shrink-0"
                >
                  Manage <ArrowRight size={14} />
                </Link>
              </div>
            </Card>
          )}

          <div className={`${statGrid.dashboard} mb-2`}>
            <DashboardStatCard
              compact
              label="Active Crisis Alerts"
              value={metrics.activeAlerts.length}
              icon={<Radio size={iconSize.stat} />}
              accent="red"
              href="/crisis/admin"
              hrefLabel="Manage"
            />
            <DashboardStatCard
              compact
              label="Critical / High"
              value={metrics.urgentAlerts.length}
              icon={<AlertTriangle size={iconSize.stat} />}
              accent="orange"
              href="/crisis/admin"
              hrefLabel="Review"
            />
            <DashboardStatCard
              compact
              label="Pending Reports"
              value={metrics.pendingReports.length}
              icon={<FileWarning size={iconSize.stat} />}
              accent="purple"
              href="/admin/incidents"
              hrefLabel="Review"
            />
            <DashboardStatCard
              compact
              label="Needs Action"
              value={metrics.actionRequired.length}
              icon={<Bell size={iconSize.stat} />}
              accent="blue"
              href="/admin/incidents"
              hrefLabel="Respond"
            />
          </div>

          <AdminDashboardCharts />

          <AdminDashboardActivityPanel
            affectedAreas={metrics.affectedAreas}
            recentAlerts={metrics.recentAlerts}
            recentIncidents={metrics.recentIncidents}
          />

          {metrics.recentlyResolved.length > 0 && (
            <AdminPanel title="Recently resolved / closed" subtitle="Latest incident closures" bodyClassName={portalLayout.panelBodyStack}>
              <PublicCardListPreview
                items={metrics.recentlyResolved}
                modalTitle="Recently resolved / closed"
                listClassName="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3"
                scrollPaneClassName={portalLayout.listScrollPane}
                renderItem={(inc) => (
                  <div className="rounded-xl border border-green-200 bg-green-50/40 p-4">
                    <p className="font-mono text-[10px] text-green-700 font-black">
                      {inc.reference_number}
                    </p>
                    <p className="font-bold text-zinc-900 text-sm mt-1">{inc.category}</p>
                    <div className="flex items-center justify-between mt-2">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${getStatusColor(inc.status)}`}
                      >
                        {inc.status}
                      </span>
                      <span className="text-[9px] font-bold text-zinc-400">
                        {formatRelativeTime(inc.updated_at || inc.created_at)}
                      </span>
                    </div>
                  </div>
                )}
              />
            </AdminPanel>
          )}
        </>
      )}

      {!isLoading && (
        <AdminQuickActions
          items={[
            {
              href: "/crisis/admin",
              icon: AlertTriangle,
              title: "Broadcast Alert",
              sub: `${metrics.activeAlerts.length} active`,
              color: "text-red-600",
            },
            {
              href: "/admin/incidents",
              icon: FileWarning,
              title: "Manage Incidents",
              sub: `${metrics.pendingReports.length} pending · ${metrics.actionRequired.length} in progress`,
              color: "text-orange-600",
            },
            {
              href: "/admin/users",
              icon: Users,
              title: "User Management",
              sub: `${totalUsers.toLocaleString()} registered`,
              color: "text-blue-600",
            },
          ]}
        />
      )}
    </>
  );
}
