"use client";

import { Clock, Eye, MapPin, User } from "lucide-react";
import { getSeverityColor } from "@/lib/constants";
import { incidentStatusBadgeClass, normalizeIncidentStatusLabel } from "@/lib/incidentStatusUtils";
import { getIncidentQuickActions, isIncidentClosed } from "@/lib/incidentAdminActions";
import { adminShell, iconSize } from "@/lib/designSystem";

function actionButtonClass(tone) {
  if (tone === "primary") return adminShell.btnPrimary;
  if (tone === "danger") return `${adminShell.btnGhost} text-red-600 border-red-100 hover:bg-red-50`;
  if (tone === "success") return adminShell.btnSuccess;
  return adminShell.btnGhost;
}

export function IncidentReportAdminCard({ incident, onManage, onQuickAction, actionBusyId }) {
  const actions = getIncidentQuickActions(incident.status);
  const closed = isIncidentClosed(incident.status);

  return (
    <div
      className={`rounded-xl border p-4 sm:p-5 transition-colors ${
        closed ? "border-zinc-200 bg-zinc-50/80 opacity-90" : "border-zinc-200 bg-white hover:border-zinc-300"
      }`}
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="font-mono text-xs text-blue-600 font-black">{incident.reference_number}</span>
              <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${getSeverityColor(incident.severity)}`}>
                {incident.severity}
              </span>
              <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase ring-1 ring-inset ${incidentStatusBadgeClass(incident.status)}`}>
                Status: {normalizeIncidentStatusLabel(incident.status)}
              </span>
            </div>
            <h3 className="font-black text-zinc-900 uppercase text-sm tracking-tight">{incident.category}</h3>
            <p className="text-sm text-zinc-500 line-clamp-2 mt-1">{incident.description}</p>
            <div className="flex flex-wrap gap-3 mt-2 text-xs text-zinc-400 font-medium">
              <span className="flex items-center gap-1">
                <MapPin size={iconSize.inlineSm} className="text-blue-500" /> {incident.location}
              </span>
              <span className="flex items-center gap-1">
                <Clock size={iconSize.inlineSm} /> {new Date(incident.created_at).toLocaleString()}
              </span>
              {incident.reporter ? (
                <span className="flex items-center gap-1">
                  <User size={iconSize.inlineSm} /> {incident.reporter.full_name}
                </span>
              ) : null}
              {incident.assignee?.full_name ? (
                <span className="text-purple-600 font-bold">Guide: {incident.assignee.full_name}</span>
              ) : null}
            </div>
          </div>
          <button type="button" onClick={() => onManage(incident)} className={`${adminShell.btnGhost} shrink-0`}>
            <Eye size={iconSize.inline} /> Details
          </button>
        </div>

        {actions.length > 0 ? (
          <div className="flex flex-wrap gap-2 pt-3 border-t border-zinc-100">
            {actions.map((action) => (
              <button
                key={action.id}
                type="button"
                disabled={actionBusyId === incident.id}
                onClick={() => onQuickAction(incident, action)}
                className={`${actionButtonClass(action.tone)} disabled:opacity-50 text-[10px]`}
              >
                {actionBusyId === incident.id ? "Saving…" : action.label}
              </button>
            ))}
          </div>
        ) : (
          <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 pt-2 border-t border-zinc-100">
            No further actions — see archive for closed reports.
          </p>
        )}
      </div>
    </div>
  );
}
