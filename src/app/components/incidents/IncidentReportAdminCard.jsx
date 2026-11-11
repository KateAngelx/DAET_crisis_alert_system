"use client";

import { ArrowRight, Eye } from "lucide-react";
import { getSeverityColor } from "@/lib/constants";
import { incidentReportEligibleForGuideAssignment } from "@/lib/incidentGuideEligibility";
import { incidentStatusBadgeClass, normalizeIncidentStatusLabel } from "@/lib/incidentStatusUtils";
import { isIncidentClosed } from "@/lib/incidentAdminActions";
import { iconSize } from "@/lib/designSystem";

export function IncidentReportAdminCard({ incident, onManage, mobile = false }) {
  const closed = isIncidentClosed(incident.status);
  const showGuide = incidentReportEligibleForGuideAssignment(incident);

  if (mobile) {
    return (
      <article className={`min-w-0 rounded-xl border border-zinc-200 p-3 ${closed ? "bg-zinc-50/70" : "bg-white"}`}>
        <div className="flex min-w-0 items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="break-all font-mono text-[11px] font-black text-blue-700">
              {incident.reference_number || "—"}
            </p>
            <p className="mt-1 break-words text-sm font-bold text-zinc-900">
              {incident.category || "Uncategorized"}
            </p>
          </div>
          <span className={`shrink-0 rounded-full px-2 py-1 text-[9px] font-black uppercase tracking-wide ring-1 ring-inset ${incidentStatusBadgeClass(incident.status)}`}>
            {normalizeIncidentStatusLabel(incident.status) || "Unknown"}
          </span>
        </div>
        <p className="mt-2 line-clamp-3 break-words text-xs leading-relaxed text-zinc-600">
          {incident.description || "No description provided."}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] font-semibold text-zinc-500">
          <span className={`rounded px-2 py-1 font-black uppercase tracking-wide ${getSeverityColor(incident.severity)}`}>
            {incident.severity || "Unknown"}
          </span>
          <span className="break-words">{incident.location || "Location not provided"}</span>
        </div>
        {showGuide ? (
          <p className="mt-2 text-[10px] font-semibold text-purple-700">
            Guide: {incident.assignee?.full_name || "Not assigned"}
          </p>
        ) : null}
        <div className="mt-3 flex items-center justify-between gap-3 border-t border-zinc-100 pt-2">
          <span className="min-w-0 truncate text-[10px] text-zinc-500">
            {incident.reporter?.full_name || "Reporter unavailable"}
            {incident.created_at ? ` · ${new Date(incident.created_at).toLocaleDateString()}` : ""}
          </span>
          <button
            type="button"
            onClick={() => onManage(incident)}
            className="inline-flex min-h-9 shrink-0 items-center gap-1 rounded-lg px-2 text-[10px] font-black uppercase tracking-wide text-blue-600 hover:bg-blue-50"
            aria-label={`View report ${incident.reference_number || ""}`}
          >
            View more <Eye size={14} /> <ArrowRight size={14} />
          </button>
        </div>
      </article>
    );
  }

  return (
    <tr className={`align-top transition-colors ${closed ? "bg-zinc-50/70" : "hover:bg-zinc-50/70"}`}>
      <td className="whitespace-nowrap px-3 py-3">
        <span className="font-mono text-[11px] font-black text-blue-700">
          {incident.reference_number || "—"}
        </span>
      </td>
      <td className="min-w-[220px] px-3 py-3">
        <p className="text-xs font-bold text-zinc-900">{incident.category || "Uncategorized"}</p>
        <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-zinc-500">
          {incident.description || "No description provided."}
        </p>
        {showGuide ? (
          <p className="mt-1.5 text-[10px] font-semibold text-purple-700">
            Guide: {incident.assignee?.full_name || "Not assigned"}
          </p>
        ) : null}
      </td>
      <td className="whitespace-nowrap px-3 py-3">
        <span className={`inline-flex rounded px-2 py-1 text-[9px] font-black uppercase tracking-wide ${getSeverityColor(incident.severity)}`}>
          {incident.severity || "Unknown"}
        </span>
      </td>
      <td className="whitespace-nowrap px-3 py-3">
        <span className={`inline-flex rounded-full px-2 py-1 text-[9px] font-black uppercase tracking-wide ring-1 ring-inset ${incidentStatusBadgeClass(incident.status)}`}>
          {normalizeIncidentStatusLabel(incident.status) || "Unknown"}
        </span>
      </td>
      <td className="max-w-[180px] px-3 py-3 text-[11px] leading-relaxed text-zinc-700">
        <span className="line-clamp-2 break-words">{incident.location || "Not provided"}</span>
      </td>
      <td className="max-w-[150px] px-3 py-3 text-[11px] font-medium text-zinc-700">
        <span className="line-clamp-2 break-words">{incident.reporter?.full_name || "Not available"}</span>
      </td>
      <td className="whitespace-nowrap px-3 py-3 text-[11px] text-zinc-600">
        {incident.created_at ? new Date(incident.created_at).toLocaleString() : "Not available"}
      </td>
      <td className="min-w-[170px] px-3 py-3">
        <button
          type="button"
          onClick={() => onManage(incident)}
          className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wide text-blue-600 hover:text-blue-800"
          aria-label={`View report ${incident.reference_number || ""}`}
        >
          View <Eye size={iconSize.inlineSm} /> <ArrowRight size={iconSize.inlineSm} />
        </button>
      </td>
    </tr>
  );
}
