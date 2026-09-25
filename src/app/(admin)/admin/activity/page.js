"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Activity, ClipboardList, Eye, Radio, FileWarning } from "lucide-react";
import { DashboardPageHeader } from "@/app/components/dashboard/DashboardPageHeader";
import { DashboardStatCard } from "@/app/components/dashboard/DashboardStatCard";
import { AdminFilterBar } from "@/app/components/admin/AdminFilterBar";
import { AdminPanel } from "@/app/components/admin/AdminPanel";
import { AdminDashboardKpiSection } from "@/app/components/admin/AdminDashboardKpiSection";
import { AdminActivityDetailModal } from "@/app/components/admin/AdminActivityDetailModal";
import { RoleContextBanner } from "@/app/components/dashboard/RoleContextBanner";
import { AdminActivityTableSkeleton, StatCardSkeletonGrid } from "@/app/components/ui/Skeletons";
import { adminShell, iconSize, portalLayout, statGrid } from "@/lib/designSystem";
import { mergeAdminActivityFeed, filterActivityFeed } from "@/lib/adminActivityFeed";
import { supabase } from "@/lib/supabaseClient";
import { useCrisisStore } from "@/app/store/crisisStore";

const PER_PAGE = 20;

export default function AdminActivityLogPage() {
  const { alerts, fetchAlerts, loading: alertsLoading } = useCrisisStore();
  const [incidentHistory, setIncidentHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState("All");
  const [page, setPage] = useState(1);
  const [selectedEntry, setSelectedEntry] = useState(null);

  const loadIncidentHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const { data, error } = await supabase
        .from("incident_history")
        .select(`
          id,
          incident_id,
          action,
          old_status,
          new_status,
          notes,
          created_at,
          changer:profiles!incident_history_changed_by_fkey(full_name, email),
          incident_reports(
            id,
            reference_number,
            category,
            description,
            location,
            severity,
            status,
            created_at,
            reporter:profiles!incident_reports_reporter_id_fkey(full_name)
          )
        `)
        .order("created_at", { ascending: false })
        .limit(120);

      if (error) throw error;
      setIncidentHistory(data || []);
    } catch {
      setIncidentHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAlerts();
    loadIncidentHistory();
  }, [fetchAlerts, loadIncidentHistory]);

  const feed = useMemo(
    () => mergeAdminActivityFeed({ incidentHistory, alerts }),
    [incidentHistory, alerts]
  );

  const filtered = useMemo(
    () => filterActivityFeed(feed, { search, source: sourceFilter }),
    [feed, search, sourceFilter]
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const stats = useMemo(() => {
    const incidentCount = feed.filter((f) => f.source === "incident").length;
    const alertCount = feed.filter((f) => f.source === "crisis_alert").length;
    const last24 = feed.filter(
      (f) => Date.now() - new Date(f.at).getTime() < 24 * 60 * 60 * 1000
    ).length;
    return { total: feed.length, incidentCount, alertCount, last24 };
  }, [feed]);

  const loading = historyLoading || alertsLoading;

  useEffect(() => {
    if (loading) return;
  }, [loading, feed.length, filtered.length, incidentHistory.length, alerts.length]);

  useEffect(() => {
    setPage(1);
  }, [search, sourceFilter]);

  return (
    <>
      <DashboardPageHeader
        title="Activity log"
        description="Unified audit trail for incident approvals, status changes, and crisis alert broadcasts."
        action={
          <button
            type="button"
            onClick={() => {
              fetchAlerts();
              loadIncidentHistory();
            }}
            className={adminShell.btnGhost}
            disabled={loading}
          >
            Refresh
          </button>
        }
      />

      <RoleContextBanner
        helper="Select any row and open Details for the full record, status change, and notes."
        tone="info"
      />

      <AdminDashboardKpiSection pageId="activity-log">
        {loading ? (
          <StatCardSkeletonGrid count={4} className={statGrid.dashboard} />
        ) : (
          <div className={statGrid.dashboard}>
            <DashboardStatCard
              compact
              label="Total events"
              value={stats.total}
              icon={<ClipboardList size={iconSize.stat} />}
              accent="blue"
            />
            <DashboardStatCard
              compact
              label="Incident actions"
              value={stats.incidentCount}
              icon={<FileWarning size={iconSize.stat} />}
              accent="orange"
            />
            <DashboardStatCard
              compact
              label="Alert events"
              value={stats.alertCount}
              icon={<Radio size={iconSize.stat} />}
              accent="red"
            />
            <DashboardStatCard
              compact
              label="Last 24 hours"
              value={stats.last24}
              icon={<Activity size={iconSize.stat} />}
              accent="green"
            />
          </div>
        )}
      </AdminDashboardKpiSection>

      <AdminFilterBar
        compact
        title="Filter activity"
        searchPlaceholder="Search reference, action, actor, notes..."
        searchValue={search}
        onSearchChange={(e) => setSearch(e.target.value)}
      >
        <select
          className={`${adminShell.select} !py-2 !text-xs min-w-[8rem]`}
          value={sourceFilter}
          onChange={(e) => setSourceFilter(e.target.value)}
        >
          <option value="All">All sources</option>
          <option value="incident">Incident reports</option>
          <option value="crisis_alert">Crisis alerts</option>
        </select>
      </AdminFilterBar>

      <AdminPanel
        title="Recent activity"
        subtitle={`${filtered.length} events · page ${page} of ${totalPages}`}
        bodyClassName={portalLayout.panelBodyStack}
      >
        {loading ? (
          <AdminActivityTableSkeleton rows={8} />
        ) : paginated.length === 0 ? (
          <p className="text-xs text-zinc-500 font-medium py-10 text-center">No activity matches your filters.</p>
        ) : (
          <div className={`${portalLayout.listScrollPaneAdmin} overflow-x-auto`}>
            <table className="w-full border-collapse text-xs min-w-[720px]">
              <thead>
                <tr className="bg-zinc-50 text-zinc-500 text-[9px] uppercase tracking-widest font-black">
                  <th className="px-4 py-3 text-left">When</th>
                  <th className="px-4 py-3 text-left">Source</th>
                  <th className="px-4 py-3 text-left">Action</th>
                  <th className="px-4 py-3 text-left">Subject</th>
                  <th className="px-4 py-3 text-left">Actor</th>
                  <th className="px-4 py-3 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {paginated.map((row) => (
                  <tr key={row.id} className="hover:bg-zinc-50/80">
                    <td className="px-4 py-3 text-zinc-500 whitespace-nowrap">
                      {new Date(row.at).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 font-black uppercase text-[9px] text-zinc-500">
                      {row.source === "incident" ? "Incident" : "Alert"}
                    </td>
                    <td className="px-4 py-3 font-black text-zinc-800">{row.actionLabel}</td>
                    <td className="px-4 py-3 min-w-0">
                      <p className="font-mono font-black text-blue-600 truncate">{row.title}</p>
                      <p className="text-zinc-500 truncate mt-0.5">{row.summary}</p>
                    </td>
                    <td className="px-4 py-3 text-zinc-600">{row.actor}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => setSelectedEntry(row)}
                        className={`${adminShell.btnGhost} !py-1.5 !px-2.5 text-[10px]`}
                      >
                        <Eye size={iconSize.inlineSm} /> Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 ? (
          <div className="flex items-center justify-center gap-3 pt-4 border-t border-zinc-100 mt-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className={adminShell.btnIcon}
            >
              Prev
            </button>
            <span className="text-sm font-bold text-zinc-600">
              {page} / {totalPages}
            </span>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className={adminShell.btnIcon}
            >
              Next
            </button>
          </div>
        ) : null}
      </AdminPanel>

      <AdminActivityDetailModal entry={selectedEntry} onClose={() => setSelectedEntry(null)} />
    </>
  );
}
