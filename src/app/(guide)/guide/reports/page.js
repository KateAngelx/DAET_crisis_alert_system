"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { FileText, ArrowRight, AlertTriangle } from "lucide-react";
import { Card } from "@/app/components/ui/Card";
import { DashboardPageHeader } from "@/app/components/dashboard/DashboardPageHeader";
import { RoleContextBanner } from "@/app/components/dashboard/RoleContextBanner";
import { ROLE_INTERFACE } from "@/lib/roleInterfaceCopy";
import { DashboardStatCard } from "@/app/components/dashboard/DashboardStatCard";
import { StatCardSkeletonGrid } from "@/app/components/ui/Skeletons";
import { AsyncState, EmptyState } from "@/app/components/ui/AsyncState";
import { useAuthStore } from "@/app/store/crisisStore";
import { useGuideStore } from "@/app/store/guideStore";
import { getStatusColor, getSeverityColor } from "@/lib/constants";
import { iconSize, statGrid } from "@/lib/designSystem";

export default function GuideReportsPage() {
  const { user } = useAuthStore();
  const { guideIncidents, fetchGuideIncidents, resetGuideScope, loading, error } = useGuideStore();

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
    <div className="space-y-6 text-left">
      <DashboardPageHeader
        title={ROLE_INTERFACE.guide.reports.title}
        description={ROLE_INTERFACE.guide.reports.description}
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
        <div className="space-y-3">
          {guideIncidents.map((inc) => (
            <Link key={inc.id} href={`/guide/reports/${inc.id}`} className="block no-underline">
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
          ))}
        </div>
      </AsyncState>
    </div>
  );
}
