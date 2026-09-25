"use client";



import React, { useState, useEffect, useRef } from "react";

import { Shield, Info } from "lucide-react";

import { useCrisisStore, useAuthStore } from "@/app/store/crisisStore";

import { InfoPageHero, PublicPageShell, PublicPageContent, PublicPanel } from "@/app/components/InfoPageHero";

import { AsyncState, ErrorState } from "@/app/components/ui/AsyncState";

import { PublicStatCardSkeleton, AlertCardSkeletonList, MapSkeleton } from "@/app/components/ui/Skeletons";

import { PublicStatCard } from "@/app/components/dashboard/PublicStatCard";

import { iconSize, statGrid, portalLayout } from "@/lib/designSystem";

import { AlertDetailModal } from "@/app/components/crisis/AlertDetailModal";

import { CrisisAlertListCard } from "@/app/components/crisis/CrisisAlertListCard";

import { CrisisHubMap } from "@/app/components/maps/CrisisHubMap";

import { ROLE_INTERFACE } from "@/lib/roleInterfaceCopy";

import { RoleContextBanner } from "@/app/components/dashboard/RoleContextBanner";

import { PublicCategorizedCardList } from "@/app/components/shell/PublicCategorizedCardList";
import {
  PublicCategorizedCardFilters,
  DEFAULT_SEVERITY_ORDER,
  DEFAULT_CRISIS_TYPE_OPTIONS,
} from "@/app/components/shell/PublicCategorizedCardFilters";



export default function CrisisPublicPage() {

  const { alerts, fetchAlerts, loading, error } = useCrisisStore();

  const { isAuthenticated } = useAuthStore();

  const [selectedAlert, setSelectedAlert] = useState(null);

  const [viewedAlerts, setViewedAlerts] = useState(new Set());

  const [mounted, setMounted] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [severityFilter, setSeverityFilter] = useState("all");

  const announcementsPanelRef = useRef(null);
  const mapPanelRef = useRef(null);

  const DAET_CENTER = [14.1122, 122.9553];



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

  const activeAlerts = alerts.filter((a) => a.status === "Active" && a.is_public);

  const criticalAlerts = activeAlerts.filter((a) => a.severity === "Critical");

  const handleViewAlert = (alertId) => {

    setSelectedAlert(alertId);

    if (!viewedAlerts.has(alertId)) {

      setViewedAlerts((prev) => new Set(prev).add(alertId));

    }

  };



  const selectedAlertData = alerts.find((a) => a.id === selectedAlert);

  useEffect(() => {
    if (loading || !mounted) return;
    const ann = announcementsPanelRef.current;
    const map = mapPanelRef.current;
    if (!ann || !map) return;
  }, [loading, mounted, activeAlerts.length]);

  return (

    <PublicPageShell>

      <InfoPageHero

        title={ROLE_INTERFACE.public.crisisHub.title}

        description={ROLE_INTERFACE.public.crisisHub.description}

      />



      <PublicPageContent>

        <RoleContextBanner helper={ROLE_INTERFACE.public.crisisHub.helper} tone="info" />

        <div className={portalLayout.stackPublic}>
        <PublicPanel title="Overview & filters" subtitle="Counts and category filters">
          {loading ? (
            <PublicStatCardSkeleton count={3} className={`${statGrid.crisisHub} mb-4`} compact />
          ) : (
            <div className={`${statGrid.crisisHub} mb-4`}>
              <PublicStatCard compact value={activeAlerts.length} label="Active Alerts" accent="blue" />
              <PublicStatCard compact value={criticalAlerts.length} label="Need immediate action" accent="red" />
              <PublicStatCard compact value={viewedAlerts.size} label="Alerts Acknowledged" accent="green" />
            </div>
          )}
          {!loading && criticalAlerts.length > 0 ? (
            <div className="p-3 rounded-xl bg-orange-50 border border-orange-200 flex items-start gap-3 mb-4">
              <Shield className="text-orange-600 shrink-0 mt-0.5" size={18} />
              <div>
                <p className="text-xs font-black uppercase text-orange-700 tracking-widest">Critical alerts active</p>
                <p className="text-sm text-orange-900 font-medium mt-0.5">
                  {criticalAlerts.length} alert{criticalAlerts.length > 1 ? "s" : ""} need immediate attention — use filters or review announcements below.
                </p>
              </div>
            </div>
          ) : null}
          <PublicCategorizedCardFilters
            items={activeAlerts}
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

        <div className={portalLayout.splitGridPublic}>

          <PublicPanel
            title="Active announcements"
            className={portalLayout.panelFill}
            bodyClassName={portalLayout.panelBodyStack}
          >
            <section ref={announcementsPanelRef} className="flex flex-col flex-1 min-h-0">
              <div className="flex flex-col flex-1 min-h-0">
              <AsyncState

                loading={loading}

                error={error}

                isEmpty={!loading && !error && activeAlerts.length === 0}

                onRetry={fetchAlerts}

                loadingFallback={
                  <div className={portalLayout.listScrollPane}>
                    <AlertCardSkeletonList count={3} />
                  </div>
                }

                errorFallback={

                  <ErrorState message={error} onRetry={fetchAlerts} title="Could not load alerts" />

                }

                emptyFallback={

                  <div className="text-center py-8 bg-zinc-50 rounded-2xl border-2 border-dashed border-zinc-200">

                    <Info size={iconSize.emptyLg} className="mx-auto text-zinc-300 mb-4" />

                    <p className="font-bold text-zinc-400 uppercase tracking-widest text-xs">No Active Alerts</p>

                    <p className="text-zinc-400 text-sm mt-2 font-medium">No crisis is currently reported for Daet. Check back when the tourism office issues a new advisory.</p>

                  </div>

                }

              >

                <PublicCategorizedCardList
                  items={activeAlerts}
                  getCategory={(alert) => alert.type}
                  getSeverity={(alert) => alert.severity}
                  hideFilters
                  categoryFilter={categoryFilter}
                  severityFilter={severityFilter}
                  modalTitle="Active announcements"
                  modalSubtitle={`${activeAlerts.length} active`}
                  listPaneClassName={portalLayout.listScrollPane}
                  renderItem={(alert) => (
                    <CrisisAlertListCard alert={alert} onSelect={(a) => handleViewAlert(a.id)} />
                  )}
                />

              </AsyncState>
              </div>
            </section>
          </PublicPanel>

          <PublicPanel
            title="Affected areas map"
            className={`flex flex-col min-h-0 h-full ${selectedAlert ? "pointer-events-none opacity-40" : ""}`}
            noPadding
            bodyClassName={portalLayout.mapColumnBody}
          >
            <section ref={mapPanelRef} className="flex flex-col flex-1 min-h-[min(480px,70vh)]">
              {loading ? (
                <MapSkeleton height={portalLayout.mapColumnFill} />
              ) : mounted ? (
                <CrisisHubMap
                  alerts={activeAlerts}
                  warnings={[]}
                  showWarnings={false}
                  center={DAET_CENTER}
                  heightClass={portalLayout.mapColumnFill}
                />
              ) : null}
            </section>
          </PublicPanel>

        </div>
        </div>

        <PublicPanel title="Safety instructions for tourists" bodyClassName="bg-zinc-900 text-white">

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm font-medium opacity-90 text-left">

            <p>1. During typhoon season (June–December), check this page before visiting beaches or remote areas.</p>

            <p>2. Save emergency numbers: <strong>911</strong> (national), <strong>117</strong> (PNP), municipal hotline <strong>(054) 472-3000</strong>, tourism office <strong>0907 834 1818</strong>.</p>

            <p>3. When a Critical alert is posted, follow the listed instructions and avoid named affected areas.</p>

            {!isAuthenticated ? (

              <p>4. Register your account to receive email, SMS, and app notifications when the tourism office issues a new alert.</p>

            ) : (

              <p>4. Check your Notifications inbox when the tourism office issues a new alert for your registered contact details.</p>

            )}

          </div>

        </PublicPanel>

      </PublicPageContent>



      <AlertDetailModal alert={selectedAlertData} onClose={() => setSelectedAlert(null)} />

    </PublicPageShell>

  );

}


