"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FileWarning, Info, Phone } from "lucide-react";
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
import { siteInfo } from "@/lib/siteInfo";
import { AlertTypeIcon } from "@/app/components/ui/cardTypeIcons";
import { useHydrated } from "@/lib/useHydrated";
import { SafetyStatusBar } from "@/app/components/SafetyStatusBar";
import { AlertsTabs } from "@/app/components/AlertsTabs";

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
  const { alerts, fetchAlerts, alertsLoaded, loading: fetching, error } = useCrisisStore();
  const loading = fetching || (!alertsLoaded && !error);
  const { isAuthenticated } = useAuthStore();
  const visibility = usePublicVisibility();
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [viewedAlerts, setViewedAlerts] = useState(new Set());
  const mounted = useHydrated();
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [safetyOpen, setSafetyOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const initRealtime = async () => {
      const cleanup = await fetchAlerts();
      return cleanup;
    };

    const cleanupPromise = initRealtime();

    return () => {
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

  // Open the alert named in the address (?alert=…) once, after the alerts load.
  const alertParam = mounted ? new URLSearchParams(window.location.search).get("alert") : null;
  const [alertParamHandled, setAlertParamHandled] = useState(false);
  if (alertParam && !alertParamHandled) {
    const match = alerts.find((alert) => alert.id === alertParam);
    if (match) {
      setAlertParamHandled(true);
      setSelectedAlert(match.id);
      setViewedAlerts((prev) => {
        if (prev.has(match.id)) return prev;
        const next = new Set(prev);
        next.add(match.id);
        return next;
      });
    }
  }

  const alertRows = filteredAlerts.map((alert) => ({
    id: alert.id,
    status: alert.severity || "Low",
    statusClass: getSeverityOutline(alert.severity).badge,
    place: alert.title && alert.location
      ? `${alert.title} · ${alert.location}`
      : alert.title || alert.location || "—",
    type: alert.type || "General",
    typeIcon: <AlertTypeIcon type={alert.type} size={12} />,
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
        action={
          <>
            <Link href="/crisis/report" className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-[11px] font-black uppercase tracking-widest text-white shadow-sm hover:bg-red-700">
              <FileWarning size={14} /> Report a problem
            </Link>
            <a href="tel:911" className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-white px-4 py-2.5 text-[11px] font-black uppercase tracking-widest text-red-700 hover:bg-red-50">
              <Phone size={14} /> Emergency? Call 911
            </a>
            {!isAuthenticated ? (
              <span className="self-center text-[11px] font-medium text-zinc-500">No account needed to report.</span>
            ) : null}
          </>
        }
      />

      <PublicPageContent>
        <div className={portalLayout.stackPublic}>
          <div className="flex flex-col gap-3">
            <AlertsTabs active="active" />
            <SafetyStatusBar alerts={alerts} loading={loading} error={error} loaded={alertsLoaded} />
          </div>

          <div className={visibility.map ? portalLayout.splitGridPublic : "grid grid-cols-1 gap-4"}>
            <PublicPanel
              title="Active alerts"
              subtitle="Newest first. Tap View to read what to do."
              className="order-1"
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
                    <p className="font-bold text-zinc-400 uppercase tracking-widest text-xs">No active alerts</p>
                    <p className="text-zinc-400 text-sm mt-2 font-medium">
                      Nothing is reported for Daet right now. Past alerts are in the Past alerts tab.
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
              className={`${portalLayout.panelFill} order-2 ${selectedAlert ? "pointer-events-none opacity-40" : ""}`}
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

          <PublicPanel title="Counts" subtitle="Active alerts right now" className="installed-app-hide">
            {loading ? (
              <PublicStatCardSkeleton count={3} className={statGrid.crisisHub} compact />
            ) : (
              <div className={statGrid.crisisHub}>
                <PublicStatCard compact value={activeAlerts.length} label="Active alerts" accent="blue" />
                <PublicStatCard compact value={criticalAlerts.length} label="Critical" accent="red" />
                <PublicStatCard compact value={viewedAlerts.size} label="Alerts you've seen" accent="green" />
              </div>
            )}
          </PublicPanel>
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
              <p>2. Save emergency numbers: <strong>911</strong> (national), <strong>117</strong> (PNP), tourism office <strong>{siteInfo.phoneTourism}</strong> / <strong>{siteInfo.phoneTourismAlt}</strong>.</p>
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
