"use client";

import React, { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FileText, Plus, CheckCircle } from "lucide-react";
import { useAuthStore } from "@/app/store/crisisStore";
import { useIncidentStore } from "@/app/store/incidentStore";
import { ReportIncidentModal } from "@/app/components/ReportIncidentModal";
import { IncidentReportListCard } from "@/app/components/incidents/IncidentReportListCard";
import {
  InfoPageHero,
  PublicPageShell,
  PublicPageContent,
  PublicPanel,
  publicLayout,
} from "@/app/components/InfoPageHero";
import { RoleContextBanner } from "@/app/components/dashboard/RoleContextBanner";
import { ROLE_INTERFACE } from "@/lib/roleInterfaceCopy";
import { AsyncState, EmptyState } from "@/app/components/ui/AsyncState";
import { ReportCardSkeletonList } from "@/app/components/ui/Skeletons";
import { portalShell, portalLayout, statGrid } from "@/lib/designSystem";
import { PublicCategorizedCardList } from "@/app/components/shell/PublicCategorizedCardList";
import { PublicCategorizedCardFilters } from "@/app/components/shell/PublicCategorizedCardFilters";
import { INCIDENT_CATEGORIES, INCIDENT_SEVERITIES } from "@/lib/constants";
import { PublicStatCard } from "@/app/components/dashboard/PublicStatCard";
import { PublicStatCardSkeleton } from "@/app/components/ui/Skeletons";

export default function MyReportsPage() {
  return (
    <Suspense
      fallback={
        <PublicPageShell>
          <PublicPageContent>
            <ReportCardSkeletonList count={3} />
          </PublicPageContent>
        </PublicPageShell>
      }
    >
      <MyReportsContent />
    </Suspense>
  );
}

function MyReportsContent() {
  const { user, isAuthenticated } = useAuthStore();
  const { incidents, fetchIncidents, loading, error } = useIncidentStore();
  const [modalOpen, setModalOpen] = useState(false);
  const [successRef, setSuccessRef] = useState(null);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [severityFilter, setSeverityFilter] = useState("all");
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    if (user?.id) fetchIncidents({ reporterId: user.id });
  }, [user?.id, fetchIncidents]);

  useEffect(() => {
    if (searchParams.get("report") === "1" && isAuthenticated) {
      setModalOpen(true);
      router.replace("/crisis/reports", { scroll: false });
    }
  }, [searchParams, isAuthenticated, router]);

  const handleReportSuccess = (incident) => {
    setSuccessRef(incident.reference_number);
    if (user?.id) fetchIncidents({ reporterId: user.id });
  };

  const openReports = incidents.filter((i) => !["Resolved", "Closed", "Rejected"].includes(i.status));
  const urgentReports = incidents.filter((i) => i.severity === "Critical" || i.severity === "High");

  if (!isAuthenticated) {
    return (
      <PublicPageShell>
        <InfoPageHero
          title="My Reports"
          description="Sign in to submit incident reports and track tourism office response."
        />
        <PublicPageContent>
          <PublicPanel title="Sign in required">
            <p className="text-sm text-zinc-600 font-medium mb-4">
              Your submitted reports and status updates are available after you sign in.
            </p>
            <Link href="/login" className={portalShell.btnPrimary}>
              Sign in
            </Link>
          </PublicPanel>
        </PublicPageContent>
      </PublicPageShell>
    );
  }

  return (
    <>
      <PublicPageShell>
        <InfoPageHero
          title={ROLE_INTERFACE.public.reports.title}
          description={ROLE_INTERFACE.public.reports.description}
        />

        <PublicPageContent>
          <RoleContextBanner helper={ROLE_INTERFACE.public.reports.helper} tone="info" />

          <PublicPanel
            title="Overview & filters"
            subtitle="Counts and category filters"
            action={
              <button type="button" onClick={() => setModalOpen(true)} className={portalShell.btnDanger}>
                <Plus size={16} /> Report an incident
              </button>
            }
          >
            {loading ? (
              <PublicStatCardSkeleton count={3} className={`${statGrid.crisisHub} mb-4`} compact />
            ) : (
              <div className={`${statGrid.crisisHub} mb-4`}>
                <PublicStatCard compact value={incidents.length} label="Total Reports" accent="blue" />
                <PublicStatCard compact value={openReports.length} label="Open Cases" accent="orange" />
                <PublicStatCard compact value={urgentReports.length} label="High / Critical" accent="red" />
              </div>
            )}
            <PublicCategorizedCardFilters
              items={incidents}
              getCategory={(inc) => inc.category}
              getSeverity={(inc) => inc.severity}
              categoryLabel="Report category"
              severityLabel="Severity"
              categoryOptions={INCIDENT_CATEGORIES}
              severityOptions={[...INCIDENT_SEVERITIES].reverse()}
              severityOrder={[...INCIDENT_SEVERITIES].reverse()}
              categoryFilter={categoryFilter}
              severityFilter={severityFilter}
              onCategoryFilterChange={setCategoryFilter}
              onSeverityFilterChange={setSeverityFilter}
            />
          </PublicPanel>

          <PublicPanel
            title="Your incident reports"
            subtitle="Tap a report for details and status history"
            bodyClassName={portalLayout.panelBodyStack}
          >
            {successRef ? (
              <div className="mb-4 p-4 rounded-xl bg-green-50 border border-green-200 flex items-start gap-3">
                <CheckCircle size={20} className="text-green-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-green-800">Report submitted — reference {successRef}</p>
                  <p className="text-xs text-green-700 mt-1">The Daet Municipal Tourism Office will review your report. Status updates appear below.</p>
                </div>
              </div>
            ) : null}

            <AsyncState
              loading={loading}
              error={error}
              isEmpty={!loading && !error && incidents.length === 0}
              onRetry={() => fetchIncidents({ reporterId: user.id })}
              loadingFallback={<ReportCardSkeletonList count={3} />}
              emptyFallback={
                <EmptyState
                  icon={FileText}
                  title="No reports submitted yet"
                  action={
                    <button
                      type="button"
                      onClick={() => setModalOpen(true)}
                      className="text-blue-600 font-black text-xs uppercase hover:underline"
                    >
                      Report an Incident
                    </button>
                  }
                />
              }
            >
              <PublicCategorizedCardList
                items={incidents}
                getCategory={(inc) => inc.category}
                getSeverity={(inc) => inc.severity}
                hideFilters
                categoryFilter={categoryFilter}
                severityFilter={severityFilter}
                severityOrder={[...INCIDENT_SEVERITIES].reverse()}
                listPaneClassName={portalLayout.listScrollPane}
                modalTitle="Your incident reports"
                modalSubtitle={`${incidents.length} total`}
                renderItem={(inc) => <IncidentReportListCard incident={inc} />}
              />
            </AsyncState>
          </PublicPanel>
        </PublicPageContent>
      </PublicPageShell>

      <ReportIncidentModal open={modalOpen} onClose={() => setModalOpen(false)} onSuccess={handleReportSuccess} />
    </>
  );
}
