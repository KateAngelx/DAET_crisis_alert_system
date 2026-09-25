"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Bell, CheckCircle, Info } from "lucide-react";
import { useCrisisStore } from "@/app/store/crisisStore";
import {
  InfoPageHero,
  PublicPageShell,
  PublicPageContent,
  publicLayout,
  PublicInfoCallout,
  PublicPanel,
} from "@/app/components/InfoPageHero";
import { AsyncState, ErrorState } from "@/app/components/ui/AsyncState";
import { AlertCardSkeletonList, PublicStatCardSkeleton } from "@/app/components/ui/Skeletons";
import { PublicStatCard } from "@/app/components/dashboard/PublicStatCard";
import { iconSize, statGrid, portalLayout } from "@/lib/designSystem";
import {
  PublicCategorizedCardFilters,
  DEFAULT_SEVERITY_ORDER,
  DEFAULT_CRISIS_TYPE_OPTIONS,
} from "@/app/components/shell/PublicCategorizedCardFilters";
import { CrisisAlertListCard } from "@/app/components/crisis/CrisisAlertListCard";
import { ROLE_INTERFACE } from "@/lib/roleInterfaceCopy";
import { RoleContextBanner } from "@/app/components/dashboard/RoleContextBanner";
import { PublicCategorizedCardList } from "@/app/components/shell/PublicCategorizedCardList";

function formatResolvedAt(alert) {
  const date = alert.updated_at || alert.created_at;
  return date ? new Date(date).toLocaleString() : "—";
}

export default function ResolvedAlertsPage() {
  const { alerts, fetchAlerts, loading, error } = useCrisisStore();
  const [mounted, setMounted] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [severityFilter, setSeverityFilter] = useState("all");
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

  useEffect(() => {
    if (!mounted || typeof window === "undefined") return;
    const resolved = alerts.filter((a) => a.status === "Resolved" && a.is_public);
    const weekCount = resolved.filter((a) => {
      const t = new Date(a.updated_at || a.created_at).getTime();
      return Date.now() - t < 7 * 24 * 60 * 60 * 1000;
    }).length;
    const monthCount = resolved.filter((a) => {
      const t = new Date(a.updated_at || a.created_at).getTime();
      return Date.now() - t < 30 * 24 * 60 * 60 * 1000;
    }).length;
  }, [mounted, alerts]);

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

  return (
    <PublicPageShell>
      <InfoPageHero
        title={ROLE_INTERFACE.public.resolvedAlerts.title}
        description={ROLE_INTERFACE.public.resolvedAlerts.description}
      />

      <PublicPageContent>
          <RoleContextBanner helper={ROLE_INTERFACE.public.resolvedAlerts.helper} tone="info" />

          <PublicPanel title="Overview & filters" subtitle="Counts and category filters">
            {loading ? (
              <PublicStatCardSkeleton count={3} className={`${statGrid.crisisHub} mb-4`} compact />
            ) : (
              <div className={`${statGrid.crisisHub} mb-4`}>
                <PublicStatCard compact value={resolvedAlerts.length} label="Overall Solved" accent="orange" />
                <PublicStatCard compact value={recentCount} label="Resolved This Week" accent="blue" />
                <PublicStatCard compact value={monthCount} label="Resolved This Month" accent="green" />
              </div>
            )}
            <PublicCategorizedCardFilters
              items={resolvedAlerts}
              getCategory={(alert) => alert.type}
              getSeverity={(alert) => alert.severity}
              categoryLabel="Crisis type"
              severityLabel="Severity"
              categoryOptions={DEFAULT_CRISIS_TYPE_OPTIONS}
              severityOptions={DEFAULT_SEVERITY_ORDER}
              categoryFilter={categoryFilter}
              severityFilter={severityFilter}
              onCategoryFilterChange={setCategoryFilter}
              onSeverityFilterChange={setSeverityFilter}
            />
          </PublicPanel>

          <PublicPanel title="Resolved incidents & alerts" bodyClassName={portalLayout.panelBodyStack}>
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
              <PublicCategorizedCardList
                items={resolvedAlerts}
                getCategory={(alert) => alert.type}
                getSeverity={(alert) => alert.severity}
                hideFilters
                categoryFilter={categoryFilter}
                severityFilter={severityFilter}
                listPaneClassName={portalLayout.listScrollPane}
                modalTitle="Resolved incidents & alerts"
                modalSubtitle={`${resolvedAlerts.length} resolved`}
                renderItem={(alert) => (
                  <CrisisAlertListCard
                    alert={alert}
                    resolved
                    timeLabel={`Resolved ${formatResolvedAt(alert)}`}
                    className="opacity-95"
                  />
                )}
              />
            </AsyncState>
          </PublicPanel>

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
    </PublicPageShell>
  );
}
