"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, AlertTriangle, Plus } from "lucide-react";
import { GuidePageHeader } from "@/app/components/guide/GuidePageHeader";
import { RoleContextBanner } from "@/app/components/dashboard/RoleContextBanner";
import { ROLE_INTERFACE } from "@/lib/roleInterfaceCopy";
import { DashboardStatCard } from "@/app/components/dashboard/DashboardStatCard";
import { StatCardSkeletonGrid } from "@/app/components/ui/Skeletons";
import { AsyncState, EmptyState } from "@/app/components/ui/AsyncState";
import { useAuthStore } from "@/app/store/crisisStore";
import { useGuideStore } from "@/app/store/guideStore";
import { getStatusColor } from "@/lib/constants";
import { GuideDashboardQuickActions } from "@/app/components/guide/GuideDashboardQuickActions";
import { ReportIncidentModal } from "@/app/components/ReportIncidentModal";
import { iconSize, statGrid, portalLayout } from "@/lib/designSystem";
import { GuidePanel } from "@/app/components/guide/GuidePanel";
import { StatusRecordList } from "@/app/components/shell/StatusRecordList";

export default function GuideReportsPage() {
  const { user } = useAuthStore();
  const router = useRouter();
  const { guideIncidents, fetchGuideIncidents, resetGuideScope, loading, error } = useGuideStore();
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    resetGuideScope();
    fetchGuideIncidents(user.id);
  }, [user?.id, resetGuideScope, fetchGuideIncidents]);

  const openReports = guideIncidents.filter(
    (i) => !["Resolved", "Closed", "Rejected"].includes(i.status)
  );
  const assignedToMe = guideIncidents.filter((i) => i.assigned_to === user?.id);

  return (
    <>
      <GuidePageHeader
        title={ROLE_INTERFACE.guide.reports.title}
        description={ROLE_INTERFACE.guide.reports.description}
        action={
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-2 bg-red-600 text-white px-5 py-2.5 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-red-700 transition-colors"
          >
            <Plus size={16} /> Report incident
          </button>
        }
      />
      <RoleContextBanner helper={ROLE_INTERFACE.guide.reports.helper} tone="info" />

      {loading ? (
        <StatCardSkeletonGrid count={3} className={statGrid.dashboardThree} />
      ) : (
        <div className={statGrid.dashboardThree}>
          <DashboardStatCard compact label="Total Reports" value={guideIncidents.length} icon={<FileText size={iconSize.stat} />} accent="blue" />
          <DashboardStatCard compact label="Open Cases" value={openReports.length} icon={<AlertTriangle size={iconSize.stat} />} accent="orange" />
          <DashboardStatCard compact label="Assigned to You" value={assignedToMe.length} icon={<FileText size={iconSize.stat} />} accent="purple" />
        </div>
      )}

      <AsyncState
        loading={loading}
        error={error}
        isEmpty={!loading && !error && guideIncidents.length === 0}
        onRetry={() => user?.id && fetchGuideIncidents(user.id)}
        emptyFallback={
          <EmptyState
            icon={FileText}
            title="No group reports"
            description="Reports from tourists in your tour groups will appear here."
          />
        }
      >
        <GuidePanel title="All group reports" subtitle="Create a report from the header. View opens the full record." bodyClassName={portalLayout.panelBodyStack}>
          <StatusRecordList
            rows={guideIncidents.map((inc) => ({
              id: inc.id,
              status: inc.status,
              statusClass: getStatusColor(inc.status),
              place: inc.location || inc.reporter?.full_name || inc.reference_number,
              type: `${inc.severity} · ${inc.category}`,
              when: inc.created_at ? new Date(inc.created_at).toLocaleString() : "",
              actions: [
                { label: "View", onClick: () => router.push(`/guide/reports/${inc.id}`) },
              ],
            }))}
          />
        </GuidePanel>
      </AsyncState>

      <GuideDashboardQuickActions showReport={false} />

      <ReportIncidentModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={() => user?.id && fetchGuideIncidents(user.id)}
      />
    </>
  );
}
