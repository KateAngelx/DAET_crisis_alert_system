"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Archive,
  ArrowRight,
  CheckCircle,
  FileWarning,
  MapPin,
  Navigation,
  Radio,
  Route,
  ShieldAlert,
  XCircle,
} from "lucide-react";
import { DashboardPageHeader } from "@/app/components/dashboard/DashboardPageHeader";
import { DashboardStatCard } from "@/app/components/dashboard/DashboardStatCard";
import { AdminDashboardKpiSection } from "@/app/components/admin/AdminDashboardKpiSection";
import {
  AdminDashboardQuickNavDivider,
  AdminDashboardQuickNavLink,
  AdminDashboardQuickNavRow,
} from "@/app/components/admin/AdminDashboardQuickNavLink";
import { AdminPanel } from "@/app/components/admin/AdminPanel";
import { RoleContextBanner } from "@/app/components/dashboard/RoleContextBanner";
import { useCrisisStore } from "@/app/store/crisisStore";
import { useIncidentStore } from "@/app/store/incidentStore";
import { useRouteAdvisoryStore } from "@/app/store/routeAdvisoryStore";
import { useDangerousLocationStore } from "@/app/store/dangerousLocationStore";
import { CrisisAlertListCard } from "@/app/components/crisis/CrisisAlertListCard";
import { PublicCardListPreview } from "@/app/components/shell/PublicCardListPreview";
import { AlertCardSkeletonList } from "@/app/components/ui/Skeletons";
import { adminShell, iconSize, portalLayout, statGrid } from "@/lib/designSystem";
import { StatCardSkeletonGrid } from "@/app/components/ui/Skeletons";
import {
  ARCHIVE_INCIDENT_STATUSES,
  incidentStatusBadgeClass,
  normalizeIncidentStatusLabel,
} from "@/lib/incidentStatusUtils";

export default function AdminArchivePage() {
  const { alerts, fetchAlerts, loading: alertsLoading } = useCrisisStore();
  const { incidents, fetchIncidents, loading: incidentsLoading } = useIncidentStore();
  const { advisories, fetchAdvisories, loading: routesLoading } = useRouteAdvisoryStore();
  const { warnings, fetchWarnings, loading: hazardsLoading } = useDangerousLocationStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    fetchAlerts();
    fetchIncidents();
    fetchAdvisories();
    fetchWarnings();
  }, [fetchAlerts, fetchIncidents, fetchAdvisories, fetchWarnings]);

  const resolvedAlerts = useMemo(
    () =>
      alerts
        .filter((a) => a.status === "Resolved")
        .sort((a, b) => new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at)),
    [alerts]
  );

  const closedIncidents = useMemo(
    () =>
      incidents
        .filter((i) => ARCHIVE_INCIDENT_STATUSES.includes(i.status))
        .sort((a, b) => new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at)),
    [incidents]
  );

  const inactiveRoutes = useMemo(
    () => advisories.filter((a) => a.status !== "Active"),
    [advisories]
  );

  const inactiveHazards = useMemo(
    () => warnings.filter((w) => w.status !== "Active"),
    [warnings]
  );

  const incidentStatusCounts = useMemo(() => {
    const counts = { Resolved: 0, Closed: 0, Rejected: 0 };
    closedIncidents.forEach((i) => {
      const key = ARCHIVE_INCIDENT_STATUSES.includes(i.status) ? i.status : "Closed";
      if (counts[key] !== undefined) counts[key] += 1;
    });
    return counts;
  }, [closedIncidents]);

  const loading = alertsLoading || incidentsLoading || routesLoading || hazardsLoading;

  useEffect(() => {
    if (!mounted) return;
    // #region agent log
    fetch("http://127.0.0.1:7540/ingest/3142bff0-53ba-4c2c-9606-b4d021977f0c", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "197cec" },
      body: JSON.stringify({
        sessionId: "197cec",
        runId: "admin-archive-v3",
        hypothesisId: "H-archive",
        location: "admin/archive/page.js:layout",
        message: "Archive grid counts by status",
        data: {
          closedIncidents: closedIncidents.length,
          inactiveRoutes: inactiveRoutes.length,
          inactiveHazards: inactiveHazards.length,
          resolvedAlerts: resolvedAlerts.length,
          incidentStatusCounts,
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
  }, [
    mounted,
    closedIncidents.length,
    inactiveRoutes.length,
    inactiveHazards.length,
    resolvedAlerts.length,
    incidentStatusCounts,
  ]);

  const listPane = portalLayout.listScrollPaneAdmin;

  return (
    <>
      <DashboardPageHeader
        title="Archive & History"
        description="Admin-only record of closed incidents, inactive routes and hazards, and resolved crisis alerts."
        action={
          <Link href="/crisis/admin" className={`${adminShell.btnPrimary} no-underline`}>
            Command Center <ArrowRight size={iconSize.inline} />
          </Link>
        }
      />

      <RoleContextBanner
        helper="Status changes on Incident Reports (Approved, Rejected, Resolved, Closed) appear here after the next refresh."
        tone="info"
      />

      <AdminDashboardKpiSection
        pageId="archive"
        footer={
          <AdminDashboardQuickNavRow>
            <AdminDashboardQuickNavLink href="/crisis/admin" icon={Radio} label="Command Center" />
            <AdminDashboardQuickNavDivider />
            <AdminDashboardQuickNavLink
              href="/admin/incidents"
              icon={FileWarning}
              label="Incident reports"
            />
            <AdminDashboardQuickNavDivider />
            <AdminDashboardQuickNavLink href="/crisis/admin/routes" icon={Route} label="Roads & hazards" />
          </AdminDashboardQuickNavRow>
        }
      >
        {loading ? (
          <StatCardSkeletonGrid count={4} className={statGrid.dashboard} />
        ) : (
          <div className={statGrid.dashboard}>
            <DashboardStatCard
              compact
              label="Closed incidents"
              value={closedIncidents.length}
              icon={<FileWarning size={iconSize.stat} />}
              accent="blue"
            />
            <DashboardStatCard
              compact
              label="Inactive routes"
              value={inactiveRoutes.length}
              icon={<Navigation size={iconSize.stat} />}
              accent="orange"
            />
            <DashboardStatCard
              compact
              label="Inactive hazards"
              value={inactiveHazards.length}
              icon={<ShieldAlert size={iconSize.stat} />}
              accent="orange"
            />
            <DashboardStatCard
              compact
              label="Resolved alerts"
              value={resolvedAlerts.length}
              icon={<CheckCircle size={iconSize.stat} />}
              accent="green"
            />
          </div>
        )}
      </AdminDashboardKpiSection>

      <div className={portalLayout.archiveGrid}>
        <AdminPanel
          title="Closed incidents"
          subtitle={`${closedIncidents.length} resolved, closed, or rejected`}
          action={
            <Link href="/admin/incidents" className={`${adminShell.btnGhost} no-underline`}>
              <FileWarning size={iconSize.inline} /> Manage
            </Link>
          }
          bodyClassName={portalLayout.panelBodyStack}
        >
          {loading ? (
            <AlertCardSkeletonList count={3} />
          ) : closedIncidents.length === 0 ? (
            <p className="text-xs text-zinc-500 font-medium py-8 text-center">No closed incidents yet.</p>
          ) : (
            <div className={`${listPane} overflow-x-auto`}>
              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr className="bg-zinc-50 text-zinc-500 text-[9px] uppercase tracking-widest font-black">
                    <th className="px-4 py-3 text-left">Reference</th>
                    <th className="px-4 py-3 text-left">Category</th>
                    <th className="px-4 py-3 text-left">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {closedIncidents.slice(0, 40).map((inc) => (
                    <tr key={inc.id} className="hover:bg-zinc-50/80">
                      <td className="px-4 py-3 font-mono font-black text-blue-600">
                        {inc.reference_number || inc.id.slice(0, 8)}
                      </td>
                      <td className="px-4 py-3 font-black uppercase text-zinc-800 max-w-[140px] truncate">
                        {inc.category}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`text-[8px] font-black uppercase px-2 py-1 rounded-full ${incidentStatusBadgeClass(inc.status)}`}
                        >
                          {normalizeIncidentStatusLabel(inc.status)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </AdminPanel>

        <AdminPanel
          title="Inactive routes"
          subtitle={`${inactiveRoutes.length} off the live map`}
          action={
            <Link href="/crisis/admin/routes" className={`${adminShell.btnGhost} no-underline`}>
              <Navigation size={iconSize.inline} /> Roads
            </Link>
          }
          bodyClassName={portalLayout.panelBodyStack}
        >
          {loading ? (
            <AlertCardSkeletonList count={2} />
          ) : inactiveRoutes.length === 0 ? (
            <p className="text-xs text-zinc-500 font-medium py-8 text-center">No inactive routes.</p>
          ) : (
            <ul className={`${listPane} space-y-2`}>
              {inactiveRoutes.slice(0, 25).map((r) => (
                <li key={r.id} className="rounded-xl border border-zinc-200 bg-zinc-50/50 px-3 py-2.5 text-xs">
                  <p className="font-black uppercase text-zinc-900 truncate">{r.title}</p>
                  <p className="text-zinc-500 mt-1 flex items-center gap-1">
                    <MapPin size={iconSize.inlineSm} className="text-blue-500 shrink-0" />
                    {r.from_location || "—"} → {r.to_location || "—"}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </AdminPanel>

        <AdminPanel
          title="Inactive area hazards"
          subtitle={`${inactiveHazards.length} deactivated`}
          action={
            <Link href="/crisis/admin/routes?tab=areas" className={`${adminShell.btnGhost} no-underline`}>
              <ShieldAlert size={iconSize.inline} /> Hazards
            </Link>
          }
          bodyClassName={portalLayout.panelBodyStack}
        >
          {loading ? (
            <AlertCardSkeletonList count={2} />
          ) : inactiveHazards.length === 0 ? (
            <p className="text-xs text-zinc-500 font-medium py-8 text-center">No inactive area hazards.</p>
          ) : (
            <ul className={`${listPane} space-y-2`}>
              {inactiveHazards.slice(0, 25).map((w) => (
                <li key={w.id} className="rounded-xl border border-zinc-200 bg-zinc-50/50 px-3 py-2.5 text-xs">
                  <p className="font-black uppercase text-zinc-900 truncate">{w.dangerous_location}</p>
                  <p className="text-zinc-500 mt-1">{w.severity}</p>
                </li>
              ))}
            </ul>
          )}
        </AdminPanel>
      </div>

      <div className={portalLayout.archiveGrid}>
        <AdminPanel
          title="Resolved crisis alerts"
          subtitle={`${resolvedAlerts.length} on record — admin view only`}
          bodyClassName={portalLayout.panelBodyStack}
        >
          {loading ? (
            <AlertCardSkeletonList count={3} />
          ) : resolvedAlerts.length === 0 ? (
            <p className="text-sm text-zinc-500 font-medium py-8 text-center">No resolved alerts yet.</p>
          ) : (
            <PublicCardListPreview
              items={resolvedAlerts}
              modalTitle="Resolved crisis alerts"
              listClassName="space-y-3"
              scrollPaneClassName={portalLayout.listScrollPane}
              renderItem={(alert) => (
                <CrisisAlertListCard
                  alert={alert}
                  resolved
                  timeLabel={new Date(alert.updated_at || alert.created_at).toLocaleString()}
                />
              )}
            />
          )}
        </AdminPanel>

        <AdminPanel title="Incident outcomes" subtitle="Counts from closed reports">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded-xl border border-green-200 bg-green-50/60 p-4">
              <CheckCircle size={iconSize.section} className="text-green-600 mb-2" />
              <p className="text-[10px] font-black uppercase text-zinc-500 tracking-widest">Resolved</p>
              <p className="text-2xl font-black text-zinc-900 tabular-nums">{incidentStatusCounts.Resolved}</p>
            </div>
            <div className="rounded-xl border border-zinc-200 bg-zinc-50/80 p-4">
              <Archive size={iconSize.section} className="text-zinc-600 mb-2" />
              <p className="text-[10px] font-black uppercase text-zinc-500 tracking-widest">Closed</p>
              <p className="text-2xl font-black text-zinc-900 tabular-nums">{incidentStatusCounts.Closed}</p>
            </div>
            <div className="rounded-xl border border-red-200 bg-red-50/60 p-4">
              <XCircle size={iconSize.section} className="text-red-600 mb-2" />
              <p className="text-[10px] font-black uppercase text-zinc-500 tracking-widest">Rejected</p>
              <p className="text-2xl font-black text-zinc-900 tabular-nums">{incidentStatusCounts.Rejected}</p>
            </div>
          </div>
        </AdminPanel>

        <AdminPanel title="Related admin tools">
          <div className="flex flex-col gap-3">
            <Link href="/admin/incidents" className={`${adminShell.btnPrimary} no-underline justify-center`}>
              <FileWarning size={iconSize.inline} /> Incident reports
            </Link>
            <Link href="/crisis/admin/routes" className={`${adminShell.btnPrimary} no-underline justify-center`}>
              <Navigation size={iconSize.inline} /> Roads & hazards
            </Link>
            <Link href="/crisis/admin" className={`${adminShell.btnGhost} no-underline justify-center`}>
              <Radio size={iconSize.inline} /> Command Center
            </Link>
          </div>
        </AdminPanel>
      </div>

      <div className="flex items-center gap-2 text-zinc-400 text-[10px] font-bold uppercase tracking-widest px-1">
        <Archive size={iconSize.inline} /> Admin portal only — records refresh when stores reload.
      </div>
    </>
  );
}
