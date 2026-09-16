"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { ArrowRight, Bell, FileWarning, MapPin, Radio } from "lucide-react";
import { getSeverityColor, getStatusColor } from "@/lib/constants";
import { adminShell, iconSize, typography, portalLayout } from "@/lib/designSystem";
import { PublicCategorizedCardList } from "@/app/components/shell/PublicCategorizedCardList";
import { PublicCardListPreview } from "@/app/components/shell/PublicCardListPreview";
import { INCIDENT_SEVERITIES } from "@/lib/constants";

function formatRelativeTime(date) {
  if (!date) return "—";
  const d = new Date(date);
  const diffMs = Date.now() - d.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function PanelHeader({ icon: Icon, title, href, hrefLabel, count }) {
  return (
    <div className="flex items-center justify-between gap-2 mb-3 pb-3 border-b border-zinc-100">
      <div className="flex items-center gap-2 min-w-0">
        {Icon ? <Icon size={iconSize.section} className="text-zinc-400 shrink-0" /> : null}
        <h3 className={`${typography.sectionTitle} text-zinc-500 truncate`}>{title}</h3>
        {count != null && (
          <span className="text-[10px] font-black tabular-nums text-zinc-400 bg-zinc-100 px-1.5 py-0.5 rounded-md shrink-0">
            {count}
          </span>
        )}
      </div>
      {href && hrefLabel ? (
        <Link
          href={href}
          className="text-[10px] font-black uppercase tracking-widest text-blue-600 hover:underline flex items-center gap-0.5 shrink-0"
        >
          {hrefLabel} <ArrowRight size={11} />
        </Link>
      ) : null}
    </div>
  );
}

function EmptyBlock({ message }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 px-4 rounded-xl border border-dashed border-zinc-200 bg-zinc-50/50 text-center">
      <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">{message}</p>
    </div>
  );
}

export function AdminDashboardActivityPanel({
  affectedAreas = [],
  recentAlerts = [],
  recentIncidents = [],
}) {
  useEffect(() => {
    // #region agent log
    fetch("http://127.0.0.1:7540/ingest/3142bff0-53ba-4c2c-9606-b4d021977f0c", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "197cec" },
      body: JSON.stringify({
        sessionId: "197cec",
        runId: "admin-activity-panel",
        hypothesisId: "UI",
        location: "AdminDashboardActivityPanel.jsx:mount",
        message: "Activity panel rendered",
        data: {
          areas: affectedAreas.length,
          alerts: recentAlerts.length,
          incidents: recentIncidents.length,
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
  }, [affectedAreas.length, recentAlerts.length, recentIncidents.length]);

  return (
    <section className={adminShell.panel}>
      <div className={adminShell.panelHeader}>
        <h2 className={`${typography.sectionTitle} text-zinc-500 mb-0.5`}>Live activity</h2>
        <p className="text-xs text-zinc-400 font-medium">
          Affected locations, latest alerts, and incoming reports
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 lg:divide-x divide-zinc-100">
        <div className="lg:col-span-3 p-4 sm:p-5 border-b lg:border-b-0">
          <PanelHeader
            icon={MapPin}
            title="Affected areas"
            count={affectedAreas.length}
          />
          {affectedAreas.length > 0 ? (
            <PublicCardListPreview
              items={affectedAreas}
              modalTitle="Affected areas"
              listClassName="space-y-1.5"
              scrollPaneClassName={portalLayout.listScrollPaneAdmin}
              getItemKey={(area) => area}
              renderItem={(area) => (
                <div className="text-xs font-semibold text-zinc-700 flex items-center gap-2 py-2 px-2.5 rounded-lg border border-zinc-100 bg-zinc-50/80">
                  <MapPin size={12} className="text-blue-500 shrink-0" />
                  <span className="truncate">{area}</span>
                </div>
              )}
            />
          ) : (
            <EmptyBlock message="No active locations" />
          )}
        </div>

        <div className="lg:col-span-5 p-4 sm:p-5 border-b lg:border-b-0">
          <PanelHeader
            icon={Radio}
            title="Recent alerts"
            count={recentAlerts.length}
            href="/crisis/admin"
            hrefLabel="Command"
          />
          {recentAlerts.length > 0 ? (
            <PublicCategorizedCardList
              items={recentAlerts}
              getCategory={(alert) => alert.type}
              getSeverity={(alert) => alert.severity}
              modalTitle="Recent alerts"
              listClassName="space-y-2"
              listPaneClassName={portalLayout.listScrollPaneAdmin}
              renderItem={(alert) => (
                <div className="rounded-xl border border-zinc-100 bg-white p-3 hover:border-zinc-200 hover:shadow-sm transition-all">
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <div className="flex flex-wrap gap-1.5">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase ${getSeverityColor(alert.severity)}`}
                      >
                        {alert.severity}
                      </span>
                      <span className="px-1.5 py-0.5 rounded text-[8px] font-black uppercase bg-zinc-100 text-zinc-600">
                        {alert.type}
                      </span>
                      <span
                        className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase ${
                          alert.status === "Active"
                            ? "bg-red-100 text-red-700"
                            : "bg-green-100 text-green-700"
                        }`}
                      >
                        {alert.status}
                      </span>
                    </div>
                    <time
                      className="text-[9px] font-bold text-zinc-400 shrink-0 tabular-nums"
                      dateTime={alert.created_at}
                      title={alert.created_at ? new Date(alert.created_at).toLocaleString() : undefined}
                    >
                      {formatRelativeTime(alert.created_at)}
                    </time>
                  </div>
                  <p className="font-bold text-zinc-900 text-sm leading-snug line-clamp-2">{alert.title}</p>
                  <p className="text-[10px] text-zinc-500 flex items-center gap-1 mt-1 truncate">
                    <MapPin size={10} className="shrink-0 text-zinc-400" />
                    {alert.location || "No location"}
                  </p>
                </div>
              )}
            />
          ) : (
            <EmptyBlock message="No alerts yet" />
          )}
        </div>

        <div className="lg:col-span-4 p-4 sm:p-5">
          <PanelHeader
            icon={FileWarning}
            title="Incident reports"
            count={recentIncidents.length}
            href="/admin/incidents"
            hrefLabel="View all"
          />
          {recentIncidents.length > 0 ? (
            <PublicCategorizedCardList
              items={recentIncidents}
              getCategory={(inc) => inc.category}
              getSeverity={(inc) => inc.severity}
              categoryLabel="Report category"
              severityOrder={[...INCIDENT_SEVERITIES].reverse()}
              modalTitle="Incident reports"
              listClassName="space-y-2"
              listPaneClassName={portalLayout.listScrollPaneAdmin}
              renderItem={(inc) => (
                <Link href="/admin/incidents" className="block no-underline group">
                  <div className="rounded-xl border border-zinc-100 bg-white p-3 group-hover:border-zinc-200 group-hover:shadow-sm transition-all">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-mono text-[9px] text-blue-600 font-black truncate">
                        {inc.reference_number}
                      </p>
                      <time className="text-[9px] font-bold text-zinc-400 shrink-0" dateTime={inc.created_at}>
                        {formatRelativeTime(inc.created_at)}
                      </time>
                    </div>
                    <p className="font-bold text-zinc-900 text-sm mt-1 line-clamp-1">{inc.category}</p>
                    <p className="text-[10px] text-zinc-500 truncate mt-0.5">{inc.location}</p>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      <span
                        className={`px-1.5 py-0.5 rounded-full text-[8px] font-black uppercase ${getSeverityColor(inc.severity)}`}
                      >
                        {inc.severity}
                      </span>
                      <span
                        className={`px-1.5 py-0.5 rounded-full text-[8px] font-black uppercase ${getStatusColor(inc.status)}`}
                      >
                        {inc.status}
                      </span>
                    </div>
                  </div>
                </Link>
              )}
            />
          ) : (
            <EmptyBlock message="No reports yet" />
          )}
        </div>
      </div>
    </section>
  );
}
