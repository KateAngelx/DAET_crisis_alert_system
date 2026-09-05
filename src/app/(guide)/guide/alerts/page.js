"use client";

import React, { useEffect } from "react";
import { AlertTriangle, MapPin, Clock, ShieldCheck } from "lucide-react";
import { Card } from "@/app/components/ui/Card";
import { DashboardPageHeader } from "@/app/components/dashboard/DashboardPageHeader";
import { DashboardStatCard } from "@/app/components/dashboard/DashboardStatCard";
import { StatCardSkeletonGrid } from "@/app/components/ui/Skeletons";
import { AsyncState, EmptyState, ErrorState } from "@/app/components/ui/AsyncState";
import { AlertCardSkeletonList } from "@/app/components/ui/Skeletons";
import { useCrisisStore } from "@/app/store/crisisStore";
import { iconSize, statGrid } from "@/lib/designSystem";

export default function GuideAlertsPage() {
  const { alerts, fetchAlerts, loading, error } = useCrisisStore();

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  const activeAlerts = alerts.filter((a) => a.status === "Active" && a.is_public);
  const criticalCount = activeAlerts.filter((a) => a.severity === "Critical").length;
  const highCount = activeAlerts.filter((a) => a.severity === "High").length;

  return (
    <div className="space-y-6 text-left">
      <DashboardPageHeader
        title="Safety Advisories"
        description="Official crisis announcements from the Daet Crisis Command Center. Share relevant advisories with tourists in your tour groups."
      />

      {loading ? (
        <StatCardSkeletonGrid count={3} className={statGrid.dashboardThree} />
      ) : (
        <div className={statGrid.dashboardThree}>
          <DashboardStatCard label="Active Advisories" value={activeAlerts.length} icon={<ShieldCheck size={iconSize.stat} />} accent="blue" />
          <DashboardStatCard label="Critical" value={criticalCount} icon={<AlertTriangle size={iconSize.stat} />} accent="red" />
          <DashboardStatCard label="High Severity" value={highCount} icon={<AlertTriangle size={iconSize.stat} />} accent="orange" />
        </div>
      )}

      {criticalCount > 0 && (
        <Card className="p-5 bg-red-50 border-red-200">
          <div className="flex items-center gap-3">
            <AlertTriangle className="text-red-600 shrink-0" size={20} />
            <p className="text-sm font-bold text-red-800">
              {criticalCount} critical advisory{criticalCount > 1 ? "ies" : ""} active — verify tourist safety immediately.
            </p>
          </div>
        </Card>
      )}

      <AsyncState
        loading={loading}
        error={error}
        isEmpty={!loading && !error && activeAlerts.length === 0}
        onRetry={fetchAlerts}
        loadingFallback={<AlertCardSkeletonList count={4} />}
        errorFallback={<ErrorState message={error} onRetry={fetchAlerts} title="Could not load advisories" />}
        emptyFallback={
          <EmptyState
            icon={ShieldCheck}
            title="No active advisories"
            description="No crisis is currently reported for Daet. This panel updates when LGU publishes a new advisory."
          />
        }
      >
        <div className="space-y-4">
          {activeAlerts.map((alert) => (
            <Card
              key={alert.id}
              className={`p-6 border-l-4 ${
                alert.severity === "Critical"
                  ? "border-red-600"
                  : alert.severity === "High"
                    ? "border-orange-500"
                    : "border-blue-500"
              }`}
            >
              <div className="flex flex-col md:flex-row justify-between gap-4">
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span
                      className={`text-[10px] font-black uppercase px-2 py-1 rounded-full ${
                        alert.severity === "Critical"
                          ? "bg-red-100 text-red-700"
                          : alert.severity === "High"
                            ? "bg-orange-100 text-orange-700"
                            : "bg-blue-100 text-blue-700"
                      }`}
                    >
                      {alert.severity}
                    </span>
                    <span className="text-[10px] font-black uppercase text-zinc-400 tracking-widest">
                      {alert.alert_type || alert.type || "Advisory"}
                    </span>
                  </div>
                  <h3 className="text-lg font-black text-zinc-900 uppercase tracking-tight">{alert.title}</h3>
                  <p className="text-sm text-zinc-600 mt-2 leading-relaxed">{alert.description || alert.message}</p>
                  {alert.instructions && (
                    <p className="text-sm text-zinc-700 mt-3 p-3 bg-zinc-50 rounded-xl border border-zinc-100">
                      <span className="font-black uppercase text-[10px] text-zinc-400 block mb-1">Instructions</span>
                      {alert.instructions}
                    </p>
                  )}
                </div>
                <div className="md:text-right shrink-0 space-y-2">
                  {(alert.location || alert.affected_area) && (
                    <p className="text-xs text-zinc-500 flex items-center md:justify-end gap-1">
                      <MapPin size={12} className="text-blue-500" />
                      {alert.location || alert.affected_area}
                    </p>
                  )}
                  {alert.created_at && (
                    <p className="text-xs text-zinc-400 flex items-center md:justify-end gap-1">
                      <Clock size={12} />
                      {new Date(alert.created_at).toLocaleString()}
                    </p>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      </AsyncState>
    </div>
  );
}
