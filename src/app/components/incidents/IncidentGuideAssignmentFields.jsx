"use client";

import { incidentReportEligibleForGuideAssignment } from "@/lib/incidentGuideEligibility";
import { adminShell } from "@/lib/designSystem";

/**
 * Assign-to-guide controls for admin incident workflow.
 * Renders nothing unless category is Tourist Assistance.
 */
export function IncidentGuideAssignmentFields({ incident, guides, assignedTo, onAssignedToChange, disabled }) {
  if (!incident || !incidentReportEligibleForGuideAssignment(incident)) {
    return null;
  }

  return (
    <section className="rounded-xl border border-purple-100 bg-purple-50/40 p-4 space-y-2">
      <h4 className="text-xs font-black uppercase tracking-widest text-purple-800">Tourism guide assignment</h4>
      <label className="text-[10px] font-black uppercase text-purple-700">Assign to guide</label>
      <p className="text-[11px] text-zinc-600 leading-relaxed">
        For Tourist Assistance reports only — select a tourism guide to dispatch.
      </p>
      <select
        value={assignedTo}
        disabled={disabled}
        onChange={(e) => onAssignedToChange(e.target.value)}
        className={`${adminShell.select} w-full`}
      >
        <option value="">Unassigned</option>
        {(guides || []).map((g) => (
          <option key={g.id} value={g.id}>
            {g.full_name}
          </option>
        ))}
      </select>
    </section>
  );
}
