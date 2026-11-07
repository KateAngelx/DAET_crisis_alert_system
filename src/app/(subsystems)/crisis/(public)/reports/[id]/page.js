"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, MapPin, Clock, User, Image as ImageIcon } from "lucide-react";
import { useAuthStore } from "@/app/store/crisisStore";
import { useIncidentStore } from "@/app/store/incidentStore";
import { getStatusColor, getSeverityColor } from "@/lib/constants";
import {
  InfoPageHero,
  PublicPageShell,
  PublicPageContent,
  PublicPanel,
  publicLayout,
} from "@/app/components/InfoPageHero";
import { ReportDetailSkeleton } from "@/app/components/ui/Skeletons";
import { ErrorState, EmptyState } from "@/app/components/ui/AsyncState";

export default function ReportDetailPage({ params }) {
  const { id } = React.use(params);
  const { user, isAuthenticated } = useAuthStore();
  const { currentIncident, history, fetchIncidentById, loading, error } = useIncidentStore();

  useEffect(() => {
    if (id) fetchIncidentById(id);
  }, [id, fetchIncidentById]);

  if (!isAuthenticated) {
    return (
      <PublicPageShell>
        <InfoPageHero title="Report details" description="Sign in to view this report." />
        <PublicPageContent>
          <Link href="/login" className="text-blue-600 font-bold uppercase text-xs">
            Sign in
          </Link>
        </PublicPageContent>
      </PublicPageShell>
    );
  }

  if (loading) {
    return (
      <PublicPageShell>
        <InfoPageHero title="Report Details" description="Loading incident report..." />
        <PublicPageContent>
          <ReportDetailSkeleton />
        </PublicPageContent>
      </PublicPageShell>
    );
  }

  if (error) {
    return (
      <PublicPageShell>
        <PublicPageContent>
          <ErrorState message={error} onRetry={() => fetchIncidentById(id)} title="Could not load report" />
        </PublicPageContent>
      </PublicPageShell>
    );
  }

  if (!currentIncident) {
    return (
      <PublicPageShell>
        <PublicPageContent>
          <EmptyState title="Report not found" description="This report may have been removed or you may not have access." />
        </PublicPageContent>
      </PublicPageShell>
    );
  }

  const inc = currentIncident;
  const isOwner = inc.reporter_id === user?.id;

  if (!isOwner && user?.role !== "admin" && user?.role !== "guide") {
    return (
      <PublicPageShell>
        <PublicPageContent className="text-center">
          <p className="text-red-500 font-bold">You do not have access to this report.</p>
        </PublicPageContent>
      </PublicPageShell>
    );
  }

  return (
    <PublicPageShell>
      <InfoPageHero
        title={inc.category}
        description={`${inc.reference_number} · Reported ${new Date(inc.created_at).toLocaleString()}`}
      />

      <PublicPageContent>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/crisis/reports"
            className="inline-flex items-center gap-2 text-xs font-black uppercase text-zinc-400 hover:text-blue-600"
          >
            <ArrowLeft size={14} /> My Reports
          </Link>
          <div className="flex gap-2">
            <span className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase ${getSeverityColor(inc.severity)}`}>
              {inc.severity}
            </span>
            <span className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase ${getStatusColor(inc.status)}`}>
              {inc.status}
            </span>
          </div>
        </div>

        <div className={publicLayout.stack}>
          <PublicPanel title="Description">
            <p className="text-zinc-700 leading-relaxed text-sm font-medium">{inc.description}</p>
            <div className="flex flex-wrap gap-4 text-sm text-zinc-500 mt-4 pt-4 border-t border-zinc-100">
              <span className="flex items-center gap-1">
                <MapPin size={14} /> {inc.location}
              </span>
              <span className="flex items-center gap-1">
                <Clock size={14} /> {new Date(inc.created_at).toLocaleString()}
              </span>
              {inc.reporter ? (
                <span className="flex items-center gap-1">
                  <User size={14} /> {inc.reporter.full_name}
                </span>
              ) : null}
            </div>
          </PublicPanel>

          {inc.attachments?.length > 0 ? (
            <PublicPanel title="Evidence" subtitle="Photos and files you submitted">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {inc.attachments.map((att) => (
                  <a
                    key={att.id}
                    href={att.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block rounded-xl overflow-hidden border border-zinc-200 hover:border-zinc-300 transition-colors"
                  >
                    {att.file_type?.startsWith("image/") ? (
                      <img src={att.file_url} alt={att.file_name} className="w-full h-32 object-cover" />
                    ) : (
                      <div className="p-4 text-center text-xs font-bold text-zinc-500">{att.file_name}</div>
                    )}
                  </a>
                ))}
              </div>
            </PublicPanel>
          ) : null}

          {inc.response_actions ? (
            <PublicPanel title="Response actions" bodyClassName="bg-green-50/40">
              <p className="text-sm text-green-800 font-medium">{inc.response_actions}</p>
            </PublicPanel>
          ) : null}

          {history.length > 0 ? (
            <PublicPanel title="Status history">
              <div className={publicLayout.stackTight}>
                {history.map((h) => (
                  <div key={h.id} className="flex items-start gap-3 text-sm">
                    <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                    <div>
                      <p className="font-bold text-zinc-900">
                        {h.old_status ? `${h.old_status} → ${h.new_status}` : h.new_status || h.action}
                      </p>
                      {h.notes ? <p className="text-zinc-500 text-xs mt-0.5">{h.notes}</p> : null}
                      <p className="text-[10px] text-zinc-400 mt-0.5">{new Date(h.created_at).toLocaleString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            </PublicPanel>
          ) : null}
        </div>
      </PublicPageContent>
    </PublicPageShell>
  );
}
