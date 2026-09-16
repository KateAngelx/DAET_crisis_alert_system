"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, MapPin, Clock, User, Image as ImageIcon } from "lucide-react";
import { Card } from "@/app/components/ui/Card";
import { GuidePageHeader } from "@/app/components/guide/GuidePageHeader";
import { ReportDetailSkeleton } from "@/app/components/ui/Skeletons";
import { ErrorState, EmptyState } from "@/app/components/ui/AsyncState";
import { useAuthStore } from "@/app/store/crisisStore";
import { useGuideStore } from "@/app/store/guideStore";
import { useIncidentStore } from "@/app/store/incidentStore";
import { getStatusColor, getSeverityColor } from "@/lib/constants";

export default function GuideReportDetailPage({ params }) {
  const { id } = React.use(params);
  const { user } = useAuthStore();
  const { getGuideTouristIds } = useGuideStore();
  const { currentIncident, history, fetchIncidentById, loading, error } = useIncidentStore();
  const [accessDenied, setAccessDenied] = useState(false);
  const [checkingAccess, setCheckingAccess] = useState(true);

  useEffect(() => {
    if (!id || !user?.id) return;

    const load = async () => {
      setCheckingAccess(true);
      const incident = await fetchIncidentById(id);
      const touristIds = await getGuideTouristIds(user.id);
      const allowed =
        incident &&
        (incident.assigned_to === user.id || touristIds.includes(incident.reporter_id));
      setAccessDenied(!allowed);
      setCheckingAccess(false);
    };

    load();
  }, [id, user?.id, fetchIncidentById, getGuideTouristIds]);

  if (loading || checkingAccess) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-zinc-100 rounded animate-pulse" />
        <ReportDetailSkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <ErrorState message={error} onRetry={() => fetchIncidentById(id)} title="Could not load report" />
    );
  }

  if (!currentIncident || accessDenied) {
    return (
      <Card className="p-10 text-center">
        <EmptyState
          title="Report not found"
          description="This report may not belong to your tour groups or you may not have access."
        />
        <Link href="/guide/reports" className="text-blue-600 text-xs font-black uppercase mt-4 inline-block">
          Back to Group Reports
        </Link>
      </Card>
    );
  }

  const inc = currentIncident;

  return (
    <>
      <Link href="/guide/reports" className="inline-flex items-center gap-2 text-xs font-black uppercase text-zinc-400 hover:text-blue-600">
        <ArrowLeft size={14} /> Group Reports
      </Link>

      <GuidePageHeader
        title={inc.category}
        description={`${inc.reference_number} · Reported ${new Date(inc.created_at).toLocaleString()}`}
      />

      <div className="flex flex-wrap gap-2">
        <span className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase ${getSeverityColor(inc.severity)}`}>
          {inc.severity}
        </span>
        <span className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase ${getStatusColor(inc.status)}`}>
          {inc.status}
        </span>
      </div>

      <Card className="p-6 border-zinc-100">
        <h2 className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-3">Description</h2>
        <p className="text-sm text-zinc-700 leading-relaxed">{inc.description}</p>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {inc.location && (
          <Card className="p-5 border-zinc-100">
            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-2">Location</p>
            <p className="text-sm font-medium text-zinc-700 flex items-center gap-2">
              <MapPin size={14} className="text-blue-500" /> {inc.location}
            </p>
          </Card>
        )}
        <Card className="p-5 border-zinc-100">
          <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-2">Reported</p>
          <p className="text-sm font-medium text-zinc-700 flex items-center gap-2">
            <Clock size={14} className="text-zinc-400" /> {new Date(inc.created_at).toLocaleString()}
          </p>
        </Card>
      </div>

      {inc.reporter && (
        <Card className="p-5 border-zinc-100">
          <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-2">Reporter</p>
          <p className="text-sm font-bold text-zinc-900 flex items-center gap-2">
            <User size={14} className="text-purple-500" /> {inc.reporter.full_name || "Unknown"}
          </p>
          {inc.reporter.phone && (
            <p className="text-xs text-zinc-500 mt-1">{inc.reporter.phone}</p>
          )}
        </Card>
      )}

      {inc.photo_url && (
        <Card className="p-5 border-zinc-100">
          <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-3 flex items-center gap-2">
            <ImageIcon size={14} /> Photo Evidence
          </p>
          <img src={inc.photo_url} alt="Report evidence" className="rounded-xl max-h-64 object-cover w-full" />
        </Card>
      )}

      {history?.length > 0 && (
        <Card className="p-6 border-zinc-100">
          <h2 className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-4">Status History</h2>
          <div className="space-y-3">
            {history.map((entry) => (
              <div key={entry.id} className="flex items-start gap-3 pb-3 border-b border-zinc-50 last:border-0">
                <div className="flex-1">
                  <p className="text-sm font-bold text-zinc-900">{entry.status}</p>
                  {entry.notes && <p className="text-xs text-zinc-500 mt-1">{entry.notes}</p>}
                </div>
                <p className="text-[10px] text-zinc-400 shrink-0">
                  {new Date(entry.created_at).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        </Card>
      )}
    </>
  );
}
