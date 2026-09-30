"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle, Compass, FileText, History } from "lucide-react";
import { GuidePageHeader } from "@/app/components/guide/GuidePageHeader";
import { GuidePanel } from "@/app/components/guide/GuidePanel";
import { CompletedToursPanel } from "@/app/components/tour/CompletedToursPanel";
import { CrisisHubMap } from "@/app/components/maps/CrisisHubMap";
import { AlertDetailModal } from "@/app/components/crisis/AlertDetailModal";
import { CategoryFilterSelect, StatusRecordList } from "@/app/components/shell/StatusRecordList";
import {
  DEFAULT_CRISIS_TYPE_OPTIONS,
  DEFAULT_SEVERITY_ORDER,
} from "@/app/components/shell/PublicCategorizedCardFilters";
import { useAuthStore, useCrisisStore } from "@/app/store/crisisStore";
import { useGuideStore } from "@/app/store/guideStore";
import { AlertCardSkeletonList, MapSkeleton, StatCardSkeletonGrid } from "@/app/components/ui/Skeletons";
import { getSeverityOutline, guideShell, portalLayout, statGrid, iconSize } from "@/lib/designSystem";
import { DashboardStatCard } from "@/app/components/dashboard/DashboardStatCard";

const CLOSED_REPORT_STATUSES = ["Resolved", "Closed", "Rejected"];

export default function GuideHistoryPage() {
  const { user } = useAuthStore();
  const { alerts, fetchAlerts, loading: alertsLoading } = useCrisisStore();
  const { tourGroups, guideIncidents, fetchTourGroups, fetchGuideIncidents, loading: guideLoading } = useGuideStore();
  const [mounted, setMounted] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [selectedAlert, setSelectedAlert] = useState(null);

  useEffect(() => {
    if (!user?.id) return;
    fetchTourGroups(user.id);
    fetchGuideIncidents(user.id);
    fetchAlerts();
  }, [user?.id, fetchTourGroups, fetchGuideIncidents, fetchAlerts]);

  useEffect(() => {
    setMounted(true);
  }, []);

  const completedGroups = useMemo(() => tourGroups.filter((g) => g.status === "completed"), [tourGroups]);
  const closedReports = useMemo(
    () => guideIncidents.filter((i) => CLOSED_REPORT_STATUSES.includes(i.status)),
    [guideIncidents]
  );
  const resolvedAlerts = useMemo(
    () => alerts.filter((a) => a.status === "Resolved" && a.is_public),
    [alerts]
  );

  const filteredAlerts = useMemo(() => {
    return resolvedAlerts.filter((alert) => {
      if (categoryFilter !== "all" && (alert.type || "General") !== categoryFilter) return false;
      if (severityFilter !== "all" && alert.severity !== severityFilter) return false;
      return true;
    });
  }, [resolvedAlerts, categoryFilter, severityFilter]);

  const alertRows = filteredAlerts.map((alert) => ({
    id: alert.id,
    status: alert.severity || "Low",
    statusClass: getSeverityOutline(alert.severity).badge,
    place: alert.location || alert.title,
    type: alert.type || "General",
    when: new Date(alert.updated_at || alert.created_at).toLocaleString(),
    onSelect: () => setSelectedAlert(alert),
    ariaLabel: "View resolved alert",
  }));

  useEffect(() => {
    if (!mounted) return;
  }, [mounted, completedGroups.length, closedReports.length, resolvedAlerts.length]);

  const loading = alertsLoading || guideLoading;

  return (
    <>
      <GuidePageHeader
        title="History & Records"
        description="Completed tours, closed group reports, and resolved crisis alerts for your reference."
        action={
          <Link href="/guide/groups" className={`${guideShell.btnGuide} no-underline`}>
            Active groups <ArrowRight size={14} />
          </Link>
        }
      />

      {loading && tourGroups.length === 0 ? (
        <StatCardSkeletonGrid count={3} className={statGrid.dashboardThree} />
      ) : (
        <div className={statGrid.dashboardThree}>
          <DashboardStatCard compact label="Completed Tours" value={completedGroups.length} icon={<Compass size={iconSize.stat} />} accent="green" />
          <DashboardStatCard compact label="Closed Reports" value={closedReports.length} icon={<FileText size={iconSize.stat} />} accent="blue" />
          <DashboardStatCard compact label="Resolved Alerts" value={resolvedAlerts.length} icon={<CheckCircle size={iconSize.stat} />} accent="green" />
        </div>
      )}

      <GuidePanel title="Completed tours" subtitle="Finished tour groups">
        {loading ? (
          <AlertCardSkeletonList count={2} />
        ) : completedGroups.length === 0 ? (
          <p className="text-sm text-zinc-500 font-medium py-6">No completed tours yet.</p>
        ) : (
          <CompletedToursPanel groups={completedGroups} guideId={user?.id} />
        )}
      </GuidePanel>

      <GuidePanel title="Closed group reports" bodyClassName={portalLayout.panelBodyStack}>
        {loading ? (
          <AlertCardSkeletonList count={2} />
        ) : closedReports.length === 0 ? (
          <p className="text-sm text-zinc-500 font-medium py-6">No closed reports yet.</p>
        ) : (
          <div className="space-y-3">
            {closedReports.map((inc) => (
              <Link
                key={inc.id}
                href={`/guide/reports/${inc.id}`}
                className="block rounded-xl border border-zinc-200 bg-white p-4 hover:border-blue-200 transition-colors no-underline"
              >
                <p className="font-mono text-xs text-blue-600 font-black">{inc.reference_number}</p>
                <p className="font-black uppercase text-sm text-zinc-900 mt-1">{inc.category}</p>
                <p className="text-xs text-zinc-500 mt-1 line-clamp-2">{inc.description}</p>
                <span className="inline-block mt-2 text-[9px] font-black uppercase px-2 py-1 rounded-full bg-green-100 text-green-800">
                  {inc.status}
                </span>
              </Link>
            ))}
          </div>
        )}
      </GuidePanel>

      <GuidePanel title="Resolved crisis alerts" subtitle="Status, place, type, and when. Pins follow the filters.">
        {loading ? (
          <AlertCardSkeletonList count={2} />
        ) : resolvedAlerts.length === 0 ? (
          <p className="text-sm text-zinc-500 font-medium py-6">No resolved alerts on record.</p>
        ) : (
          <div className={portalLayout.splitGridPublic}>
            <div>
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
              <StatusRecordList rows={alertRows} emptyMessage="No resolved alerts match this filter." />
            </div>
            <div className={selectedAlert ? "pointer-events-none opacity-40" : ""}>
              {mounted ? (
                <CrisisHubMap
                  alerts={filteredAlerts}
                  warnings={[]}
                  showWarnings={false}
                  showTouristSpots={false}
                  fitToAlerts
                  heightClass="h-[min(420px,60vh)]"
                />
              ) : (
                <MapSkeleton height="h-[min(420px,60vh)]" />
              )}
            </div>
          </div>
        )}
      </GuidePanel>

      <AlertDetailModal alert={selectedAlert} onClose={() => setSelectedAlert(null)} />

      <div className="flex items-center gap-2 text-zinc-400 text-[10px] font-bold uppercase tracking-widest px-1">
        <History size={14} /> For live emergencies, use Crisis Hub and Group Reports.
      </div>
    </>
  );
}
