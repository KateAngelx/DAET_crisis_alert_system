"use client";

import React, { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight, FileText, Plus, CheckCircle, Search, MapPin, Clock, User } from "lucide-react";
import { useAuthStore } from "@/app/store/crisisStore";
import { useIncidentStore } from "@/app/store/incidentStore";
import { ReportIncidentModal } from "@/app/components/ReportIncidentModal";
import {
  InfoPageHero,
  PublicPageShell,
  PublicPageContent,
  PublicPanel,
  publicLayout,
} from "@/app/components/InfoPageHero";
import { RoleContextBanner } from "@/app/components/dashboard/RoleContextBanner";
import { ROLE_INTERFACE } from "@/lib/roleInterfaceCopy";
import { AsyncState, EmptyState } from "@/app/components/ui/AsyncState";
import { ReportCardSkeletonList } from "@/app/components/ui/Skeletons";
import { portalShell, portalLayout, statGrid } from "@/lib/designSystem";
import { getSeverityColor, getStatusColor, INCIDENT_CATEGORIES, INCIDENT_SEVERITIES } from "@/lib/constants";
import { PublicStatCard } from "@/app/components/dashboard/PublicStatCard";
import { PublicStatCardSkeleton } from "@/app/components/ui/Skeletons";
import { CategoryFilterSelect, StatusRecordList } from "@/app/components/shell/StatusRecordList";
import { sortRecordsNewestFirst } from "@/lib/recordSorting";
import { PublicListModal } from "@/app/components/shell/PublicListModal";
import { supabase } from "@/lib/supabaseClient";

const REPORTS_PER_PAGE = 10;

export default function MyReportsPage() {
  return (
    <Suspense
      fallback={
        <PublicPageShell>
          <PublicPageContent>
            <ReportCardSkeletonList count={3} />
          </PublicPageContent>
        </PublicPageShell>
      }
    >
      <MyReportsContent />
    </Suspense>
  );
}

function MyReportsContent() {
  const { user, isAuthenticated } = useAuthStore();
  const { incidents, fetchIncidents, loading, error } = useIncidentStore();
  const [modalOpen, setModalOpen] = useState(false);
  const [successRef, setSuccessRef] = useState(null);
  const [notificationWarnings, setNotificationWarnings] = useState([]);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [selectedIncidentId, setSelectedIncidentId] = useState(null);
  const [reportHistoryState, setReportHistoryState] = useState({ reportId: null, rows: [], error: null });
  const searchParams = useSearchParams();
  const OPEN_INCIDENT_MODAL_KEY = "daet-open-incident-modal";

  useEffect(() => {
    if (user?.id) fetchIncidents({ reporterId: user.id });
  }, [user?.id, fetchIncidents]);

  useEffect(() => {
    if (!isAuthenticated) return;

    if (typeof window !== "undefined" && sessionStorage.getItem(OPEN_INCIDENT_MODAL_KEY) === "1") {
      sessionStorage.removeItem(OPEN_INCIDENT_MODAL_KEY);
      // Apply external sessionStorage navigation by opening the report modal.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setModalOpen(true);
    }

    if (searchParams.get("report") === "1") {
      setModalOpen(true);
      const url = new URL(window.location.href);
      url.searchParams.delete("report");
      const next = `${url.pathname}${url.search}${url.hash}`;
      if (next !== `${window.location.pathname}${window.location.search}${window.location.hash}`) {
        window.history.replaceState(window.history.state, "", next);
      }
    }
  }, [searchParams, isAuthenticated]);

  useEffect(() => {
    if (!selectedIncidentId) return undefined;
    let active = true;

    (async () => {
      try {
        const { data, error: historyError } = await supabase
          .from("incident_history")
          .select("id, action, old_status, new_status, notes, created_at")
          .eq("incident_id", selectedIncidentId)
          .order("created_at", { ascending: false });
        if (historyError) throw historyError;
        if (active) {
          setReportHistoryState({ reportId: selectedIncidentId, rows: data || [], error: null });
        }
      } catch (historyError) {
        if (active) {
          setReportHistoryState({ reportId: selectedIncidentId, rows: [], error: historyError.message });
        }
      }
    })();

    return () => { active = false; };
  }, [selectedIncidentId]);

  const handleReportSuccess = (incident, warnings = []) => {
    setSuccessRef(incident.reference_number);
    setNotificationWarnings(warnings);
    setPage(1);
    if (user?.id) fetchIncidents({ reporterId: user.id });
  };

  const filteredReports = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return sortRecordsNewestFirst(incidents, ["created_at"]).filter((incident) => {
      if (categoryFilter !== "all" && incident.category !== categoryFilter) return false;
      if (severityFilter !== "all" && incident.severity !== severityFilter) return false;
      if (statusFilter !== "all" && incident.status !== statusFilter) return false;
      if (!query) return true;
      return [
        incident.reference_number,
        incident.category,
        incident.severity,
        incident.location,
        incident.description,
        incident.status,
      ].some((value) => value?.toLowerCase().includes(query));
    });
  }, [incidents, categoryFilter, severityFilter, statusFilter, searchTerm]);

  const reportStatuses = useMemo(
    () => [...new Set(incidents.map((incident) => incident.status).filter(Boolean))].sort(),
    [incidents]
  );

  const totalPages = Math.max(1, Math.ceil(filteredReports.length / REPORTS_PER_PAGE));
  const currentPage = Math.min(page, totalPages);
  const paginatedReports = filteredReports.slice(
    (currentPage - 1) * REPORTS_PER_PAGE,
    currentPage * REPORTS_PER_PAGE
  );
  const selectedIncident = incidents.find((incident) => incident.id === selectedIncidentId) || null;
  const reportHistory = reportHistoryState.reportId === selectedIncidentId ? reportHistoryState.rows : [];
  const reportHistoryLoading = Boolean(selectedIncidentId) && reportHistoryState.reportId !== selectedIncidentId;
  const reportHistoryError = reportHistoryState.reportId === selectedIncidentId ? reportHistoryState.error : null;

  const reportRows = paginatedReports.map((incident) => ({
    id: incident.id,
    status: incident.status,
    statusClass: getStatusColor(incident.status),
    reference: incident.reference_number || "Reference pending",
    place: incident.location || "Location not provided",
    placeAlign: "right",
    type: incident.category || "Uncategorized",
    when: incident.created_at ? new Date(incident.created_at).toLocaleString() : "—",
    onSelect: () => setSelectedIncidentId(incident.id),
    actionLabel: "Details",
    ariaLabel: `View report ${incident.reference_number || ""} details`,
  }));

  const openReports = incidents.filter((i) => !["Resolved", "Closed", "Rejected"].includes(i.status));
  const urgentReports = incidents.filter((i) => i.severity === "Critical" || i.severity === "High");

  if (!isAuthenticated) {
    return (
      <PublicPageShell>
        <InfoPageHero
          title="My Reports"
          description="Sign in to submit incident reports and track tourism office response."
        />
        <PublicPageContent>
          <PublicPanel title="Sign in required">
            <p className="text-sm text-zinc-600 font-medium mb-4">
              Your submitted reports and status updates are available after you sign in.
            </p>
            <Link href="/login" className={portalShell.btnPrimary}>
              Sign in
            </Link>
          </PublicPanel>
        </PublicPageContent>
      </PublicPageShell>
    );
  }

  return (
    <>
      <PublicPageShell>
        <InfoPageHero
          title={ROLE_INTERFACE.public.reports.title}
          description={ROLE_INTERFACE.public.reports.description}
        />

        <PublicPageContent>
          <RoleContextBanner helper={ROLE_INTERFACE.public.reports.helper} tone="info" />

          <PublicPanel
            title="Overview"
            subtitle="Report counts"
            action={
              <button type="button" onClick={() => setModalOpen(true)} className={portalShell.btnDanger}>
                <Plus size={16} /> Report an incident
              </button>
            }
          >
            {loading ? (
              <PublicStatCardSkeleton count={3} className={`${statGrid.crisisHub} mb-4`} compact />
            ) : (
              <div className={`${statGrid.crisisHub} mb-4`}>
                <PublicStatCard compact value={incidents.length} label="Total Reports" accent="blue" />
                <PublicStatCard compact value={openReports.length} label="Open Cases" accent="orange" />
                <PublicStatCard compact value={urgentReports.length} label="High / Critical" accent="red" />
              </div>
            )}
          </PublicPanel>

          <PublicPanel
            title="Your incident reports"
            subtitle={`${filteredReports.length} matching reports`}
            bodyClassName={portalLayout.panelBodyStack}
          >
            {successRef ? (
              <div className="mb-4 p-4 rounded-xl bg-green-50 border border-green-200 flex items-start gap-3">
                <CheckCircle size={20} className="text-green-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-green-800">Report submitted — reference {successRef}</p>
                  <p className="text-xs text-green-700 mt-1">The Daet Municipal Tourism Office will review your report. Status updates appear below.</p>
                  {notificationWarnings.length > 0 ? (
                    <p className="mt-2 text-xs font-semibold text-amber-800" role="status">
                      The report was saved, but some notifications may not have been delivered: {notificationWarnings.join(" ")}
                    </p>
                  ) : null}
                </div>
              </div>
            ) : null}

            <AsyncState
              loading={loading}
              error={error}
              isEmpty={!loading && !error && incidents.length === 0}
              onRetry={() => fetchIncidents({ reporterId: user.id })}
              loadingFallback={<ReportCardSkeletonList count={3} />}
              emptyFallback={
                <EmptyState
                  icon={FileText}
                  title="No reports submitted yet"
                  action={
                    <button
                      type="button"
                      onClick={() => setModalOpen(true)}
                      className="text-blue-600 font-black text-xs uppercase hover:underline"
                    >
                      Report an Incident
                    </button>
                  }
                />
              }
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <label className="relative block min-w-0">
                  <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-1.5 block">
                    Search reports
                  </span>
                  <Search size={16} className="absolute left-3 top-[2.4rem] -translate-y-1/2 text-zinc-400" aria-hidden />
                  <input
                    type="search"
                    value={searchTerm}
                    onChange={(event) => { setSearchTerm(event.target.value); setPage(1); }}
                    placeholder="Reference, location, or details"
                    aria-label="Search incident reports"
                    className={`${portalShell.input} pl-10`}
                  />
                </label>
                <CategoryFilterSelect
                  label="Report category"
                  value={categoryFilter}
                  onChange={(value) => { setCategoryFilter(value); setPage(1); }}
                  options={INCIDENT_CATEGORIES}
                  allValue="all"
                  allLabel="All categories"
                />
                <CategoryFilterSelect
                  label="Severity"
                  value={severityFilter}
                  onChange={(value) => { setSeverityFilter(value); setPage(1); }}
                  options={[...INCIDENT_SEVERITIES].reverse()}
                  allValue="all"
                  allLabel="All severities"
                />
                <CategoryFilterSelect
                  label="Status"
                  value={statusFilter}
                  onChange={(value) => { setStatusFilter(value); setPage(1); }}
                  options={reportStatuses}
                  allValue="all"
                  allLabel="All statuses"
                />
              </div>
              <StatusRecordList
                rows={reportRows}
                columnLabels={["Status", "Location", "Category", "Submitted"]}
                emptyMessage="No reports match your search and filters."
              />
              {filteredReports.length > REPORTS_PER_PAGE ? (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-zinc-100">
                  <p className="text-xs font-medium text-zinc-500">
                    Showing {(currentPage - 1) * REPORTS_PER_PAGE + 1}–{Math.min(currentPage * REPORTS_PER_PAGE, filteredReports.length)} of {filteredReports.length}
                  </p>
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setPage(currentPage - 1)}
                      disabled={currentPage === 1}
                      className={portalShell.btnIcon}
                      aria-label="Previous page"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <span className="text-xs font-bold text-zinc-600">Page {currentPage} of {totalPages}</span>
                    <button
                      type="button"
                      onClick={() => setPage(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className={portalShell.btnIcon}
                      aria-label="Next page"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              ) : null}
            </AsyncState>
          </PublicPanel>
        </PublicPageContent>
      </PublicPageShell>

      <ReportIncidentModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={handleReportSuccess}
        categories={INCIDENT_CATEGORIES.filter((category) => category !== "Tourist Assistance")}
      />
      <PublicListModal
        open={Boolean(selectedIncident)}
        onClose={() => setSelectedIncidentId(null)}
        title={selectedIncident?.category || "Report details"}
        subtitle={selectedIncident
          ? `${selectedIncident.reference_number || "Reference pending"} · Submitted ${selectedIncident.created_at ? new Date(selectedIncident.created_at).toLocaleString() : "—"}`
          : undefined}
      >
        {selectedIncident ? (
          <div className="space-y-5">
            <div className="flex flex-wrap gap-2">
              <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase ${getSeverityColor(selectedIncident.severity)}`}>
                {selectedIncident.severity || "Unknown severity"}
              </span>
              <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase ${getStatusColor(selectedIncident.status)}`}>
                {selectedIncident.status || "Unknown status"}
              </span>
            </div>

            <section>
              <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-2">Description</h3>
              <p className="text-sm font-medium leading-relaxed text-zinc-700 whitespace-pre-wrap">
                {selectedIncident.description || "No description provided."}
              </p>
            </section>

            <dl className="divide-y divide-zinc-100 border-y border-zinc-100">
              <div className="grid grid-cols-1 sm:grid-cols-[7rem_1fr] gap-1 sm:gap-3 py-2.5">
                <dt className="text-[9px] font-black uppercase tracking-widest text-zinc-400">Location</dt>
                <dd className="text-sm font-medium text-zinc-700 flex items-start gap-1.5"><MapPin size={14} className="mt-0.5 shrink-0 text-blue-600" />{selectedIncident.location || "Not provided"}</dd>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-[7rem_1fr] gap-1 sm:gap-3 py-2.5">
                <dt className="text-[9px] font-black uppercase tracking-widest text-zinc-400">Submitted</dt>
                <dd className="text-sm font-medium text-zinc-700 flex items-start gap-1.5"><Clock size={14} className="mt-0.5 shrink-0 text-zinc-400" />{selectedIncident.created_at ? new Date(selectedIncident.created_at).toLocaleString() : "—"}</dd>
              </div>
              {selectedIncident.reporter?.full_name ? (
                <div className="grid grid-cols-1 sm:grid-cols-[7rem_1fr] gap-1 sm:gap-3 py-2.5">
                  <dt className="text-[9px] font-black uppercase tracking-widest text-zinc-400">Reporter</dt>
                  <dd className="text-sm font-medium text-zinc-700 flex items-start gap-1.5"><User size={14} className="mt-0.5 shrink-0 text-zinc-400" />{selectedIncident.reporter.full_name}</dd>
                </div>
              ) : null}
            </dl>

            {selectedIncident.attachments?.length ? (
              <section>
                <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-2">Evidence</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {selectedIncident.attachments.map((attachment) => (
                    <a
                      key={attachment.id}
                      href={attachment.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block overflow-hidden rounded-lg border border-zinc-200 text-xs font-semibold text-zinc-600 hover:border-zinc-300"
                    >
                      {attachment.file_type?.startsWith("image/") ? (
                        <img src={attachment.file_url} alt={attachment.file_name || "Report evidence"} className="h-28 w-full object-cover" />
                      ) : (
                        <span className="block p-3 break-words">{attachment.file_name || "Open attachment"}</span>
                      )}
                    </a>
                  ))}
                </div>
              </section>
            ) : null}

            {selectedIncident.response_actions ? (
              <section>
                <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-2">Response actions</h3>
                <p className="text-sm font-medium leading-relaxed text-zinc-700 whitespace-pre-wrap">{selectedIncident.response_actions}</p>
              </section>
            ) : null}

            <section>
              <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-2">Status history</h3>
              {reportHistoryLoading ? (
                <p className="text-xs font-medium text-zinc-500">Loading status history…</p>
              ) : reportHistoryError ? (
                <p className="text-xs font-medium text-red-600">Status history could not be loaded.</p>
              ) : reportHistory.length ? (
                <div className="space-y-3">
                  {reportHistory.map((entry) => (
                    <div key={entry.id} className="flex items-start gap-2.5">
                      <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-blue-500" />
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-zinc-800">
                          {entry.old_status ? `${entry.old_status} → ${entry.new_status}` : entry.new_status || entry.action}
                        </p>
                        {entry.notes ? <p className="mt-0.5 whitespace-pre-wrap text-xs text-zinc-600">{entry.notes}</p> : null}
                        <p className="mt-0.5 text-[10px] text-zinc-400">{new Date(entry.created_at).toLocaleString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs font-medium text-zinc-500">No status history available.</p>
              )}
            </section>
          </div>
        ) : null}
      </PublicListModal>
    </>
  );
}
