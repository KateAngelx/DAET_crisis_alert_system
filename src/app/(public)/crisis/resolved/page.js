"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Bell, Info } from "lucide-react";
import { useCrisisStore } from "@/app/store/crisisStore";
import {
  InfoPageHero,
  PublicPageShell,
  PublicPageContent,
  PublicInfoCallout,
  PublicPanel,
} from "@/app/components/InfoPageHero";
import { AsyncState, ErrorState } from "@/app/components/ui/AsyncState";
import { AlertCardSkeletonList, MapSkeleton, PublicStatCardSkeleton } from "@/app/components/ui/Skeletons";
import { PublicStatCard } from "@/app/components/dashboard/PublicStatCard";
import { getSeverityOutline, iconSize, statGrid, portalLayout } from "@/lib/designSystem";
import {
  DEFAULT_SEVERITY_ORDER,
  DEFAULT_CRISIS_TYPE_OPTIONS,
} from "@/app/components/shell/PublicCategorizedCardFilters";
import { ROLE_INTERFACE } from "@/lib/roleInterfaceCopy";
import { RoleContextBanner } from "@/app/components/dashboard/RoleContextBanner";
import { CategoryFilterSelect, StatusRecordList } from "@/app/components/shell/StatusRecordList";
import { AlertDetailModal } from "@/app/components/crisis/AlertDetailModal";
import { CrisisHubMap } from "@/app/components/maps/CrisisHubMap";

function formatResolvedAt(alert) {
  const date = alert.updated_at || alert.created_at;
  if (!date) return "—";
  return new Date(date).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function ResolvedAlertsPage() {
  const { alerts, fetchAlerts, loading, error } = useCrisisStore();
  const [mounted, setMounted] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [selectedAlert, setSelectedAlert] = useState(null);
  useEffect(() => {
    setMounted(true);
    const init = async () => {
      const cleanup = await fetchAlerts();
      return cleanup;
    };
    const promise = init();
    return () => {
      setMounted(false);
      promise.then((cleanup) => {
        if (typeof cleanup === "function") cleanup();
      });
    };
  }, [fetchAlerts]);

  const resolvedAlerts = alerts
    .filter((a) => a.status === "Resolved" && a.is_public)
    .sort(
      (a, b) =>
        new Date(b.updated_at || b.created_at).getTime() -
        new Date(a.updated_at || a.created_at).getTime()
    );

  const recentCount = resolvedAlerts.filter((a) => {
    const t = new Date(a.updated_at || a.created_at).getTime();
    return Date.now() - t < 7 * 24 * 60 * 60 * 1000;
  }).length;

  const monthCount = resolvedAlerts.filter((a) => {
    const t = new Date(a.updated_at || a.created_at).getTime();
    return Date.now() - t < 30 * 24 * 60 * 60 * 1000;
  }).length;

  const filteredAlerts = useMemo(() => {
    return resolvedAlerts.filter((alert) => {
      if (categoryFilter !== "all" && (alert.type || "General") !== categoryFilter) return false;
      if (severityFilter !== "all" && alert.severity !== severityFilter) return false;
      return true;
    });
  }, [resolvedAlerts, categoryFilter, severityFilter]);

  const rows = filteredAlerts.map((alert) => ({
    id: alert.id,
    status: alert.severity || "Low",
    statusClass: getSeverityOutline(alert.severity).badge,
    place: alert.location || alert.title,
    type: alert.type || "General",
    when: formatResolvedAt(alert),
    onSelect: () => setSelectedAlert(alert),
    ariaLabel: "View resolved alert",
  }));

  return (
    <PublicPageShell>
      <InfoPageHero
        title={ROLE_INTERFACE.public.resolvedAlerts.title}
        description={ROLE_INTERFACE.public.resolvedAlerts.description}
      />

      <PublicPageContent>
          <RoleContextBanner helper={ROLE_INTERFACE.public.resolvedAlerts.helper} tone="info" />

          <PublicPanel title="Overview" subtitle="Resolved counts">
            {loading ? (
              <PublicStatCardSkeleton count={3} className={statGrid.crisisHub} compact />
            ) : (
              <div className={statGrid.crisisHub}>
                <PublicStatCard compact value={resolvedAlerts.length} label="Overall Solved" accent="orange" />
                <PublicStatCard compact value={recentCount} label="Resolved This Week" accent="blue" />
                <PublicStatCard compact value={monthCount} label="Resolved This Month" accent="green" />
              </div>
            )}
          </PublicPanel>

          <div className={portalLayout.splitGridPublic}>
            <PublicPanel
              title="Resolved incidents"
              subtitle="Status, place, type, and when. View opens the full details."
              className="order-2 lg:order-1"
            >
              <AsyncState
                loading={loading}
                error={error}
                isEmpty={!loading && !error && resolvedAlerts.length === 0}
                onRetry={fetchAlerts}
                loadingFallback={<AlertCardSkeletonList count={3} />}
                errorFallback={
                  <ErrorState message={error} onRetry={fetchAlerts} title="Could not load resolved alerts" />
                }
                emptyFallback={
                  <div className="text-center py-8 bg-zinc-50 rounded-2xl border-2 border-dashed border-zinc-200">
                    <Info size={iconSize.emptyLg} className="mx-auto text-zinc-300 mb-4" />
                    <p className="font-bold text-zinc-400 uppercase tracking-widest text-xs">No Resolved Alerts Yet</p>
                    <p className="text-zinc-400 text-sm mt-2 font-medium max-w-md mx-auto">
                      When the Daet Municipal Tourism Office marks an emergency alert as resolved, it will appear here for reference. Use Crisis Hub in the menu for active alerts.
                    </p>
                  </div>
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
                <StatusRecordList rows={rows} />
              </AsyncState>
            </PublicPanel>

            <PublicPanel
              title="Resolved areas map"
              subtitle="Pins follow the filters above"
              className={`${portalLayout.panelFill} order-1 lg:order-2 ${selectedAlert ? "pointer-events-none opacity-40" : ""}`}
              noPadding
              bodyClassName={portalLayout.mapColumnBody}
            >
              {loading ? (
                <MapSkeleton height={portalLayout.mapColumnFill} />
              ) : mounted ? (
                <CrisisHubMap
                  alerts={filteredAlerts}
                  warnings={[]}
                  showWarnings={false}
                  showTouristSpots={false}
                  fitToAlerts
                  heightClass={portalLayout.mapColumnFill}
                />
              ) : null}
            </PublicPanel>
          </div>

          <PublicPanel title="Your incident reports">
            <PublicInfoCallout variant="zinc" className="border-0 bg-transparent p-0">
              <div className="flex items-start gap-3">
                <Bell className="text-blue-600 shrink-0 mt-0.5" size={20} />
                <p className="text-sm text-zinc-600 font-medium leading-relaxed">
                  Resolved or closed reports you submitted personally are tracked under{" "}
                  <Link href="/crisis/reports" className="text-blue-600 font-black hover:underline">
                    My Reports
                  </Link>
                  , not on this page.
                </p>
              </div>
            </PublicInfoCallout>
          </PublicPanel>
      </PublicPageContent>

      <AlertDetailModal alert={selectedAlert} onClose={() => setSelectedAlert(null)} />
    </PublicPageShell>
  );
}
