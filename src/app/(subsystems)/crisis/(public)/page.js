"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { Info, Shield } from "lucide-react";
import { useCrisisStore, useAuthStore } from "@/app/store/crisisStore";
import { InfoPageHero, PublicPageShell, PublicPageContent, PublicPanel } from "@/app/components/InfoPageHero";
import { AsyncState, ErrorState } from "@/app/components/ui/AsyncState";
import { PublicStatCardSkeleton, AlertCardSkeletonList, MapSkeleton } from "@/app/components/ui/Skeletons";
import { PublicStatCard } from "@/app/components/dashboard/PublicStatCard";
import { getSeverityOutline, portalLayout, portalShell, statGrid } from "@/lib/designSystem";
import { AlertDetailModal } from "@/app/(subsystems)/crisis/(public)/_components/AlertDetailModal";
import { sortRecordsNewestFirst } from "@/lib/recordSorting";
import { CrisisHubMap } from "@/app/components/maps/CrisisHubMap";
import { ROLE_INTERFACE } from "@/lib/roleInterfaceCopy";
import { usePublicVisibility } from "@/lib/usePublicVisibility";
import { StatusRecordList } from "@/app/components/shell/StatusRecordList";
import {
  DEFAULT_CRISIS_TYPE_OPTIONS,
  DEFAULT_SEVERITY_ORDER,
} from "@/app/components/shell/PublicCategorizedCardFilters";

const DAET_CENTER = [14.1122, 122.9553];

function FilterSelect({ label, value, onChange, options }) {
  return (
    <label className="block min-w-0">
      <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-1.5 block">
        {label}
      </span>
      <select
        className={portalShell.select}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-label={label}
      >
        <option value="all">All</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

export default function CrisisPublicPage() {
  const { alerts, fetchAlerts, loading, error } = useCrisisStore();
  const { isAuthenticated } = useAuthStore();
  const visibility = usePublicVisibility();
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [viewedAlerts, setViewedAlerts] = useState(new Set());
  const [mounted, setMounted] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [safetyOpen, setSafetyOpen] = useState(false);
  const router = useRouter();
  const alertQueryHandled = useRef(false);

  useEffect(() => {
    setMounted(true);

    const initRealtime = async () => {
      const cleanup = await fetchAlerts();
      return cleanup;
    };

    const cleanupPromise = initRealtime();

    return () => {
      setMounted(false);
      cleanupPromise.then((cleanup) => {
        if (cleanup && typeof cleanup === "function") cleanup();
      });
    };
  }, [fetchAlerts]);

  const activeAlerts = alerts.filter((alert) => alert.status === "Active" && alert.is_public);
  const criticalAlerts = activeAlerts.filter((alert) => alert.severity === "Critical");

  const filteredAlerts = useMemo(() => {
    return sortRecordsNewestFirst(activeAlerts.filter((alert) => {
        if (categoryFilter !== "all" && (alert.type || "General") !== categoryFilter) return false;
        if (severityFilter !== "all" && alert.severity !== severityFilter) return false;
        return true;
      }), ["published_at", "created_at"]);
  }, [activeAlerts, categoryFilter, severityFilter]);

  const handleViewAlert = (alertId) => {
    setSelectedAlert(alertId);
    if (!viewedAlerts.has(alertId)) {
      setViewedAlerts((prev) => new Set(prev).add(alertId));
    }
  };

  useEffect(() => {
    if (alertQueryHandled.current) return;
    const alertId = new URLSearchParams(window.location.search).get("alert");
    if (!alertId) return;
    const match = alerts.find((alert) => alert.id === alertId);
    if (!match) return;
    alertQueryHandled.current = true;
    setSelectedAlert(match.id);
    setViewedAlerts((prev) => {
      if (prev.has(match.id)) return prev;
      const next = new Set(prev);
      next.add(match.id);
      return next;
    });
  }, [alerts]);

  const alertRows = filteredAlerts.map((alert) => ({
    id: alert.id,
    status: alert.severity || "Low",
    statusClass: getSeverityOutline(alert.severity).badge,
    place: alert.title && alert.location
      ? `${alert.title} · ${alert.location}`
      : alert.title || alert.location || "—",
    type: alert.type || "General",
    when: alert.published_at || alert.created_at
      ? new Date(alert.published_at || alert.created_at).toLocaleString()
      : "—",
    onSelect: () => handleViewAlert(alert.id),
    ariaLabel: "View alert details",
  }));

  const selectedAlertData = alerts.find((alert) => alert.id === selectedAlert);

  return (
    <PublicPageShell>
      <InfoPageHero
        title={ROLE_INTERFACE.public.crisisHub.title}
        description={ROLE_INTERFACE.public.crisisHub.description}
      />

      <PublicPageContent>
        <div className={portalLayout.stackPublic}>
          <PublicPanel title="Overview" subtitle="Alert counts" className="installed-app-hide">
            {loading ? (
              <PublicStatCardSkeleton count={3} className={statGrid.crisisHub} compact />
            ) : (
              <div className={statGrid.crisisHub}>
                <PublicStatCard compact value={activeAlerts.length} label="Active Alerts" accent="blue" />
                <PublicStatCard compact value={criticalAlerts.length} label="Need immediate action" accent="red" />
                <PublicStatCard compact value={viewedAlerts.size} label="Alerts Acknowledged" accent="green" />
              </div>
            )}
            {!loading && criticalAlerts.length > 0 ? (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 flex items-start gap-3 mt-4">
                <Shield className="text-red-600 shrink-0 mt-0.5" size={18} />
                <div>
                  <p className="text-xs font-black uppercase text-red-700 tracking-widest">Critical alerts active</p>
                  <p className="text-sm text-red-900 font-medium mt-0.5">
                    {criticalAlerts.length} alert{criticalAlerts.length > 1 ? "s" : ""} need immediate attention. Review the active announcements below.
                  </p>
                </div>
              </div>
            ) : null}
          </PublicPanel>

          {!loading && criticalAlerts.length > 0 ? (
            <div className="installed-app-show items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-3">
              <Shield className="mt-0.5 shrink-0 text-red-600" size={18} />
              <p className="text-sm font-medium text-red-900">
                {criticalAlerts.length} critical alert{criticalAlerts.length > 1 ? "s" : ""} need immediate attention.
              </p>
            </div>
          ) : null}

          <div className={visibility.map ? portalLayout.splitGridPublic : "grid grid-cols-1 gap-4"}>
            <PublicPanel
              title="Active announcements"
              subtitle="Status, place, type, and when. View opens the full details."
              className="order-2 lg:order-1"
            >
              <AsyncState
                loading={loading}
                error={error}
                isEmpty={!loading && !error && activeAlerts.length === 0}
                onRetry={fetchAlerts}
                loadingFallback={<AlertCardSkeletonList count={3} />}
                errorFallback={<ErrorState message={error} onRetry={fetchAlerts} title="Could not load alerts" />}
                emptyFallback={
                  <div className="text-center py-8 bg-zinc-50 rounded-2xl border-2 border-dashed border-zinc-200">
                    <Info size={32} className="mx-auto text-zinc-300 mb-4" />
                    <p className="font-bold text-zinc-400 uppercase tracking-widest text-xs">No Active Alerts</p>
                    <p className="text-zinc-400 text-sm mt-2 font-medium">
                      No crisis is currently reported for Daet. Check back when the tourism office issues a new advisory.
                    </p>
                  </div>
                }
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                  <FilterSelect
                    label="Crisis type"
                    value={categoryFilter}
                    onChange={setCategoryFilter}
                    options={DEFAULT_CRISIS_TYPE_OPTIONS}
                  />
                  <FilterSelect
                    label="Severity"
                    value={severityFilter}
                    onChange={setSeverityFilter}
                    options={DEFAULT_SEVERITY_ORDER}
                  />
                </div>
                <StatusRecordList rows={alertRows} />
              </AsyncState>
            </PublicPanel>

            {visibility.map ? (
            <PublicPanel
              title="Affected areas map"
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
                  center={DAET_CENTER}
                  heightClass={portalLayout.mapColumnFill}
                />
              ) : null}
            </PublicPanel>
            ) : null}
          </div>
        </div>

        <div className="installed-app-hide overflow-hidden rounded-2xl border border-zinc-200 bg-white">
          <button
            type="button"
            className="flex w-full items-center justify-between gap-3 px-4 py-4 text-left sm:px-6"
            aria-expanded={safetyOpen}
            onClick={() => setSafetyOpen((open) => !open)}
          >
            <span className="text-sm font-black text-zinc-900">Safety notes</span>
            <span className="text-[10px] font-black uppercase tracking-widest text-blue-600">
              {safetyOpen ? "Hide" : "Open"}
            </span>
          </button>
          {safetyOpen ? (
            <div className="grid grid-cols-1 gap-4 bg-blue-600 p-4 text-left text-sm font-medium text-white md:grid-cols-2 sm:p-6">
              <p>1. During typhoon season (June–December), check this page before visiting beaches or remote areas.</p>
              <p>2. Save emergency numbers: <strong>911</strong> (national), <strong>117</strong> (PNP), municipal hotline <strong>(054) 472-3000</strong>, tourism office <strong>0907 834 1818</strong>.</p>
              <p>3. When a Critical alert is posted, follow the listed instructions and avoid named affected areas.</p>
              {!isAuthenticated ? (
                <p>4. Register your account to receive email, SMS, and app notifications when the tourism office issues a new alert.</p>
              ) : (
                <p>4. Check your Notifications inbox when the tourism office issues a new alert for your registered contact details.</p>
              )}
            </div>
          ) : null}
        </div>
      </PublicPageContent>

      <AlertDetailModal
        alert={selectedAlertData}
        onClose={() => {
          setSelectedAlert(null);
          if (new URLSearchParams(window.location.search).get("alert")) {
            router.replace("/crisis", { scroll: false });
          }
        }}
      />
    </PublicPageShell>
  );
}
