"use client";

import React, { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { Bell, CheckCircle, Clock, MapPin, Info } from "lucide-react";
import { useCrisisStore } from "@/app/store/crisisStore";
import {
  InfoPageHero,
  PublicPageShell,
  PublicPageContent,
  publicLayout,
  PublicInfoCallout,
} from "@/app/components/InfoPageHero";
import { AsyncState, ErrorState } from "@/app/components/ui/AsyncState";
import { AlertCardSkeletonList } from "@/app/components/ui/Skeletons";
import { PublicStatCard } from "@/app/components/dashboard/PublicStatCard";
import { OutlinedCard } from "@/app/components/ui/OutlinedCard";
import { typography, iconSize, statGrid, getSeverityOutline, outlinedCard } from "@/lib/designSystem";
import { ROLE_INTERFACE } from "@/lib/roleInterfaceCopy";
import { RoleContextBanner } from "@/app/components/dashboard/RoleContextBanner";

function formatResolvedAt(alert) {
  const date = alert.updated_at || alert.created_at;
  return date ? new Date(date).toLocaleString() : "—";
}

export default function ResolvedAlertsPage() {
  const { alerts, fetchAlerts, loading, error } = useCrisisStore();
  const [mounted, setMounted] = useState(false);
  const contentRef = useRef(null);

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
    const el = contentRef.current;
    const rect = el?.getBoundingClientRect();
    const resolved = alerts.filter((a) => a.status === "Resolved" && a.is_public);
    // #region agent log
    fetch("http://127.0.0.1:7540/ingest/3142bff0-53ba-4c2c-9606-b4d021977f0c", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "ee1adc" },
      body: JSON.stringify({
        sessionId: "ee1adc",
        runId: "resolved-layout-fix",
        hypothesisId: "H1",
        location: "crisis/resolved/page.js:layout",
        message: "Resolved page content width",
        data: {
          contentWidth: rect?.width ?? null,
          viewportWidth: window.innerWidth,
          resolvedCount: resolved.length,
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
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

  return (
    <PublicPageShell>
      <InfoPageHero
        title={ROLE_INTERFACE.public.resolvedAlerts.title}
        description={ROLE_INTERFACE.public.resolvedAlerts.description}
      />

      <PublicPageContent>
        <div ref={contentRef}>
          <section className={publicLayout.section}>
            <RoleContextBanner helper={ROLE_INTERFACE.public.resolvedAlerts.helper} tone="info" />
          </section>

          <section className={publicLayout.section}>
            <div className={`${statGrid.crisisHub} grid-cols-2`}>
              <PublicStatCard compact value={resolvedAlerts.length} label="Resolved Alerts" accent="green" />
              <PublicStatCard compact value={recentCount} label="Resolved This Week" accent="blue" />
            </div>
          </section>

          <section className={publicLayout.section}>
            <h2 className={`${publicLayout.sectionTitle} flex items-center gap-2 mb-4`}>
              <CheckCircle className="text-green-600" size={iconSize.section} />
              Resolved Incidents & Alerts
            </h2>

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
                <div className="text-center py-16 bg-zinc-50 rounded-3xl border-2 border-dashed border-zinc-200">
                  <Info size={iconSize.emptyLg} className="mx-auto text-zinc-300 mb-4" />
                  <p className="font-bold text-zinc-400 uppercase tracking-widest text-xs">No Resolved Alerts Yet</p>
                  <p className="text-zinc-400 text-sm mt-2 font-medium max-w-md mx-auto">
                    When Daet LGU marks an emergency alert as resolved, it will appear here for reference. Use Crisis Hub in the menu for active alerts.
                  </p>
                </div>
              }
            >
              <div className={publicLayout.stack}>
                {resolvedAlerts.map((alert) => {
                  const styles = getSeverityOutline(alert.severity);
                  return (
                    <OutlinedCard
                      key={alert.id}
                      variant="severity"
                      severity={alert.severity}
                      padding={outlinedCard.alertPadding}
                      className="text-left opacity-95"
                    >
                      <div className={publicLayout.stackTight}>
                        <div className="flex gap-2 flex-wrap items-center">
                          <span className="text-[9px] font-black uppercase px-2 py-1 rounded bg-green-100 text-green-700">
                            Resolved
                          </span>
                          <span className={`text-[9px] font-black uppercase px-2 py-1 rounded ${styles.badge}`}>
                            {alert.severity}
                          </span>
                          <span className="text-[9px] font-black uppercase px-2 py-1 bg-zinc-100 rounded">
                            {alert.type}
                          </span>
                        </div>
                        <h3 className={typography.cardTitle}>{alert.title}</h3>
                        <p className="text-zinc-500 text-sm leading-relaxed line-clamp-3">{alert.message}</p>
                        <div className="flex flex-wrap items-center gap-4 text-[10px] font-bold text-zinc-400">
                          <span className="flex items-center gap-1.5 uppercase">
                            <MapPin size={iconSize.inlineSm} className="text-blue-600" /> {alert.location}
                          </span>
                          <span className="flex items-center gap-1.5 uppercase">
                            <Clock size={iconSize.inlineSm} /> Resolved {formatResolvedAt(alert)}
                          </span>
                        </div>
                      </div>
                    </OutlinedCard>
                  );
                })}
              </div>
            </AsyncState>
          </section>

          <section className={publicLayout.section}>
            <PublicInfoCallout variant="zinc" label="Your incident reports">
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
          </section>
        </div>
      </PublicPageContent>
    </PublicPageShell>
  );
}
