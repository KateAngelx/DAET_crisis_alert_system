"use client";

import React from "react";
import { X, AlertTriangle } from "lucide-react";
import { IncidentReportForm } from "@/app/components/IncidentReportForm";

export function ReportIncidentModal({ open, onClose, onSuccess }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-3xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl custom-scrollbar">
        <div className="sticky top-0 bg-white border-b border-zinc-100 px-6 py-4 flex items-start justify-between gap-4 rounded-t-3xl">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle size={18} className="text-red-600" />
              <h2 className="text-lg font-black uppercase tracking-tight text-zinc-900">Report an Incident</h2>
            </div>
            <p className="text-sm text-zinc-500 font-medium">
              Include location, severity, and a clear description. Tourism office staff will review and update the response status.
            </p>
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
