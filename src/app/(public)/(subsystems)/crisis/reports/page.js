"use client";

import React, { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FileText, Plus, CheckCircle } from "lucide-react";
import { Card } from "@/app/components/ui/Card";
import { useAuthStore } from "@/app/store/crisisStore";
import { useIncidentStore } from "@/app/store/incidentStore";
import { ReportIncidentModal } from "@/app/components/ReportIncidentModal";
import { getStatusColor, getSeverityColor } from "@/lib/constants";
import { InfoPageHero, PublicPageShell, PublicPageContent, publicLayout } from "@/app/components/InfoPageHero";
import { AsyncState, EmptyState } from "@/app/components/ui/AsyncState";
import { ReportCardSkeletonList } from "@/app/components/ui/Skeletons";

export default function MyReportsPage() {
  return (
    <Suspense fallback={
      <PublicPageShell>
        <PublicPageContent>
          <ReportCardSkeletonList count={3} />
        </PublicPageContent>
      </PublicPageShell>
    }>
      <MyReportsContent />
    </Suspense>
  );
}

function MyReportsContent() {
  const { user, isAuthenticated } = useAuthStore();
  const { incidents, fetchIncidents, loading, error } = useIncidentStore();
  const [modalOpen, setModalOpen] = useState(false);
  const [successRef, setSuccessRef] = useState(null);
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

  if (!isAuthenticated) {
    return (
      <PublicPageShell>
        <PublicPageContent className="text-center">
          <p className="text-zinc-500 mb-4 text-sm font-medium">Sign in to view your reports or submit an incident.</p>
          <Link href="/login" className="text-blue-600 font-bold uppercase text-xs">Sign In</Link>
        </PublicPageContent>
      </PublicPageShell>
    );
  }

  return (
    <>
      <PublicPageShell>
        <InfoPageHero
          title="My Reports"
          description="View submitted incidents and track LGU response status."
        />

        <PublicPageContent>
          <div className={publicLayout.stack}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-end gap-4">
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="flex items-center justify-center gap-2 bg-red-600 text-white px-6 py-3 rounded-full font-black text-xs uppercase hover:bg-red-700 transition-colors shrink-0"
            >
              <Plus size={16} /> Report an Incident
            </button>
          </div>

        {successRef && (
          <Card className="p-4 bg-green-50 border-green-200 flex items-start gap-3">
            <CheckCircle size={20} className="text-green-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-green-800">Report submitted — reference {successRef}</p>
              <p className="text-xs text-green-700 mt-1">Daet LGU will review your report. Status updates appear below.</p>
            </div>
          </Card>
        )}

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
          <div className={publicLayout.stackTight}>
            {incidents.map((inc) => (
              <Link key={inc.id} href={`/crisis/reports/${inc.id}`}>
                <Card className="p-5 hover:shadow-md transition-all cursor-pointer">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <p className="font-mono text-xs text-blue-600 font-black">{inc.reference_number}</p>
                      <h3 className="font-bold text-gray-900 mt-1">{inc.category}</h3>
                      <p className="text-sm text-gray-500 line-clamp-1">{inc.location}</p>
                      <p className="text-[10px] text-gray-400 mt-1">{new Date(inc.created_at).toLocaleString()}</p>
                    </div>
                    <div className="flex gap-2">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${getSeverityColor(inc.severity)}`}>
                        {inc.severity}
                      </span>
                      <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${getStatusColor(inc.status)}`}>
                        {inc.status}
                      </span>
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </AsyncState>
          </div>
        </PublicPageContent>
      </PublicPageShell>

      <ReportIncidentModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={handleReportSuccess}
      />
    </>
  );
}
