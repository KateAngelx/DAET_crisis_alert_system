"use client";

import React, { useEffect, useMemo } from "react";
import Link from "next/link";
import {
  AlertTriangle, Bell, MapPin, Clock, ShieldCheck, Users, Compass, ArrowRight,
} from "lucide-react";
import { Card } from "@/app/components/ui/Card";
import { DashboardPageHeader } from "@/app/components/dashboard/DashboardPageHeader";
import { DashboardStatCard } from "@/app/components/dashboard/DashboardStatCard";
import { StatCardSkeletonGrid } from "@/app/components/ui/Skeletons";
import { AsyncState, EmptyState } from "@/app/components/ui/AsyncState";
import { useAuthStore, useCrisisStore } from "@/app/store/crisisStore";
import { useGuideStore } from "@/app/store/guideStore";
import { formatTourRoute } from "@/lib/tourGroupRoute";
import { iconSize, statGrid, typography } from "@/lib/designSystem";

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

  useEffect(() => {
    if (!user?.id) return;
    resetGuideScope();
    fetchTourGroups(user.id);
    fetchGuideIncidents(user.id);
    fetchAlerts();
  }, [user?.id, resetGuideScope, fetchTourGroups, fetchGuideIncidents, fetchAlerts]);

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

  const statsLoading = alertsLoading || guideLoading;

  return (
    <div className="space-y-6 text-left">
      <DashboardPageHeader
        title="Crisis Hub"
        description="Operational crisis overview for your tour groups and assigned tourists."
        action={
          <Link
            href="/guide/alerts"
            className="flex items-center gap-2 bg-red-600 text-white px-5 py-2.5 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-red-700 transition-colors"
          >
            <Bell size={16} /> All Advisories
          </Link>
        }
      />

      {statsLoading ? (
        <StatCardSkeletonGrid count={4} className={statGrid.dashboard} />
      ) : (
        <div className={statGrid.dashboard}>
          <DashboardStatCard label="Active Alerts" value={activeAlerts.length} icon={<Bell size={iconSize.stat} />} accent="red" href="/guide/alerts" hrefLabel="View" />
          <DashboardStatCard label="Critical" value={criticalAlerts.length} icon={<AlertTriangle size={iconSize.stat} />} accent="red" />
          <DashboardStatCard label="Your Tourists" value={totalTourists} icon={<Users size={iconSize.stat} />} accent="blue" href="/guide/groups" hrefLabel="Groups" />
          <DashboardStatCard label="Open Reports" value={openIncidents.length} icon={<ShieldCheck size={iconSize.stat} />} accent="orange" href="/guide/reports" hrefLabel="Reports" />
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-black uppercase tracking-widest text-zinc-400">
              Alerts Affecting Your Destinations
            </h2>
            <Link href="/guide/alerts" className="text-[10px] font-black uppercase text-blue-600 hover:underline">
              View all
            </Link>
          </div>
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
            <div className="space-y-3">
              {relevantAlerts.slice(0, 5).map((alert) => (
                <Card
                  key={alert.id}
                  className={`p-5 border-l-4 ${
                    alert.severity === "Critical"
                      ? "border-red-600 bg-red-50/30"
                      : alert.severity === "High"
                        ? "border-orange-500"
                        : "border-blue-500"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-1">
                        {alert.severity} · {alert.alert_type || alert.type}
                      </p>
                      <h3 className="font-black text-zinc-900 uppercase text-sm">{alert.title}</h3>
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
                </Card>
              ))}
            </div>
          </AsyncState>
        </section>

        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-black uppercase tracking-widest text-zinc-400">Your Active Tour Groups</h2>
            <Link href="/guide/groups" className="text-[10px] font-black uppercase text-blue-600 hover:underline">
              Manage
            </Link>
          </div>
          {activeGroups.length === 0 ? (
            <Card className="p-8 text-center border-zinc-100">
              <Compass size={32} className="mx-auto text-zinc-200 mb-2" />
              <p className="text-xs font-black uppercase text-zinc-400">No active tour groups</p>
            </Card>
          ) : (
            <div className="space-y-3">
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
            <div className="mt-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-black uppercase tracking-widest text-zinc-400">Recent Group Reports</h2>
                <Link href="/guide/reports" className="text-[10px] font-black uppercase text-blue-600 hover:underline flex items-center gap-1">
                  All reports <ArrowRight size={12} />
                </Link>
              </div>
              <div className="space-y-3">
                {openIncidents.slice(0, 3).map((inc) => (
                  <Link key={inc.id} href={`/guide/reports/${inc.id}`} className="block no-underline">
                    <Card className="p-4 border-zinc-100 hover:shadow-md transition-all">
                      <p className="font-mono text-xs text-blue-600 font-black">{inc.reference_number}</p>
                      <h3 className="font-black text-zinc-900 uppercase text-sm">{inc.category}</h3>
                      <p className="text-xs text-zinc-500 line-clamp-1 mt-1">{inc.description}</p>
                    </Card>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
