"use client";

import React from "react";
import { X, AlertTriangle } from "lucide-react";
import { IncidentReportForm } from "@/app/components/IncidentReportForm";
import { INCIDENT_CATEGORIES } from "@/lib/constants";

export function ReportIncidentModal({
  open,
  onClose,
  onSuccess,
  mode = "incident",
  guideAssistance,
  categories,
}) {
  if (!open) return null;
  const isGuideAssistance = mode === "guide-assistance";
  const modalTitle = isGuideAssistance ? "Request Tourist Guide Assistance" : "Report an Incident";
  const modalDescription = isGuideAssistance
    ? "Tell the tourism office where you need assistance and what kind of help you need."
    : "Include location, severity, and a clear description. Tourism office staff will review and update the response status.";
  const incidentCategories = categories || INCIDENT_CATEGORIES;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-3xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl custom-scrollbar">
        <div className="sticky top-0 bg-white border-b border-zinc-100 px-6 py-4 flex items-start justify-between gap-4 rounded-t-3xl">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle size={18} className={isGuideAssistance ? "text-purple-600" : "text-red-600"} />
              <h2 className="text-lg font-black uppercase tracking-tight text-zinc-900">{modalTitle}</h2>
            </div>
            <p className="text-sm font-medium text-zinc-500">{modalDescription}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-zinc-100 rounded-full transition-colors shrink-0"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>
        <div className="p-6">
          <IncidentReportForm
            key={isGuideAssistance ? "guide-assistance" : "incident"}
            categoryOverride={isGuideAssistance ? "Tourist Assistance" : undefined}
            categories={incidentCategories}
            introductoryInfo={isGuideAssistance ? guideAssistance?.introductoryInformation : undefined}
            availabilityMessage={isGuideAssistance ? guideAssistance?.availabilityMessage : undefined}
            onSuccess={(incident) => {
              onSuccess?.(incident);
              onClose();
            }}
            onCancel={onClose}
            compact
          />
        </div>
      </div>
    </div>
  );
}
