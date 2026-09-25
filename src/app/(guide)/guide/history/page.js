"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle, Compass, FileText, History } from "lucide-react";
import { GuidePageHeader } from "@/app/components/guide/GuidePageHeader";
import { GuidePanel } from "@/app/components/guide/GuidePanel";
import { CompletedToursPanel } from "@/app/components/tour/CompletedToursPanel";
import { CrisisAlertListCard } from "@/app/components/crisis/CrisisAlertListCard";
import { PublicCardListPreview } from "@/app/components/shell/PublicCardListPreview";
import { useAuthStore, useCrisisStore } from "@/app/store/crisisStore";
import { useGuideStore } from "@/app/store/guideStore";
import { AlertCardSkeletonList, StatCardSkeletonGrid } from "@/app/components/ui/Skeletons";
import { guideShell, portalLayout, statGrid, iconSize } from "@/lib/designSystem";
import { DashboardStatCard } from "@/app/components/dashboard/DashboardStatCard";

const CLOSED_REPORT_STATUSES = ["Resolved", "Closed", "Rejected"];

export default function GuideHistoryPage() {
  const { user } = useAuthStore();
  const { alerts, fetchAlerts, loading: alertsLoading } = useCrisisStore();
  const { tourGroups, guideIncidents, fetchTourGroups, fetchGuideIncidents, loading: guideLoading } = useGuideStore();
  const [mounted, setMounted] = useState(false);

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

      <GuidePanel title="Resolved crisis alerts" subtitle="Official alerts marked resolved by the tourism office">
        {loading ? (
          <AlertCardSkeletonList count={2} />
        ) : resolvedAlerts.length === 0 ? (
          <p className="text-sm text-zinc-500 font-medium py-6">No resolved alerts on record.</p>
        ) : (
          <PublicCardListPreview
            items={resolvedAlerts}
            modalTitle="Resolved alerts"
            listClassName="space-y-3"
            scrollPaneClassName={portalLayout.listScrollPane}
            renderItem={(alert) => (
              <CrisisAlertListCard alert={alert} resolved timeLabel={new Date(alert.updated_at || alert.created_at).toLocaleString()} />
            )}
          />
        )}
      </GuidePanel>

      <div className="flex items-center gap-2 text-zinc-400 text-[10px] font-bold uppercase tracking-widest px-1">
        <History size={14} /> For live emergencies, use Crisis Hub and Group Reports.
      </div>
    </>
  );
}
