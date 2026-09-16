"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { FileText, ArrowRight, AlertTriangle, Plus } from "lucide-react";
import { Card } from "@/app/components/ui/Card";
import { GuidePageHeader } from "@/app/components/guide/GuidePageHeader";
import { RoleContextBanner } from "@/app/components/dashboard/RoleContextBanner";
import { ROLE_INTERFACE } from "@/lib/roleInterfaceCopy";
import { DashboardStatCard } from "@/app/components/dashboard/DashboardStatCard";
import { StatCardSkeletonGrid } from "@/app/components/ui/Skeletons";
import { AsyncState, EmptyState } from "@/app/components/ui/AsyncState";
import { useAuthStore } from "@/app/store/crisisStore";
import { useGuideStore } from "@/app/store/guideStore";
import { getStatusColor, getSeverityColor } from "@/lib/constants";
import { GuideDashboardQuickActions } from "@/app/components/guide/GuideDashboardQuickActions";
import { ReportIncidentModal } from "@/app/components/ReportIncidentModal";
import { iconSize, statGrid, portalLayout } from "@/lib/designSystem";
import { GuidePanel } from "@/app/components/guide/GuidePanel";
import { PublicCategorizedCardList } from "@/app/components/shell/PublicCategorizedCardList";
import { INCIDENT_SEVERITIES } from "@/lib/constants";

export default function GuideReportsPage() {
  const { user } = useAuthStore();
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
        <GuidePanel title="All group reports" bodyClassName={portalLayout.panelBodyStack}>
        <PublicCategorizedCardList
          items={guideIncidents}
          getCategory={(inc) => inc.category}
          getSeverity={(inc) => inc.severity}
          categoryLabel="Report category"
          severityOrder={[...INCIDENT_SEVERITIES].reverse()}
          listPaneClassName={portalLayout.listScrollPane}
          modalTitle="Group incident reports"
          modalSubtitle={`${guideIncidents.length} total`}
          listClassName="space-y-3"
          renderItem={(inc) => (
            <Link href={`/guide/reports/${inc.id}`} className="block no-underline">
              <Card className="p-5 border-zinc-100 hover:shadow-md transition-all">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <p className="font-mono text-xs text-blue-600 font-black">{inc.reference_number}</p>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${getSeverityColor(inc.severity)}`}>
                        {inc.severity}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${getStatusColor(inc.status)}`}>
                        {inc.status}
                      </span>
                    </div>
                    <h3 className="font-black text-zinc-900 uppercase text-sm">{inc.category}</h3>
                    <p className="text-sm text-zinc-500 line-clamp-1 mt-1">{inc.description}</p>
                    {inc.reporter && (
                      <p className="text-[10px] font-bold text-zinc-400 uppercase mt-2">
                        Reported by {inc.reporter.full_name}
                        {inc.assigned_to === user?.id ? " · Assigned to you" : ""}
                      </p>
                    )}
                  </div>
                  <ArrowRight size={18} className="text-zinc-400 shrink-0" />
                </div>
              </Card>
            </Link>
          )}
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
