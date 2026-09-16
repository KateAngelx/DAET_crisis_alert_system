"use client";



import React, { useEffect, useRef, useState } from "react";

import {

  ChevronLeft, ChevronRight,

  MapPin, AlertTriangle, Archive, CheckCircle, Clock, FileText, Radio, Route,

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

import { getIncidentQuickActions } from "@/lib/incidentAdminActions";

import { StatCardSkeletonGrid, TableSkeleton } from "@/app/components/ui/Skeletons";

import { AsyncState, EmptyState } from "@/app/components/ui/AsyncState";

import { CharCounterTextarea } from "@/app/components/ui/CharCounterTextarea";

import { useConfirm } from "@/app/components/ui/ConfirmDialogProvider";



const QUICK_FILTERS = [

  { id: "all", label: "All", patch: { status: "All" } },

  { id: "pending", label: "New reports", patch: { status: "Submitted" } },
  { id: "approved", label: "Approved", patch: { status: "Approved" } },

  { id: "active", label: "In progress", patch: { status: "Responding" } },

  { id: "closed", label: "Closed", patch: { status: "Resolved" } },

];



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

  const { confirm } = useConfirm();

  const [selected, setSelected] = useState(null);

  const [showModal, setShowModal] = useState(false);

  const [updateForm, setUpdateForm] = useState({ status: "", assignedTo: "", adminNotes: "", responseActions: "" });

  const [page, setPage] = useState(1);

  const [actionBusyId, setActionBusyId] = useState(null);

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

    // #region agent log

    fetch("http://127.0.0.1:7540/ingest/3142bff0-53ba-4c2c-9606-b4d021977f0c", {

      method: "POST",

      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "197cec" },

      body: JSON.stringify({

        sessionId: "197cec",

        runId: "admin-incidents-stats-row",

        hypothesisId: "H1",

        location: "admin/incidents/page.js:layout",

        message: "Incident stats row layout measured",

        data: {

          total: stats.total,

          pending: stats.pending,

          statsLayout: "single-row",

          childCount: el.children.length,

          display: cs.display,

          gridAutoFlow: cs.gridAutoFlow,

          gridTemplateColumns: cs.gridTemplateColumns,

          containerWidth: Math.round(el.getBoundingClientRect().width),

        },

        timestamp: Date.now(),

      }),

    }).catch(() => {});

    // #endregion

  }, [loading, stats.total, stats.pending]);



  const filtered = getFilteredIncidents();

  const paginated = filtered.slice((page - 1) * perPage, page * perPage);

  const totalPages = Math.ceil(filtered.length / perPage);



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

    setSelected(inc);

    setUpdateForm({

      status: preset.status ?? inc.status,

      assignedTo: preset.assignedTo ?? inc.assigned_to ?? "",

      adminNotes: inc.admin_notes || "",

      responseActions: inc.response_actions || "",

    });

    setShowModal(true);

  };



  const applyStatusUpdate = async (inc, nextStatus, extra = {}) => {

    setActionBusyId(inc.id);

    const assignee = extra.assignedTo ? guides.find((g) => g.id === extra.assignedTo) : null;

    const result = await updateIncidentStatus(inc.id, nextStatus, {

      assignedTo: extra.assignedTo ?? inc.assigned_to ?? null,

      adminNotes: extra.adminNotes ?? inc.admin_notes,

      responseActions: extra.responseActions ?? inc.response_actions,

      changedBy: user?.id,

      oldStatus: inc.status,

      action: extra.action || "status_update",

      notes: extra.notes || extra.adminNotes,

      assigneeProfile: assignee,

    });

    setActionBusyId(null);

    if (result.success) {

      await fetchIncidents();

      await fetchIncidentAuditLog();

      if (nextStatus === "Approved" || nextStatus === "Rejected") {

        if (selected?.id === inc.id) setShowModal(false);

      }

      if (selected?.id === inc.id) {

        setSelected(result.incident);

        setUpdateForm((f) => ({ ...f, status: nextStatus }));

      }

      // #region agent log

      fetch("http://127.0.0.1:7540/ingest/3142bff0-53ba-4c2c-9606-b4d021977f0c", {

        method: "POST",

        headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "197cec" },

        body: JSON.stringify({

          sessionId: "197cec",

          runId: "incident-approve-queue",

          hypothesisId: "H-queue-audit",

          location: "admin/incidents/page.js:applyStatusUpdate",

          message: "Status update applied",

          data: {

            ref: inc.reference_number,

            from: inc.status,

            to: nextStatus,

            action: extra.action,

            queueVisible: !["Approved", "Received", "Rejected", "Resolved", "Closed"].includes(nextStatus),

          },

          timestamp: Date.now(),

        }),

      }).catch(() => {});

      // #endregion

    }

    return result;

  };



  const handleQuickAction = async (inc, action) => {

    if (action.needsModal) {

      openDetail(inc, { status: action.nextStatus });

      return;

    }

    if (action.confirm) {

      const approveCopy =

        action.id === "accept"

          ? `Approve ${inc.reference_number}? It will leave the active queue and be recorded in the audit log below.`

          : `This will set ${inc.reference_number} to “${action.nextStatus}”. The reporter may be notified.`;

      const ok = await confirm({

        title: `${action.label} report?`,

        description: approveCopy,

        confirmLabel: action.label,

        variant: action.tone === "danger" ? "danger" : "warning",

      });

      if (!ok) return;

    }

    // #region agent log

    fetch("http://127.0.0.1:7540/ingest/3142bff0-53ba-4c2c-9606-b4d021977f0c", {

      method: "POST",

      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "197cec" },

      body: JSON.stringify({

        sessionId: "197cec",

        runId: "admin-incidents-v3",

        hypothesisId: "H2",

        location: "admin/incidents/page.js:quickAction",

        message: "Incident quick action",

        data: { actionId: action.id, from: inc.status, to: action.nextStatus, ref: inc.reference_number },

        timestamp: Date.now(),

      }),

    }).catch(() => {});

    // #endregion

    await applyStatusUpdate(inc, action.nextStatus, { action: action.action, notes: `${action.label} via quick action` });

  };



  const handleUpdate = async () => {

    if (!selected) return;

    if (!updateForm.assignedTo && updateForm.status === "Assigned") {

      const ok = await confirm({

        title: "Assign without guide?",

        description: "Choose a guide in Assign To, or pick a different status.",

        confirmLabel: "Save anyway",

        variant: "warning",

      });

      if (!ok) return;

    }

    await applyStatusUpdate(selected, updateForm.status, {

      assignedTo: updateForm.assignedTo || null,

      adminNotes: updateForm.adminNotes,

      responseActions: updateForm.responseActions,

      action: "admin_update",

      notes: updateForm.adminNotes,

    });

    setShowModal(false);

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
            <AdminDashboardQuickNavLink href="/crisis/admin" icon={Radio} label="Command Center" />
            <AdminDashboardQuickNavDivider />
            <AdminDashboardQuickNavLink
              href="/crisis/admin/routes"
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

              <div className={`space-y-3 ${portalLayout.listScrollPaneAdmin}`}>

                {paginated.map((inc) => (

                  <IncidentReportAdminCard

                    key={inc.id}

                    incident={inc}

                    actionBusyId={actionBusyId}

                    onManage={openDetail}

                    onQuickAction={handleQuickAction}

                  />

                ))}

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
        onClose={() => setShowModal(false)}
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

              {getIncidentQuickActions(selected.status).map((action) => (

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



            {selected.attachments?.length > 0 && (

              <div className="grid grid-cols-3 gap-2">

                {selected.attachments.map((a) => (

                  <a key={a.id} href={a.file_url} target="_blank" rel="noopener noreferrer">

                    <img src={a.file_url} alt={a.file_name} className="w-full h-20 object-cover rounded-lg border border-zinc-200" />

                  </a>

                ))}

              </div>

            )}



            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

              <div>

                <label className="text-[10px] font-black uppercase text-zinc-400">Status</label>

                <select

                  value={updateForm.status}

                  onChange={(e) => setUpdateForm({ ...updateForm, status: e.target.value })}

                  className={`${adminShell.select} w-full mt-1`}

                >

                  {INCIDENT_STATUSES.map((s) => (

                    <option key={s} value={s}>

                      {s}

                    </option>

                  ))}

                </select>

              </div>

              <div>

                <label className="text-[10px] font-black uppercase text-zinc-400">Assign to guide</label>

                <select

                  value={updateForm.assignedTo}

                  onChange={(e) => setUpdateForm({ ...updateForm, assignedTo: e.target.value })}

                  className={`${adminShell.select} w-full mt-1`}

                >

                  <option value="">Unassigned</option>

                  {guides.map((g) => (

                    <option key={g.id} value={g.id}>

                      {g.full_name}

                    </option>

                  ))}

                </select>

              </div>

            </div>



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

