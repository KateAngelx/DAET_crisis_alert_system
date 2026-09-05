"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Bell,
  Clock,
  Compass,
  FileWarning,
  MapPin,
  Radio,
  ShieldCheck,
  Users,
} from "lucide-react";
import { useGuideStore } from "@/app/store/guideStore";
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
import { getSeverityColor, getStatusColor } from "@/lib/constants";
import { iconSize, statGrid } from "@/lib/designSystem";
import { ROLE_INTERFACE } from "@/lib/roleInterfaceCopy";
import { RoleContextBanner } from "@/app/components/dashboard/RoleContextBanner";

const PENDING_STATUSES = ["Submitted", "Received", "Under Review"];
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
    fetchTotalUsers,
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
  const { tourGroups, fetchAllTourGroupsAdmin } = useGuideStore();
  const [statsReady, setStatsReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await Promise.all([fetchAlerts(), fetchIncidents(), fetchTotalUsers(), fetchAllTourGroupsAdmin(), fetchWarnings()]);
      if (!cancelled) setStatsReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [fetchAlerts, fetchIncidents, fetchTotalUsers, fetchAllTourGroupsAdmin, fetchWarnings]);

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

  const guideMonitoring = useMemo(() => {
    const guideMap = new Map();
    let activeGroups = 0;
    let assignedTourists = 0;

    tourGroups.forEach((group) => {
      if (group.status === "active") activeGroups += 1;
      const members = (group.guide_assignments || []).filter((a) => a.status === "active");
      assignedTourists += members.length;
      if (group.guide?.id) {
        guideMap.set(group.guide.id, group.guide);
      }
    });

    return {
      guideCount: guideMap.size,
      activeGroups,
      assignedTourists,
      recentGroups: tourGroups.filter((g) => g.status === "active").slice(0, 4),
    };
  }, [tourGroups]);

  const handleRetry = () => {
    setStatsReady(false);
    Promise.all([fetchAlerts(), fetchIncidents(), fetchTotalUsers(), fetchAllTourGroupsAdmin(), fetchWarnings()]).finally(() =>
      setStatsReady(true)
    );
  };

  return (
    <div className="space-y-6 text-left">
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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <AlertCardSkeletonList count={3} />
            <ReportCardSkeletonList count={3} />
          </div>
        </>
      ) : (
        <>
          <div className={statGrid.dashboard}>
            <DashboardStatCard
              label="Active Crisis Alerts"
              value={metrics.activeAlerts.length}
              icon={<Radio size={iconSize.stat} />}
              accent="red"
              href="/crisis/admin"
              hrefLabel="Manage"
            />
            <DashboardStatCard
              label="Critical / High Alerts"
              value={metrics.urgentAlerts.length}
              icon={<AlertTriangle size={iconSize.stat} />}
              accent="orange"
              href="/crisis/admin"
              hrefLabel="Review"
            />
            <DashboardStatCard
              label="Pending Reports"
              value={metrics.pendingReports.length}
              icon={<FileWarning size={iconSize.stat} />}
              accent="purple"
              href="/admin/incidents"
              hrefLabel="Review"
            />
            <DashboardStatCard
              label="Reports Requiring Action"
              value={metrics.actionRequired.length}
              icon={<Bell size={iconSize.stat} />}
              accent="blue"
              href="/admin/incidents"
              hrefLabel="Respond"
            />
          </div>

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

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="p-5 border-zinc-100 lg:col-span-1">
              <h2 className="text-sm font-black uppercase tracking-widest text-zinc-400 mb-4 flex items-center gap-2">
                <MapPin size={16} className="text-red-500" /> Affected Areas
              </h2>
              {metrics.affectedAreas.length > 0 ? (
                <ul className="space-y-2 max-h-48 overflow-y-auto">
                  {metrics.affectedAreas.map((area) => (
                    <li
                      key={area}
                      className="text-sm font-medium text-zinc-700 flex items-start gap-2 py-1.5 px-3 bg-zinc-50 rounded-xl"
                    >
                      <MapPin size={12} className="text-blue-500 shrink-0 mt-0.5" />
                      {area}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-zinc-400 font-medium py-4 text-center">
                  No active alerts or open reports with affected locations.
                </p>
              )}
            </Card>

            <Card className="p-5 border-zinc-100 lg:col-span-1">
              <h2 className="text-sm font-black uppercase tracking-widest text-zinc-400 mb-4 flex items-center gap-2">
                <ShieldCheck size={16} className="text-green-500" /> Alert Status
              </h2>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-red-50 rounded-xl border border-red-100">
                  <span className="text-xs font-black uppercase tracking-widest text-red-600">
                    Active
                  </span>
                  <span className="text-2xl font-black text-red-600">
                    {metrics.activeAlerts.length}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-xl border border-green-100">
                  <span className="text-xs font-black uppercase tracking-widest text-green-600">
                    Resolved
                  </span>
                  <span className="text-2xl font-black text-green-600">
                    {metrics.resolvedAlerts.length}
                  </span>
                </div>
              </div>
              <p className="text-[10px] text-zinc-400 font-medium mt-3">
                Status values from issued crisis alerts in the system.
              </p>
            </Card>

            <Card className="p-5 border-zinc-100 lg:col-span-1">
              <h2 className="text-sm font-black uppercase tracking-widest text-zinc-400 mb-4">
                Incident Overview
              </h2>
              <dl className="space-y-2 text-sm">
                {[
                  { label: "Open reports", value: metrics.incidentStats.active },
                  { label: "Pending review", value: metrics.pendingReports.length },
                  { label: "Assigned / responding", value: metrics.actionRequired.length },
                  { label: "Resolved / closed", value: metrics.incidentStats.resolved },
                ].map((row) => (
                  <div
                    key={row.label}
                    className="flex items-center justify-between py-2 border-b border-zinc-50 last:border-0"
                  >
                    <dt className="text-zinc-500 font-medium">{row.label}</dt>
                    <dd className="font-black text-zinc-900">{row.value}</dd>
                  </div>
                ))}
              </dl>
              <Link
                href="/admin/incidents"
                className="inline-flex items-center gap-1 mt-4 text-[10px] font-black uppercase tracking-widest text-blue-600 hover:underline"
              >
                All incident reports <ArrowRight size={12} />
              </Link>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-black uppercase tracking-widest text-zinc-400">
                  Recent Alerts
                </h2>
                <Link
                  href="/crisis/admin"
                  className="text-[10px] font-black uppercase tracking-widest text-blue-600 hover:underline flex items-center gap-1"
                >
                  Command Center <ArrowRight size={12} />
                </Link>
              </div>
              {metrics.recentAlerts.length > 0 ? (
                <div className="space-y-3">
                  {metrics.recentAlerts.map((alert) => (
                    <Card key={alert.id} className="p-4 border-zinc-100">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap gap-2 mb-1">
                            <span
                              className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${getSeverityColor(alert.severity)}`}
                            >
                              {alert.severity}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                                alert.status === "Active"
                                  ? "bg-red-100 text-red-700"
                                  : "bg-green-100 text-green-700"
                              }`}
                            >
                              {alert.status}
                            </span>
                          </div>
                          <p className="font-bold text-zinc-900 text-sm truncate">{alert.title}</p>
                          <p className="text-xs text-zinc-500 flex items-center gap-1 mt-1">
                            <MapPin size={11} className="shrink-0" />
                            {alert.location || "No location"}
                          </p>
                        </div>
                        <span className="text-[9px] font-bold text-zinc-400 uppercase shrink-0">
                          {formatRelativeTime(alert.created_at)}
                        </span>
                      </div>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card className="p-8 text-center border-zinc-100">
                  <p className="text-zinc-400 text-xs font-black uppercase">No alerts issued yet</p>
                </Card>
              )}
            </section>

            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-black uppercase tracking-widest text-zinc-400">
                  Recent Incident Reports
                </h2>
                <Link
                  href="/admin/incidents"
                  className="text-[10px] font-black uppercase tracking-widest text-blue-600 hover:underline flex items-center gap-1"
                >
                  View all <ArrowRight size={12} />
                </Link>
              </div>
              {metrics.recentIncidents.length > 0 ? (
                <div className="space-y-3">
                  {metrics.recentIncidents.map((inc) => (
                    <Link key={inc.id} href="/admin/incidents" className="block no-underline">
                      <Card className="p-4 border-zinc-100 hover:shadow-md transition-all">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <p className="font-mono text-[10px] text-blue-600 font-black">
                              {inc.reference_number}
                            </p>
                            <p className="font-bold text-zinc-900 text-sm mt-0.5">{inc.category}</p>
                            <p className="text-xs text-zinc-500 truncate">{inc.location}</p>
                            <div className="flex gap-2 mt-2">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${getSeverityColor(inc.severity)}`}
                              >
                                {inc.severity}
                              </span>
                              <span
                                className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${getStatusColor(inc.status)}`}
                              >
                                {inc.status}
                              </span>
                            </div>
                          </div>
                          <span className="text-[9px] font-bold text-zinc-400 uppercase shrink-0">
                            {formatRelativeTime(inc.created_at)}
                          </span>
                        </div>
                      </Card>
                    </Link>
                  ))}
                </div>
              ) : (
                <Card className="p-8 text-center border-zinc-100">
                  <p className="text-zinc-400 text-xs font-black uppercase">No reports submitted yet</p>
                </Card>
              )}
            </section>
          </div>

          {metrics.recentlyResolved.length > 0 && (
            <section>
              <h2 className="text-sm font-black uppercase tracking-widest text-zinc-400 mb-4">
                Recently Resolved / Closed
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {metrics.recentlyResolved.map((inc) => (
                  <Card key={inc.id} className="p-4 border-green-100 bg-green-50/30">
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
                  </Card>
                ))}
              </div>
            </section>
          )}
        </>
      )}

      {!isLoading && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-black uppercase tracking-widest text-zinc-400">
              Guide & Tour Group Monitoring
            </h2>
            <Link
              href="/admin/guides"
              className="text-[10px] font-black uppercase tracking-widest text-blue-600 hover:underline flex items-center gap-1"
            >
              Full monitoring <ArrowRight size={12} />
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
            <Card className="p-4 border-zinc-100 text-center">
              <p className="text-[10px] font-black uppercase text-zinc-400 mb-1">Registered Guides</p>
              <p className="text-2xl font-black text-purple-600">{guideMonitoring.guideCount}</p>
            </Card>
            <Card className="p-4 border-zinc-100 text-center">
              <p className="text-[10px] font-black uppercase text-zinc-400 mb-1">Active Tour Groups</p>
              <p className="text-2xl font-black text-blue-600">{guideMonitoring.activeGroups}</p>
            </Card>
            <Card className="p-4 border-zinc-100 text-center">
              <p className="text-[10px] font-black uppercase text-zinc-400 mb-1">Tourists in Groups</p>
              <p className="text-2xl font-black text-green-600">{guideMonitoring.assignedTourists}</p>
            </Card>
          </div>
          {guideMonitoring.recentGroups.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {guideMonitoring.recentGroups.map((group) => {
                const memberCount = (group.guide_assignments || []).filter((a) => a.status === "active").length;
                return (
                  <Card key={group.id} className="p-4 border-zinc-100">
                    <div className="flex items-start gap-3">
                      <Compass size={18} className="text-purple-600 shrink-0 mt-0.5" />
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-zinc-900 text-sm truncate">{group.name}</p>
                        <p className="text-xs text-zinc-500">{group.destination}</p>
                        <p className="text-[10px] text-zinc-400 mt-1">
                          Guide: {group.guide?.full_name || "—"} · {memberCount} tourist{memberCount !== 1 ? "s" : ""}
                        </p>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card className="p-6 text-center border-zinc-100">
              <p className="text-zinc-400 text-xs font-black uppercase">No active tour groups</p>
            </Card>
          )}
        </section>
      )}

      {!isLoading && (
      <div>
        <h2 className="text-sm font-black uppercase tracking-widest text-zinc-400 mb-4">
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            {
              href: "/crisis/admin",
              icon: AlertTriangle,
              title: "Broadcast Alert",
              sub: `${metrics.activeAlerts.length} active`,
              border: "border-red-100 hover:border-red-300",
              color: "text-red-600",
            },
            {
              href: "/admin/incidents",
              icon: FileWarning,
              title: "Manage Incidents",
              sub: `${metrics.pendingReports.length} pending · ${metrics.actionRequired.length} in progress`,
              border: "border-orange-100 hover:border-orange-300",
              color: "text-orange-600",
            },
            {
              href: "/admin/users",
              icon: Users,
              title: "User Management",
              sub: `${totalUsers.toLocaleString()} registered`,
              border: "border-blue-100 hover:border-blue-300",
              color: "text-blue-600",
            },
          ].map((action) => (
            <Link key={action.href} href={action.href}>
              <Card
                className={`p-5 border-2 ${action.border} transition-colors cursor-pointer hover:shadow-md`}
              >
                <div className="flex items-center gap-3">
                  <action.icon size={20} className={action.color} />
                  <div>
                    <h3 className="font-black text-zinc-900 text-sm uppercase">{action.title}</h3>
                    <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">
                      {action.sub}
                    </p>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </div>
      )}
    </div>
  );
}
