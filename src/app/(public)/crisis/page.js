"use client";

import React, { useState, useEffect } from "react";
import { 
  Shield, Info, MapPin, 
  Clock, Bell, X, Radio
} from "lucide-react";
import { Card } from "@/app/components/ui/Card";
import { useCrisisStore, useAuthStore } from "@/app/store/crisisStore";
import { InfoPageHero, PublicPageShell, PublicPageContent, publicLayout } from "@/app/components/InfoPageHero";
import { AsyncState, ErrorState } from "@/app/components/ui/AsyncState";
import { PublicStatCardSkeleton, AlertCardSkeletonList, MapSkeleton } from "@/app/components/ui/Skeletons";
import { PublicStatCard } from "@/app/components/dashboard/PublicStatCard";
import { OutlinedCard } from "@/app/components/ui/OutlinedCard";
import { typography, iconSize, statGrid, getSeverityOutline, outlinedCard } from "@/lib/designSystem";
import { CrisisHubMap } from "@/app/components/maps/CrisisHubMap";
import { ROLE_INTERFACE } from "@/lib/roleInterfaceCopy";
import { RoleContextBanner } from "@/app/components/dashboard/RoleContextBanner";
export default function CrisisPublicPage() {
  const { alerts, fetchAlerts, loading, error } = useCrisisStore();
  const { isAuthenticated } = useAuthStore();
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [viewedAlerts, setViewedAlerts] = useState(new Set());
  const [mounted, setMounted] = useState(false);

  const DAET_CENTER = [14.1122, 122.9553];

  useEffect(() => {
    setMounted(true);
    // #region agent log
    fetch("http://127.0.0.1:7540/ingest/3142bff0-53ba-4c2c-9606-b4d021977f0c", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "ee1adc" },
      body: JSON.stringify({
        sessionId: "ee1adc",
        runId: "remove-dup-nav",
        hypothesisId: "NAV1",
        location: "crisis/page.js:mount",
        message: "Crisis hub loaded without inline analytics or cross-page nav links",
        data: { hasAnalyticsSection: false, hasResolvedLink: false, hasRoutesLink: false },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion

    const initRealtime = async () => {
      const cleanup = await fetchAlerts();
      return cleanup;
    };
    
    const cleanupPromise = initRealtime();

    return () => {
      setMounted(false);
      cleanupPromise.then(cleanup => {
        if (cleanup && typeof cleanup === 'function') cleanup();
      });
    };
  }, [fetchAlerts]);

  const activeAlerts = alerts.filter((a) => a.status === "Active" && a.is_public);
  const criticalAlerts = activeAlerts.filter((a) => a.severity === "Critical");

  const handleViewAlert = (alertId) => {
    setSelectedAlert(alertId);
    if (!viewedAlerts.has(alertId)) {
      setViewedAlerts(prev => new Set(prev).add(alertId));
    }
  };

  const selectedAlertData = alerts.find((a) => a.id === selectedAlert);

  const getPublicSeverityStyles = (severity) => getSeverityOutline(severity);

  return (
    <PublicPageShell>
      <InfoPageHero
        title={ROLE_INTERFACE.public.crisisHub.title}
        description={ROLE_INTERFACE.public.crisisHub.description}
      />

      <PublicPageContent>
        <section className={publicLayout.section}>
          <RoleContextBanner helper={ROLE_INTERFACE.public.crisisHub.helper} tone="info" />
        </section>
        {!loading && criticalAlerts.length > 0 && (
          <section className={`${publicLayout.section} p-4 bg-red-600 rounded-2xl flex items-center justify-between shadow-xl shadow-red-600/20`}>
            <div className="flex items-center gap-3">
              <Shield className="text-white animate-pulse" size={22} />
              <p className="text-white font-black uppercase text-xs tracking-widest">
                {criticalAlerts.length} critical alert{criticalAlerts.length > 1 ? "s" : ""} active — follow instructions below
              </p>
            </div>
            <span className="text-[10px] font-bold text-white/80 uppercase hidden sm:inline">Daet, Camarines Norte</span>
          </section>
        )}

        <section className={publicLayout.section}>
          {loading ? (
            <PublicStatCardSkeleton count={3} className={statGrid.crisisHub} compact />
          ) : (
          <div className={statGrid.crisisHub}>
            <PublicStatCard compact value={activeAlerts.length} label="Active Alerts" accent="blue" />
            <PublicStatCard compact value={criticalAlerts.length} label="Require Immediate Action" accent="red" />
            <PublicStatCard compact value={viewedAlerts.size} label="Alerts Acknowledged" accent="green" />
          </div>
          )}
        </section>

        <section className={publicLayout.section}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            <div className="text-left">
              <h2 className={`${publicLayout.sectionTitle} flex items-center gap-2 mb-4`}>
                <Bell className="text-blue-600" size={iconSize.section} /> Active Announcements
              </h2>

              <div className={`${publicLayout.stack} max-h-[600px] overflow-y-auto`}>
                <AsyncState
                  loading={loading}
                  error={error}
                  isEmpty={!loading && !error && activeAlerts.length === 0}
                  onRetry={fetchAlerts}
                  loadingFallback={<AlertCardSkeletonList count={3} />}
                  errorFallback={
                    <ErrorState message={error} onRetry={fetchAlerts} title="Could not load alerts" />
                  }
                  emptyFallback={
                    <div className="text-center py-16 bg-zinc-50 rounded-3xl border-2 border-dashed border-zinc-200">
                      <Info size={iconSize.emptyLg} className="mx-auto text-zinc-300 mb-4" />
                      <p className="font-bold text-zinc-400 uppercase tracking-widest text-xs">No Active Alerts</p>
                      <p className="text-zinc-400 text-sm mt-2 font-medium">No crisis is currently reported for Daet. Check back when LGU issues a new advisory.</p>
                    </div>
                  }
                >
                  {activeAlerts.map((alert) => {
                    const styles = getPublicSeverityStyles(alert.severity);
                    return (
                      <OutlinedCard
                        key={alert.id}
                        variant="severity"
                        severity={alert.severity}
                        padding={outlinedCard.alertPadding}
                        onClick={() => handleViewAlert(alert.id)}
                        className="group cursor-pointer hover:scale-[1.01] text-left"
                      >
                        <div className={publicLayout.stackTight}>
                          <div className="flex gap-2 flex-wrap">
                            <span className={`text-[9px] font-black uppercase px-2 py-1 rounded ${styles.badge}`}>{alert.severity}</span>
                            <span className="text-[9px] font-black uppercase px-2 py-1 bg-zinc-100 rounded">INCIDENT: {alert.type}</span>
                          </div>
                          <h3 className={typography.cardTitle}>{alert.title}</h3>
                          <p className="text-zinc-500 line-clamp-2 text-sm leading-relaxed">{alert.message}</p>
                          <div className="flex flex-wrap items-center gap-4 text-[10px] font-bold text-zinc-400">
                            <span className="flex items-center gap-1.5 uppercase"><MapPin size={iconSize.inlineSm} className="text-blue-600" /> {alert.location}</span>
                            <span className="flex items-center gap-1.5 uppercase"><Clock size={iconSize.inlineSm} /> {new Date(alert.created_at).toLocaleTimeString()}</span>
                          </div>
                        </div>
                      </OutlinedCard>
                    );
                  })}
                </AsyncState>
              </div>
            </div>

            <div className={`text-left ${selectedAlert ? "pointer-events-none opacity-40" : ""}`}>
              <h2 className={`${publicLayout.sectionTitle} flex items-center gap-2 mb-4`}>
                <Radio className="text-red-500 animate-pulse" size={iconSize.section} /> Affected Areas Map
              </h2>
              {loading ? (
                <MapSkeleton height="h-[480px]" />
              ) : mounted && (
                <CrisisHubMap
                  alerts={activeAlerts}
                  warnings={[]}
                  showWarnings={false}
                  center={DAET_CENTER}
                  heightClass="h-[min(480px,70vh)] sm:h-[480px]"
                />
              )}
            </div>
          </div>
        </section>

        <section className={`${publicLayout.section} p-8 bg-zinc-900 rounded-3xl text-white`}>
          <h3 className="text-xl font-black uppercase mb-4 flex items-center gap-2 text-left">
            <Info size={20} className="text-blue-400" /> Safety Instructions for Tourists
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm font-medium opacity-90 text-left">
            <p>1. During typhoon season (June–December), check this page before visiting beaches or remote areas.</p>
            <p>2. Save emergency numbers: <strong>911</strong> (national), <strong>117</strong> (PNP), municipal hotline <strong>(054) 472-3000</strong>, tourism office <strong>0907 834 1818</strong>.</p>
            <p>3. When a Critical alert is posted, follow the listed instructions and avoid named affected areas.</p>
            {!isAuthenticated ? (
              <p>4. Register your account to receive email, SMS, and app notifications when LGU issues a new alert.</p>
            ) : (
              <p>4. Check your Notifications inbox when LGU issues a new alert for your registered contact details.</p>
            )}
          </div>
        </section>
      </PublicPageContent>

      {selectedAlertData && (
        <div
          className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          onClick={() => setSelectedAlert(null)}
          role="dialog"
          aria-modal="true"
        >
           <Card className="relative z-[2001] max-w-2xl w-full p-0 overflow-hidden border-none shadow-2xl animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
              <div className="bg-blue-600 p-8 text-white text-left">
                <div className="flex justify-between items-start mb-6">
                  <div className="p-3 bg-white/20 rounded-2xl"><Shield size={iconSize.empty} /></div>
                  <button onClick={() => setSelectedAlert(null)}><X /></button>
                </div>
                <h2 className={`${typography.heroTitle} mb-4`}>{selectedAlertData.title}</h2>
                <div className="flex gap-2 text-[10px] font-black uppercase text-left font-sans">
                  <span className="bg-white/20 px-2 py-1 rounded font-sans">{selectedAlertData.severity}</span>
                  <span className="bg-white/20 px-2 py-1 rounded font-sans">{selectedAlertData.location}</span>
                </div>
              </div>
              <div className="p-8 space-y-6 bg-white text-left">
                <p className="text-sm font-medium leading-relaxed">{selectedAlertData.message}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-100">
                    <p className="text-[10px] font-black uppercase text-zinc-400 mb-1">Reported</p>
                    <p className="font-bold text-zinc-900">{new Date(selectedAlertData.created_at).toLocaleString()}</p>
                  </div>
                  <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-100">
                    <p className="text-[10px] font-black uppercase text-zinc-400 mb-1">Status</p>
                    <p className="font-bold text-zinc-900 uppercase">{selectedAlertData.status}</p>
                  </div>
                </div>
                <div className={`${publicLayout.ctaCard.replace('mt-12', 'mt-0')} flex items-start gap-4`}>
                  <Shield className="text-blue-600 shrink-0" size={iconSize.auth} />
                  <div>
                    <p className="text-xs font-black uppercase text-blue-700 tracking-widest mb-1">Recommended Actions</p>
                    <p className="text-sm font-medium text-blue-900 leading-relaxed">
                      Follow the instructions above. Avoid the affected area ({selectedAlertData.location}) until this alert is marked Resolved. For immediate danger, call 911 or 117.
                    </p>
                  </div>
                </div>
                <button onClick={() => setSelectedAlert(null)} className="w-full py-4 bg-zinc-900 text-white rounded-2xl font-black uppercase text-xs tracking-widest">Acknowledge & Close</button>
              </div>
           </Card>
        </div>
      )}
    </PublicPageShell>
  );
}