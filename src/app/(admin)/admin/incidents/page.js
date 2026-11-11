"use client";



import React, { useCallback, useEffect, useRef, useState } from "react";

import {

  ChevronLeft, ChevronRight,

  MapPin, AlertTriangle, Archive, CheckCircle, Clock, FileText, Loader2, Radio, Route,

} from "lucide-react";

import { Card } from "@/app/components/ui/Card";

import { AdminPanel } from "@/app/components/admin/AdminPanel";
import { AdminFilterBar } from "@/app/components/admin/AdminFilterBar";
import { AdminModalShell } from "@/app/components/admin/AdminModalShell";
import { AdminDashboardKpiSection } from "@/app/components/admin/AdminDashboardKpiSection";
import {
  AdminDashboardQuickNavDivider,
  AdminDashboardQuickNavLink,
  AdminDashboardQuickNavRow,
} from "@/app/components/admin/AdminDashboardQuickNavLink";

import { DashboardPageHeader } from "@/app/components/dashboard/DashboardPageHeader";

import { DashboardStatCard } from "@/app/components/dashboard/DashboardStatCard";

import { IncidentReportAdminCard } from "@/app/components/incidents/IncidentReportAdminCard";
import { IncidentGuideAssignmentFields } from "@/app/components/incidents/IncidentGuideAssignmentFields";
import { incidentReportEligibleForGuideAssignment } from "@/lib/incidentGuideEligibility";
import { IncidentReportsAuditLog } from "@/app/components/incidents/IncidentReportsAuditLog";

import { adminShell, iconSize, portalLayout, statGrid } from "@/lib/designSystem";

import { RoleContextBanner } from "@/app/components/dashboard/RoleContextBanner";

import { ROLE_INTERFACE } from "@/lib/roleInterfaceCopy";

import { useIncidentStore } from "@/app/store/incidentStore";

import { useGuideStore } from "@/app/store/guideStore";

import { useAuthStore } from "@/app/store/crisisStore";

import {

  INCIDENT_STATUSES, INCIDENT_CATEGORIES, INCIDENT_SEVERITIES,

  INCIDENT_STATUS_LEGACY_RECEIVED,
} from "@/lib/constants";

import { incidentStatusBadgeClass, normalizeIncidentStatusLabel } from "@/lib/incidentStatusUtils";

import { getIncidentQuickActionsForReport } from "@/lib/incidentAdminActions";

import {
  getAdminIncidentStatusOptions,
  getIncidentStatusAdminHelp,
  validateIncidentStatusTransition,
} from "@/lib/incidentAdminStatus";

import { StatCardSkeletonGrid, TableSkeleton } from "@/app/components/ui/Skeletons";

import { AsyncState, EmptyState } from "@/app/components/ui/AsyncState";

import { CharCounterTextarea } from "@/app/components/ui/CharCounterTextarea";

import { useConfirm } from "@/app/components/ui/ConfirmDialogProvider";
import { getActiveSession } from "@/lib/authSession";



const QUICK_FILTERS = [

  { id: "all", label: "All", patch: { status: "All" } },

  { id: "pending", label: "New reports", patch: { status: "Submitted" } },
  { id: "approved", label: "Approved", patch: { status: "Approved" } },

  { id: "active", label: "In progress", patch: { status: "Responding" } },

  { id: "closed", label: "Closed", patch: { status: "Resolved" } },

];

async function adminIncidentFetch(url, options = {}) {
  const session = await getActiveSession();
  if (!session?.access_token) throw new Error("Not authenticated");

  return fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
}



export default function AdminIncidentsPage() {

  const { user } = useAuthStore();

  const {
    incidents,
    fetchIncidents,
    fetchIncidentAuditLog,
    updateIncidentStatus,
    getFilteredIncidents,
    getDashboardStats,
    setFilters,
    filters,
    loading,
    error,
    auditLog,
    auditLogLoading,
  } = useIncidentStore();

  const { guides, fetchGuides } = useGuideStore();

  const { confirm, alert } = useConfirm();

  const [selected, setSelected] = useState(null);

  const [showModal, setShowModal] = useState(false);

  const [updateForm, setUpdateForm] = useState({ status: "", assignedTo: "", adminNotes: "", responseActions: "" });

  const [page, setPage] = useState(1);

  const [actionBusyId, setActionBusyId] = useState(null);

  const [incidentPoints, setIncidentPoints] = useState(null);

  const [incidentPointsLoading, setIncidentPointsLoading] = useState(false);

  const [incidentPointsBusy, setIncidentPointsBusy] = useState(false);

  const [incidentPointsError, setIncidentPointsError] = useState(null);

  const incidentPointsRequestId = useRef(0);
  const incidentPointsAbortRef = useRef(null);

  const perPage = 8;

  const statsRowRef = useRef(null);



  useEffect(() => {

    fetchIncidents();

    fetchGuides();

    fetchIncidentAuditLog();

  }, [fetchIncidents, fetchGuides, fetchIncidentAuditLog]);



  const stats = getDashboardStats();



  useEffect(() => {

    if (loading || !statsRowRef.current) return;

    const el = statsRowRef.current;

    const cs = window.getComputedStyle(el);

  }, [loading, stats.total, stats.pending]);



  const filtered = getFilteredIncidents();

  const paginated = filtered.slice((page - 1) * perPage, page * perPage);

  const totalPages = Math.ceil(filtered.length / perPage);

  const loadIncidentPoints = useCallback(async (incidentReportId) => {
    const requestId = ++incidentPointsRequestId.current;
    incidentPointsAbortRef.current?.abort();
    const controller = new AbortController();
    incidentPointsAbortRef.current = controller;

    if (!incidentReportId) {
      setIncidentPoints(null);
      setIncidentPointsError(null);
      setIncidentPointsLoading(false);
      return;
    }

    setIncidentPointsLoading(true);
    setIncidentPointsError(null);
    try {
      const session = await getActiveSession();
      if (!session?.access_token) {
        throw new Error("Not authenticated");
      }

      const timeoutId = setTimeout(() => controller.abort(), 30000);
      let response;
      try {
        response = await fetch(
          `/api/admin/incidents/points?incidentReportId=${encodeURIComponent(incidentReportId)}`,
          {
            signal: controller.signal,
            headers: {
              Authorization: `Bearer ${session.access_token}`,
              "Content-Type": "application/json",
            },
          }
        );
      } finally {
        clearTimeout(timeoutId);
      }

      let result = null;
      try {
        result = await response.json();
      } catch {
        throw new Error("Unable to read points decision response.");
      }

      if (!response.ok) {
        throw new Error(result?.error || "Unable to load points decision.");
      }
      if (!result?.decision) {
        throw new Error("Invalid points decision response from server.");
      }

      if (requestId === incidentPointsRequestId.current) {
        setIncidentPoints(result);
      }
    } catch (loadError) {
      if (loadError.name === "AbortError") return;
      if (requestId === incidentPointsRequestId.current) {
        setIncidentPoints(null);
        setIncidentPointsError(loadError.message || "Unable to load points decision.");
      }
    } finally {
      if (requestId === incidentPointsRequestId.current) {
        setIncidentPointsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    loadIncidentPoints(selected?.id);
  }, [selected?.id, loadIncidentPoints]);



  const statItems = [

    { label: "Total reports", value: stats.total, icon: FileText, accent: "blue" },

    { label: "Active", value: stats.active, icon: Radio, accent: "orange" },

    { label: "Pending review", value: stats.pending, icon: Clock, accent: "orange" },

    { label: "Closed / resolved", value: stats.resolved, icon: CheckCircle, accent: "green" },

    { label: "Critical (open)", value: stats.critical, icon: AlertTriangle, accent: "red" },

    { label: "High (open)", value: stats.high, icon: AlertTriangle, accent: "orange" },

    { label: "Responding", value: stats.responding, icon: Radio, accent: "purple" },

  ];



  const openDetail = (inc, preset = {}) => {
    const guideAssignmentAllowed = incidentReportEligibleForGuideAssignment(inc);

    setSelected(inc);

    setUpdateForm({
      status: preset.status ?? inc.status,
      assignedTo: guideAssignmentAllowed ? (preset.assignedTo ?? inc.assigned_to ?? "") : "",
      adminNotes: inc.admin_notes || "",
      responseActions: inc.response_actions || "",
    });

    setIncidentPoints(null);
    setIncidentPointsError(null);
    setShowModal(true);
    loadIncidentPoints(inc.id);
  };



  const resolveAssignedToForUpdate = (inc, extra = {}) => {
    const guideRelated = incidentReportEligibleForGuideAssignment(inc);
    if (!guideRelated) return null;
    if (extra.assignedTo !== undefined) return extra.assignedTo || null;
    return inc.assigned_to ?? null;
  };

  const applyStatusUpdate = async (inc, nextStatus, extra = {}) => {
    const assignedTo = resolveAssignedToForUpdate(inc, extra);
    const transition = validateIncidentStatusTransition(
      inc.status,
      nextStatus,
      inc.category,
      assignedTo
    );
    if (!transition.ok) {
      await alert({
        title: "Cannot change status",
        description: transition.reason,
        variant: "danger",
      });
      return { success: false, error: transition.reason };
    }
    setActionBusyId(inc.id);
    setActionBusyId(inc.id);

    const assignee = assignedTo ? guides.find((g) => g.id === assignedTo) : null;

    try {
      const result = await updateIncidentStatus(inc.id, nextStatus, {
        assignedTo,
        adminNotes: extra.adminNotes !== undefined ? extra.adminNotes : inc.admin_notes,
        responseActions: extra.responseActions !== undefined ? extra.responseActions : inc.response_actions,
        changedBy: user?.id,
        oldStatus: inc.status,
        action: extra.action || "status_update",
        notes: extra.notes || extra.adminNotes,
        assigneeProfile: assignee,
      });

      if (!result.success) {
        await alert({
          title: "Update failed",
          description: result.error || "The incident status could not be updated.",
          variant: "danger",
        });
        return result;
      }

      await fetchIncidentAuditLog();

      const queueNote =
        nextStatus === "Approved"
          ? " It is removed from the default active queue — use the Approved filter to find it."
          : nextStatus === "Rejected"
            ? " Use the Closed filter or Archive to review rejected reports."
            : "";
      const statusHelp = getIncidentStatusAdminHelp(nextStatus, inc.category);

      await alert({
        title: "Incident status updated",
        description: `${inc.reference_number} is now “${normalizeIncidentStatusLabel(nextStatus)}”. ${statusHelp || ""}${queueNote} This operational status change does not decide Incident Reporting Points.`,
        variant: "success",
      });

      if (selected?.id === inc.id) {
        if (result.incident) {
          setSelected(result.incident);
        }
        setUpdateForm((f) => ({
          ...f,
          status: result.incident?.status || nextStatus,
          assignedTo: incidentReportEligibleForGuideAssignment(inc)
            ? result.incident?.assigned_to || ""
            : "",
        }));
        if (nextStatus === "Approved" || nextStatus === "Rejected") {
          setShowModal(false);
        }
      }

      return result;
    } finally {
      setActionBusyId(null);
    }
  };



  const handleQuickAction = async (inc, action) => {

    if (action.needsModal) {

      openDetail(inc, { status: action.nextStatus });

      return;

    }

    if (action.confirm) {
      const approveCopy =
        action.nextStatus === "Approved"
          ? `Accept ${inc.reference_number} for operational handling? It will leave the default active queue and appear under the Approved filter. This does not decide Incident Reporting Points.`
          : action.nextStatus === "Rejected"
            ? `Set ${inc.reference_number} to Rejected? This is a final operational status and does not change any Incident Reporting Points decision.`
            : `This will set ${inc.reference_number} to “${action.nextStatus}”. The reporter may be notified.`;

      const ok = await confirm({
        title:
          action.nextStatus === "Approved"
            ? "Approve incident for handling?"
            : `${action.label} report?`,
        description: approveCopy,
        confirmLabel: action.label,

        variant: action.tone === "danger" ? "danger" : "warning",

      });

      if (!ok) return;

    }

    if (actionBusyId === inc.id) return;

    await applyStatusUpdate(inc, action.nextStatus, {
      action: action.action,
      notes: `${action.label} via quick action`,
    });
  };



  const handleUpdate = async () => {

    if (!selected) return;

    const guideAssignmentAllowed = incidentReportEligibleForGuideAssignment(selected);
    const assignedTo = guideAssignmentAllowed ? updateForm.assignedTo || null : null;
    const transition = validateIncidentStatusTransition(
      selected.status,
      updateForm.status,
      selected.category,
      assignedTo
    );
    if (!transition.ok) {
      await alert({
        title: "Cannot change status",
        description: transition.reason,
        variant: "danger",
      });
      return;
    }

    if (updateForm.status !== selected.status) {
      const statusLabel = normalizeIncidentStatusLabel(updateForm.status);
      const statusHelp = getIncidentStatusAdminHelp(updateForm.status, selected.category);
      const confirmed = await confirm({
        title: `Change operational status to ${statusLabel}?`,
        description: `${statusHelp || "The report workflow will be updated."} This does not approve or decline Incident Reporting Points.`,
        confirmLabel: `Set ${statusLabel}`,
        variant: updateForm.status === "Rejected" ? "danger" : "warning",
      });
      if (!confirmed) return;
    }

    const result = await applyStatusUpdate(selected, updateForm.status, {
      assignedTo,
      adminNotes: updateForm.adminNotes,
      responseActions: updateForm.responseActions,
      action: "admin_update",
      notes: updateForm.adminNotes,
    });

    if (result.success && updateForm.status !== "Approved" && updateForm.status !== "Rejected") {
      setShowModal(false);
    }
  };

  const handleIncidentPointsDecision = async (decision) => {
    if (!selected) return;

    const approved = decision === "approved";
    const confirmed = await confirm({
      title: approved ? "Approve incident report points?" : "Decline incident report points?",
      description: approved
        ? `This awards the configured ${incidentPoints?.configuredPoints} points to the report's registered tourist. It is separate from the incident status and cannot be repeated.`
        : "This records a points-declined decision without changing the tourist's balance. This decision cannot be repeated.",
      confirmLabel: approved ? "Approve Points" : "Decline Points",
      variant: approved ? "success" : "warning",
    });
    if (!confirmed) return;

    setIncidentPointsBusy(true);
    setIncidentPointsError(null);
    try {
      const response = await adminIncidentFetch("/api/admin/incidents/points", {
        method: "POST",
        body: JSON.stringify({
          incidentReportId: selected.id,
          decision,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to record points decision.");
      await loadIncidentPoints(selected.id);
    } catch (decisionError) {
      setIncidentPointsError(decisionError.message || "Unable to record points decision.");
    } finally {
      setIncidentPointsBusy(false);
    }
  };



  return (

    <>

      <DashboardPageHeader

        title={ROLE_INTERFACE.admin.incidents.title}

        description={ROLE_INTERFACE.admin.incidents.description}

      />

      <RoleContextBanner helper={ROLE_INTERFACE.admin.incidents.helper} tone="info" />



      <AdminDashboardKpiSection
        pageId="incidents"
        footer={
          <AdminDashboardQuickNavRow>
            <AdminDashboardQuickNavLink href="/crisis/command" icon={Radio} label="Command Center" />
            <AdminDashboardQuickNavDivider />
            <AdminDashboardQuickNavLink
              href="/crisis/roads"
              icon={Route}
              label="Roads & hazards"
            />
            <AdminDashboardQuickNavDivider />
            <AdminDashboardQuickNavLink
              href="/admin/archive"
              icon={Archive}
              label="Archive & history"
              meta={`${stats.resolved} closed`}
            />
          </AdminDashboardQuickNavRow>
        }
      >
        {loading ? (
          <StatCardSkeletonGrid count={7} className={statGrid.incidentStatsRow} />
        ) : (
          <div ref={statsRowRef} className={statGrid.incidentStatsRow}>
            {statItems.map(({ label, value, icon: Icon, accent }) => (
              <DashboardStatCard
                key={label}
                compact
                label={label}
                value={value}
                icon={<Icon size={iconSize.stat} />}
                accent={accent}
              />
            ))}
          </div>
        )}
      </AdminDashboardKpiSection>

          <AdminFilterBar
            compact
            title="Live command filters"
            searchPlaceholder="Search by reference, location, reporter..."
            searchValue={filters.search}
            onSearchChange={(e) => {
              setFilters({ search: e.target.value });
              setPage(1);
            }}
            chips={QUICK_FILTERS.map((qf) => (
              <button
                key={qf.id}
                type="button"
                onClick={() => {
                  setFilters(qf.patch);
                  setPage(1);
                }}
                className={
                  filters.status === qf.patch.status ? adminShell.btnPrimary : adminShell.btnGhost
                }
              >
                {qf.label}
              </button>
            ))}
          >
            <select
              value={filters.status}
              onChange={(e) => {
                setFilters({ status: e.target.value });
                setPage(1);
              }}
              className={`${adminShell.select} !py-2 !text-xs min-w-[7.5rem]`}
            >
              <option value="All">All Statuses</option>
              {INCIDENT_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
              <option value={INCIDENT_STATUS_LEGACY_RECEIVED}>Received (legacy)</option>
            </select>
            <select
              value={filters.category}
              onChange={(e) => {
                setFilters({ category: e.target.value });
                setPage(1);
              }}
              className={`${adminShell.select} !py-2 !text-xs min-w-[7.5rem]`}
            >
              <option value="All">All Categories</option>
              {INCIDENT_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <select
              value={filters.severity}
              onChange={(e) => {
                setFilters({ severity: e.target.value });
                setPage(1);
              }}
              className={`${adminShell.select} !py-2 !text-xs min-w-[7.5rem]`}
            >
              <option value="All">All Severities</option>
              {INCIDENT_SEVERITIES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </AdminFilterBar>



          <AsyncState

            loading={loading}

            error={error}

            isEmpty={!loading && !error && paginated.length === 0}

            onRetry={fetchIncidents}

            loadingFallback={

              <AdminPanel noPadding bodyClassName="overflow-hidden">

                <Card className="overflow-hidden !p-0 border-0 shadow-none rounded-none">

                  <table className="w-full border-collapse">

                    <tbody>

                      <TableSkeleton rows={8} columns={5} />

                    </tbody>

                  </table>

                </Card>

              </AdminPanel>

            }

            emptyFallback={

              <EmptyState icon={FileText} title="No incidents found" description="Incident reports from tourists will appear here." />

            }

          >

            <AdminPanel
              title="Active queue"
              subtitle={`${filtered.length} in queue · page ${page} of ${totalPages || 1} · approved & closed reports are in the audit log`}
            >

              <div className="space-y-2 lg:hidden" aria-label="Incident reports list">
                {paginated.map((inc) => (
                  <IncidentReportAdminCard
                    key={inc.id}
                    incident={inc}
                    onManage={openDetail}
                    mobile
                  />
                ))}
              </div>
              <div className={`hidden overflow-x-auto rounded-xl border border-zinc-200 bg-white lg:block ${portalLayout.listScrollPaneAdmin}`}>
                <table className="w-full min-w-[1120px] border-collapse text-left">
                  <thead className="border-b border-zinc-100 bg-zinc-50">
                    <tr>
                      {["Reference", "Report / category", "Severity", "Status", "Location", "Reporter", "Date reported", "View"].map((label) => (
                        <th
                          key={label}
                          scope="col"
                          className="px-3 py-3 text-[9px] font-black uppercase tracking-widest text-zinc-400"
                        >
                          {label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {paginated.map((inc) => (
                      <IncidentReportAdminCard
                        key={inc.id}
                        incident={inc}
                        onManage={openDetail}
                      />
                    ))}
                  </tbody>
                </table>
              </div>

            </AdminPanel>

          </AsyncState>



          {totalPages > 1 && (

            <div className="flex items-center justify-center gap-3">

              <button

                type="button"

                disabled={page === 1}

                onClick={() => setPage(page - 1)}

                className={adminShell.btnIcon}

                aria-label="Previous page"

              >

                <ChevronLeft size={iconSize.button} />

              </button>

              <span className="text-sm font-bold text-zinc-600">

                {page} / {totalPages}

              </span>

              <button

                type="button"

                disabled={page === totalPages}

                onClick={() => setPage(page + 1)}

                className={adminShell.btnIcon}

                aria-label="Next page"

              >

                <ChevronRight size={iconSize.button} />

              </button>

            </div>

          )}

          <IncidentReportsAuditLog
            entries={auditLog}
            loading={auditLogLoading}
            onRefresh={() => fetchIncidentAuditLog()}
          />

      <AdminModalShell
        open={showModal && !!selected}
        onClose={() => {
          incidentPointsAbortRef.current?.abort();
          incidentPointsRequestId.current += 1;
          setIncidentPointsLoading(false);
          setIncidentPoints(null);
          setIncidentPointsError(null);
          setShowModal(false);
        }}
        subtitle={selected?.reference_number}
        title={selected?.category}
        headerExtra={
          selected ? (
            <span
              className={`inline-block mt-2 px-2.5 py-1 rounded-full text-[9px] font-black uppercase ${incidentStatusBadgeClass(selected.status)}`}
            >
              Status: {normalizeIncidentStatusLabel(selected.status)}
            </span>
          ) : null
        }
      >
        {selected ? (
          <>
            <div className="flex flex-wrap gap-2">

              {getIncidentQuickActionsForReport(selected).map((action) => (

                <button

                  key={action.id}

                  type="button"

                  disabled={actionBusyId === selected.id}

                  onClick={() => handleQuickAction(selected, action)}

                  className={`${action.tone === "primary" ? adminShell.btnPrimary : action.tone === "danger" ? adminShell.btnGhost + " text-red-600 border-red-100" : action.tone === "success" ? adminShell.btnSuccess : adminShell.btnGhost} text-[10px]`}

                >

                  {action.label}

                </button>

              ))}

            </div>



            <p className="text-zinc-700 text-sm">{selected.description}</p>

            <p className="text-sm text-zinc-500 flex items-center gap-1">

              <MapPin size={iconSize.inline} className="text-blue-500" /> {selected.location}

            </p>



            {selected.reporter && (

              <div className="bg-zinc-50 rounded-xl p-4 text-sm border border-zinc-100">

                <p className="font-black text-xs uppercase text-zinc-400 mb-1">Reporter</p>

                <p className="font-bold">{selected.reporter.full_name}</p>

                <p className="text-zinc-500">

                  {selected.reporter.phone} | {selected.reporter.nationality}

                </p>

              </div>
            )}

            <section className="space-y-3 rounded-xl border border-blue-100 bg-blue-50/40 p-4">
              <div>
                <h3 className="text-xs font-black uppercase tracking-widest text-zinc-700">
                  Incident Reporting Points
                </h3>
                <p className="mt-1 text-xs leading-relaxed text-zinc-500">
                  This points decision is separate from the incident status and does not affect reporting or response.
                </p>
              </div>

              {incidentPointsLoading ? (
                <p className="text-xs font-medium text-zinc-500">Loading points decision...</p>
              ) : incidentPointsError ? (
                <div>
                  <p role="alert" className="text-xs font-semibold text-red-700">{incidentPointsError}</p>
                  <button
                    type="button"
                    onClick={() => loadIncidentPoints(selected.id)}
                    className="mt-2 text-xs font-bold text-blue-700 hover:underline"
                  >
                    Retry
                  </button>
                </div>
              ) : incidentPoints ? (
                <>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-wide ${
                      incidentPoints.decision.decision === "approved"
                        ? "bg-green-100 text-green-700"
                        : incidentPoints.decision.decision === "declined"
                          ? "bg-zinc-200 text-zinc-700"
                          : "bg-amber-100 text-amber-800"
                    }`}>
                      {incidentPoints.decision.decision === "pending"
                        ? "Points decision pending"
                        : `Points ${incidentPoints.decision.decision}`}
                    </span>
                    {incidentPoints.decision.awardedPoints != null && (
                      <span className="text-xs font-black text-green-700">
                        {incidentPoints.decision.awardedPoints} points awarded
                      </span>
                    )}
                  </div>

                  {incidentPoints.decision.decision !== "pending" && (
                    <div className="space-y-1 text-[11px] leading-relaxed text-zinc-600">
                      <p>
                        Decision by{" "}
                        <span className="font-semibold text-zinc-800">
                          {incidentPoints.decision.decidedByName || incidentPoints.decision.decidedBy || "Admin"}
                        </span>
                        {incidentPoints.decision.decidedAt
                          ? ` · ${new Date(incidentPoints.decision.decidedAt).toLocaleString()}`
                          : ""}
                      </p>
                      {incidentPoints.decision.awardedAt && (
                        <p>
                          Awarded by{" "}
                          <span className="font-semibold text-zinc-800">
                            {incidentPoints.decision.awardedByName || incidentPoints.decision.awardedBy || "Admin"}
                          </span>
                          {" · "}{new Date(incidentPoints.decision.awardedAt).toLocaleString()}
                        </p>
                      )}
                    </div>
                  )}

                  {incidentPoints.decision.decision === "pending" && (
                    <>
                      {!incidentPoints.reporterEligible && (
                        <p className="text-xs font-semibold text-amber-800">
                          Points can only be awarded to reports submitted by a registered tourist.
                        </p>
                      )}
                      {incidentPoints.reporterEligible && !incidentPoints.rewardsEnabled && (
                        <p className="text-xs font-semibold text-amber-800">
                          Rewards are disabled globally or for incident reporting.
                        </p>
                      )}
                      {incidentPoints.reporterEligible &&
                        incidentPoints.rewardsEnabled &&
                        incidentPoints.configuredPoints < 1 && (
                          <p className="text-xs font-semibold text-amber-800">
                            The configured incident-report reward amount must be greater than zero.
                          </p>
                        )}
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          disabled={
                            incidentPointsBusy ||
                            !incidentPoints.reporterEligible ||
                            !incidentPoints.rewardsEnabled ||
                            incidentPoints.configuredPoints < 1
                          }
                          onClick={() => handleIncidentPointsDecision("approved")}
                          className={`${adminShell.btnSuccess} disabled:opacity-50`}
                        >
                          {incidentPointsBusy ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                          Approve Points ({incidentPoints.configuredPoints})
                        </button>
                        <button
                          type="button"
                          disabled={incidentPointsBusy}
                          onClick={() => handleIncidentPointsDecision("declined")}
                          className={`${adminShell.btnGhost} border-zinc-200 text-zinc-700 disabled:opacity-50`}
                        >
                          Decline Points
                        </button>
                      </div>
                    </>
                  )}
                </>
              ) : (
                <p className="text-xs font-medium text-zinc-500">No points decision data loaded.</p>
              )}
            </section>



            {selected.attachments?.length > 0 && (

              <div className="grid grid-cols-3 gap-2">

                {selected.attachments.map((a) => (

                  <a key={a.id} href={a.file_url} target="_blank" rel="noopener noreferrer">

                    <img src={a.file_url} alt={a.file_name} className="w-full h-20 object-cover rounded-lg border border-zinc-200" />

                  </a>

                ))}

              </div>

            )}



            <section
              key={selected.id}
              className="space-y-4 rounded-xl border border-zinc-200 bg-white p-4"
            >
              <div>
                <h3 className="text-xs font-black uppercase tracking-widest text-zinc-700">
                  Operational status
                </h3>
                <p className="mt-1 text-xs leading-relaxed text-zinc-500">
                  Controls incident handling and notifications. This is separate from Incident Reporting Points below.
                </p>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-zinc-400">Status</label>
                <select
                  value={updateForm.status}
                  onChange={(e) => setUpdateForm({ ...updateForm, status: e.target.value })}
                  className={`${adminShell.select} w-full mt-1`}
                >
                  {getAdminIncidentStatusOptions(selected).map((s) => (
                    <option key={s} value={s}>
                      {s === INCIDENT_STATUS_LEGACY_RECEIVED ? "Approved (legacy Received)" : s}
                    </option>
                  ))}
                </select>
                <p className="mt-2 text-[11px] leading-relaxed text-zinc-500">
                  {getIncidentStatusAdminHelp(updateForm.status, selected.category) ||
                    getIncidentStatusAdminHelp(normalizeIncidentStatusLabel(updateForm.status), selected.category) ||
                    "Choose the stage that matches how this report is being handled."}
                </p>
              </div>

              <IncidentGuideAssignmentFields
                incident={selected}
                guides={guides}
                assignedTo={updateForm.assignedTo}
                disabled={actionBusyId === selected.id}
                onAssignedToChange={(value) => setUpdateForm({ ...updateForm, assignedTo: value })}
              />
            </section>



            <CharCounterTextarea

              label="Internal notes"

              value={updateForm.adminNotes}

              onChange={(e) => setUpdateForm({ ...updateForm, adminNotes: e.target.value })}

              rows={2}

              className={`${adminShell.input} w-full`}

            />



            <CharCounterTextarea

              label="Response actions (visible to reporter)"

              value={updateForm.responseActions}

              onChange={(e) => setUpdateForm({ ...updateForm, responseActions: e.target.value })}

              rows={2}

              className={`${adminShell.input} w-full`}

            />



            <button type="button" onClick={handleUpdate} className={`${adminShell.btnPrimary} w-full justify-center py-3`}>

              Save changes

            </button>
          </>
        ) : null}
      </AdminModalShell>

    </>

  );

}
