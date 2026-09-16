"use client";

import Link from "next/link";
import { ArrowRight, ClipboardList, Loader2 } from "lucide-react";
import { AdminPanel } from "@/app/components/admin/AdminPanel";
import { adminShell, iconSize, portalLayout } from "@/lib/designSystem";
import { formatIncidentAuditAction } from "@/lib/incidentAuditUtils";
import { incidentStatusBadgeClass, normalizeIncidentStatusLabel } from "@/lib/incidentStatusUtils";

export function IncidentReportsAuditLog({ entries, loading, onRefresh }) {
  return (
    <AdminPanel
      title="Audit log"
      subtitle="Recent approvals, rejections, and status changes"
      action={
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/admin/activity"
            className={`${adminShell.btnGhost} no-underline text-[10px] !py-1.5 !px-2.5`}
          >
            Full activity log <ArrowRight size={iconSize.inlineSm} />
          </Link>
          {onRefresh ? (
            <button type="button" onClick={onRefresh} className={adminShell.btnGhost} disabled={loading}>
              {loading ? <Loader2 size={iconSize.inline} className="animate-spin" /> : null}
              Refresh
            </button>
          ) : null}
        </div>
      }
      bodyClassName={portalLayout.panelBodyStack}
    >
      {loading && entries.length === 0 ? (
        <p className="text-xs text-zinc-500 font-medium py-6 text-center">Loading audit entries…</p>
      ) : entries.length === 0 ? (
        <p className="text-xs text-zinc-500 font-medium py-6 text-center flex items-center justify-center gap-2">
          <ClipboardList size={iconSize.inline} className="text-zinc-400" />
          No audit entries yet. Approve or update reports to see activity here.
        </p>
      ) : (
        <div className={`${portalLayout.listScrollPaneAdmin} overflow-x-auto`}>
          <table className="w-full border-collapse text-xs min-w-[640px]">
            <thead>
              <tr className="bg-zinc-50 text-zinc-500 text-[9px] uppercase tracking-widest font-black">
                <th className="px-4 py-3 text-left">When</th>
                <th className="px-4 py-3 text-left">Reference</th>
                <th className="px-4 py-3 text-left">Action</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">By</th>
                <th className="px-4 py-3 text-left">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {entries.map((row) => {
                const ref = row.incident_reports?.reference_number || "—";
                const status = row.new_status ? normalizeIncidentStatusLabel(row.new_status) : "—";
                return (
                  <tr key={row.id} className="hover:bg-zinc-50/80">
                    <td className="px-4 py-3 text-zinc-500 whitespace-nowrap">
                      {new Date(row.created_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 font-mono font-black text-blue-600">{ref}</td>
                    <td className="px-4 py-3 font-black uppercase text-zinc-800">
                      {formatIncidentAuditAction(row.action, row.new_status)}
                    </td>
                    <td className="px-4 py-3">
                      {row.new_status ? (
                        <span
                          className={`text-[8px] font-black uppercase px-2 py-1 rounded-full ${incidentStatusBadgeClass(row.new_status)}`}
                        >
                          {status}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-3 text-zinc-600 font-medium">
                      {row.changer?.full_name || (row.action === "created" ? "Reporter" : "System")}
                    </td>
                    <td className="px-4 py-3 text-zinc-500 max-w-[200px] truncate" title={row.notes || ""}>
                      {row.notes || "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </AdminPanel>
  );
}
