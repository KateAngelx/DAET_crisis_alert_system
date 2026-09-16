"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, FileText, Plus } from "lucide-react";
import { Card } from "@/app/components/ui/Card";
import { ReportIncidentModal } from "@/app/components/ReportIncidentModal";
import { useAuthStore } from "@/app/store/crisisStore";
import { useGuideStore } from "@/app/store/guideStore";

const CLOSED_STATUSES = ["Resolved", "Closed", "Rejected"];

export function GuideReportActions({ className = "", showViewLink = true, compact = false }) {
  const { user } = useAuthStore();
  const { guideIncidents, fetchGuideIncidents } = useGuideStore();
  const [modalOpen, setModalOpen] = useState(false);
  const [successRef, setSuccessRef] = useState(null);

  useEffect(() => {
    if (user?.id) fetchGuideIncidents(user.id);
  }, [user?.id, fetchGuideIncidents]);

  const openCount = guideIncidents.filter((i) => !CLOSED_STATUSES.includes(i.status)).length;

  const handleSuccess = (incident) => {
    setSuccessRef(incident?.reference_number || null);
    if (user?.id) fetchGuideIncidents(user.id);
  };

  const padding = compact ? "p-3" : "p-4";
  const descClass = compact ? "text-xs line-clamp-2" : "text-sm";
  const btnClass = compact
    ? "px-3 py-2 text-[9px] gap-1.5"
    : "px-4 py-2.5 text-[10px] gap-2";

  return (
    <>
      <Card className={`${padding} border-orange-100 bg-orange-50/40 h-full flex flex-col justify-center ${className}`}>
        <div className={`flex ${compact ? "flex-col gap-2.5" : "flex-col sm:flex-row sm:items-center"} justify-between gap-3`}>
          <div className="flex items-start gap-2.5 min-w-0">
            <div className={`${compact ? "p-1.5" : "p-2"} bg-orange-100 rounded-lg shrink-0`}>
              <AlertTriangle size={compact ? 16 : 18} className="text-orange-600" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase text-orange-700 tracking-widest">Report an Incident</p>
              <p className={`${descClass} text-zinc-600 font-medium mt-0.5`}>
                Submit a field or group report for tourism office review.
                {openCount > 0 && !compact ? ` ${openCount} open case${openCount !== 1 ? "s" : ""}.` : ""}
              </p>
              {successRef && (
                <p className="text-[10px] font-bold text-green-700 mt-1 truncate">
                  Submitted — {successRef}
                </p>
              )}
            </div>
          </div>
          <div className={`flex ${compact ? "flex-col w-full" : "flex-wrap"} items-stretch sm:items-center gap-2 shrink-0`}>
            {showViewLink && (
              <Link
                href="/guide/reports"
                className={`inline-flex items-center justify-center bg-white border border-orange-200 text-orange-700 rounded-xl font-black uppercase tracking-widest hover:bg-orange-50 transition-colors ${btnClass}`}
              >
                <FileText size={compact ? 12 : 14} />
                View reports
              </Link>
            )}
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className={`inline-flex items-center justify-center bg-red-600 text-white rounded-xl font-black uppercase tracking-widest hover:bg-red-700 transition-colors ${btnClass}`}
            >
              <Plus size={compact ? 12 : 14} />
              Report incident
            </button>
          </div>
        </div>
      </Card>

      <ReportIncidentModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={handleSuccess}
      />
    </>
  );
}
