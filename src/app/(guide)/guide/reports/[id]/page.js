"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, MapPin, Clock, User, Image as ImageIcon } from "lucide-react";
import { Card } from "@/app/components/ui/Card";
import { GuidePageHeader } from "@/app/components/guide/GuidePageHeader";
import { ReportDetailSkeleton } from "@/app/components/ui/Skeletons";
import { ErrorState, EmptyState } from "@/app/components/ui/AsyncState";
import { useAuthStore } from "@/app/store/crisisStore";
import { fetchWithFreshSession } from "@/lib/authSession";
import { getStatusColor, getSeverityColor } from "@/lib/constants";
import { ReportGeoLink } from "@/app/components/incidents/ReportGeoLink";
import { IncidentChat } from "@/app/components/IncidentChat";
import Image from "next/image";
import { scrollToHashOnMount } from "@/lib/scrollToHash";

export default function GuideReportDetailPage({ params }) {
  const { id } = React.use(params);
  const { user } = useAuthStore();
  const [currentIncident, setCurrentIncident] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [accessDenied, setAccessDenied] = useState(false);

  useEffect(() => {
    if (!id || !user?.id) return;

    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError("");
      setAccessDenied(false);
      try {
        const response = await fetchWithFreshSession(`/api/guide/incidents/${id}`, { cache: "no-store" });
        const result = await response.json().catch(() => ({}));
        if (cancelled) return;
        if (response.status === 403) {
          setAccessDenied(true);
          setCurrentIncident(null);
          setHistory([]);
          return;
        }
        if (!response.ok) throw new Error(result.error || "Could not load report.");
        setCurrentIncident(result.incident);
        setHistory(result.history || []);
      } catch (loadError) {
        if (!cancelled) setError(loadError.message || "Could not load report.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [id, user?.id]);

  useEffect(() => {
    if (loading || accessDenied || !currentIncident) return;
    scrollToHashOnMount(typeof window !== "undefined" ? window.location.hash : "");
  }, [loading, accessDenied, currentIncident]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-zinc-100 rounded animate-pulse" />
        <ReportDetailSkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <ErrorState
        message={error}
        onRetry={() => {
          setLoading(true);
          fetchWithFreshSession(`/api/guide/incidents/${id}`, { cache: "no-store" })
            .then((response) => response.json().then((result) => ({ response, result })))
            .then(({ response, result }) => {
              if (!response.ok) throw new Error(result.error || "Could not load report.");
              setCurrentIncident(result.incident);
              setHistory(result.history || []);
              setError("");
            })
            .catch((loadError) => setError(loadError.message || "Could not load report."))
            .finally(() => setLoading(false));
        }}
        title="Could not load report"
      />
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
          Back to Reports
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
            <ReportGeoLink record={inc} className="mt-2" />
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
          <Image src={inc.photo_url} alt="Report evidence" width={800} height={512} sizes="(max-width: 768px) 100vw, 640px" className="rounded-xl max-h-64 object-cover w-full h-auto" />
        </Card>
      )}

      <IncidentChat incidentId={inc.id} />

      {history?.length > 0 && (
        <Card className="p-6 border-zinc-100">
          <h2 className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-4">Status History</h2>
          <div className="space-y-3">
            {history.map((entry) => (
              <div key={entry.id} className="flex items-start gap-3 pb-3 border-b border-zinc-50 last:border-0">
                <div className="flex-1">
                  <p className="text-sm font-bold text-zinc-900">
                    {entry.old_status ? `${entry.old_status} → ${entry.new_status}` : entry.new_status || entry.action}
                  </p>
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
