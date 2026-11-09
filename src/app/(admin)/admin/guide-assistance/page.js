"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Compass, RefreshCw, Search } from "lucide-react";
import { ListPager } from "@/app/components/shell/ListPager";
import { AdminPanel } from "@/app/components/admin/AdminPanel";
import { DashboardPageHeader } from "@/app/components/dashboard/DashboardPageHeader";
import { AsyncState, EmptyState } from "@/app/components/ui/AsyncState";
import { useConfirm } from "@/app/components/ui/ConfirmDialogProvider";
import { getActiveSession } from "@/lib/authSession";
import { adminShell } from "@/lib/designSystem";

const STATUSES = ["Pending", "Assigned", "Accepted", "Declined", "Completed", "Cancelled"];
const STATUS_STYLES = {
  Pending: "bg-amber-100 text-amber-800",
  Assigned: "bg-blue-100 text-blue-800",
  Accepted: "bg-green-100 text-green-800",
  Declined: "bg-red-100 text-red-800",
  Completed: "bg-zinc-100 text-zinc-700",
  Cancelled: "bg-zinc-100 text-zinc-500",
};

function formatDate(value) {
  if (!value) return "—";
  return new Date(value).toLocaleString();
}

export default function AdminGuideAssistancePage() {
  const { confirm } = useConfirm();
  const [requests, setRequests] = useState([]);
  const [guides, setGuides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");
  const [searchValue, setSearchValue] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("All");
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [guideSelection, setGuideSelection] = useState({});

  const loadRequests = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const session = await getActiveSession();
      if (!session?.access_token) throw new Error("Your session expired. Please sign in again.");
      const params = new URLSearchParams({ page: String(page), status, search });
      const response = await fetch(`/api/admin/guide-assistance?${params}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
        cache: "no-store",
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Unable to load assistance requests.");
      setRequests(result.requests || []);
      setGuides(result.guides || []);
      setTotalCount(result.totalCount || 0);
      setGuideSelection((current) => {
        const next = { ...current };
        for (const item of result.requests || []) {
          if (item.status === "Declined" && next[item.id] === item.assigned_guide_id) {
            delete next[item.id];
          } else if (!next[item.id] && item.guide?.id && item.status !== "Declined") {
            next[item.id] = item.guide.id;
          }
        }
        return next;
      });
    } catch (loadError) {
      setError(loadError.message || "Unable to load assistance requests.");
    } finally {
      setLoading(false);
    }
  }, [page, search, status]);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  const saveAction = async (item, action, nextStatus = null) => {
    if (busyId) return;
    const isAssignment = action === "assign";
    const guideId = guideSelection[item.id];
    if (isAssignment && !guideId) {
      setError("Select an active guide before assigning this request.");
      return;
    }

    const confirmed = await confirm({
      title: isAssignment
        ? item.status === "Declined" ? "Reassign guide?" : "Assign guide?"
        : `${nextStatus} this request?`,
      description: isAssignment
        ? "Only the selected guide will be notified and asked to accept or decline."
        : nextStatus === "Completed"
          ? "This marks the accepted assistance request as completed and notifies the tourist."
          : "This ends the request and notifies the tourist and assigned guide where applicable.",
      confirmLabel: isAssignment ? "Assign selected guide" : nextStatus,
      variant: nextStatus === "Cancelled" ? "warning" : "success",
    });
    if (!confirmed) return;

    setBusyId(item.id);
    setError("");
    setFeedback("");
    try {
      const session = await getActiveSession();
      if (!session?.access_token) throw new Error("Your session expired. Please sign in again.");
      const response = await fetch("/api/admin/guide-assistance", {
        method: isAssignment ? "POST" : "PATCH",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(isAssignment
          ? { action, requestId: item.id, guideId }
          : { requestId: item.id, status: nextStatus }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Unable to update the request.");
      const warnings = result.notificationWarnings || [];
      setFeedback(warnings.length
        ? `Request updated. Notification warning: ${warnings.join("; ")}`
        : isAssignment
          ? "Guide assigned and notified."
          : `Request marked ${nextStatus}.`);
      await loadRequests();
    } catch (actionError) {
      setError(actionError.message || "Unable to update the request.");
    } finally {
      setBusyId(null);
    }
  };

  const pageCount = Math.max(1, Math.ceil(totalCount / 10));

  return (
    <>
      <DashboardPageHeader
        title="Tourist Guide Assistance"
        description="Review tourist requests, select an active guide, and monitor responses through completion."
        action={
          <button type="button" onClick={loadRequests} disabled={loading} className={adminShell.btnGhost}>
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh
          </button>
        }
      />
      {error ? <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-800">{error}</p> : null}
      {feedback ? <p role="status" className="rounded-xl border border-green-200 bg-green-50 p-3 text-sm font-bold text-green-800">{feedback}</p> : null}
      <p className="rounded-xl border border-blue-100 bg-blue-50 p-3 text-xs font-medium leading-relaxed text-blue-900">
        Guide choices are active profiles with the administrator-managed Guide role. Workload counts show active tour groups and tourist assignments; guide schedules are not tracked here.
      </p>

      <AdminPanel title="Requests" subtitle={`${totalCount.toLocaleString()} total · page ${page} of ${pageCount}`}>
        <form
          className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-[minmax(14rem,1fr)_12rem_auto] sm:items-end"
          onSubmit={(event) => {
            event.preventDefault();
            setPage(1);
            setSearch(searchValue.trim());
          }}
        >
          <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
            Search requests
            <span className="relative mt-1 block">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                value={searchValue}
                onChange={(event) => setSearchValue(event.target.value)}
                placeholder="Tourist, guide, type, location, details"
                className={`${adminShell.input} w-full pl-9`}
              />
            </span>
          </label>
          <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
            Status
            <select
              value={status}
              onChange={(event) => {
                setStatus(event.target.value);
                setPage(1);
              }}
              className={`${adminShell.select} mt-1 w-full`}
            >
              <option value="All">All statuses</option>
              {STATUSES.map((value) => <option key={value}>{value}</option>)}
            </select>
          </label>
          <button type="submit" className={adminShell.btnPrimary}>Apply filters</button>
        </form>

        <AsyncState
          loading={loading}
          error={null}
          isEmpty={!loading && requests.length === 0}
          loadingFallback={<div className="rounded-2xl border border-zinc-200 bg-white p-8 text-center text-sm font-medium text-zinc-500">Loading requests…</div>}
          emptyFallback={<EmptyState icon={Compass} title="No assistance requests found" description="Try a different search or status filter." />}
        >
          <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white">
            <table className="w-full min-w-[1450px] border-collapse text-left">
              <thead className="bg-zinc-50">
                <tr>
                  {["Request / submitted", "Tourist", "Assistance / details", "Location", "Preferred time", "Group", "Status", "Assigned guide / availability", "Management"].map((heading) => (
                    <th key={heading} scope="col" className="px-3 py-3 text-[9px] font-black uppercase tracking-widest text-zinc-500">{heading}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {requests.map((item) => {
                  const canAssign = ["Pending", "Declined"].includes(item.status);
                  const canComplete = item.status === "Accepted";
                  const canCancel = ["Pending", "Assigned", "Accepted", "Declined"].includes(item.status);
                  const selectedGuide = guides.find((guide) => guide.id === guideSelection[item.id]);
                  const currentGuide = guides.find((guide) => guide.id === item.assigned_guide_id);
                  return (
                    <tr key={item.id} className="align-top text-sm text-zinc-700">
                      <td className="whitespace-nowrap px-3 py-3">
                        <p className="font-mono text-xs font-black text-zinc-900">{item.id.slice(0, 8).toUpperCase()}</p>
                        <p className="mt-1 text-[10px] text-zinc-500">{formatDate(item.created_at)}</p>
                      </td>
                      <td className="px-3 py-3">
                        <p className="font-bold text-zinc-900">{item.tourist?.full_name || "Tourist account unavailable"}</p>
                        {item.tourist?.email ? <p className="mt-1 text-xs text-zinc-500">{item.tourist.email}</p> : null}
                        {item.tourist?.phone ? <p className="mt-1 text-xs text-zinc-500">{item.tourist.phone}</p> : null}
                      </td>
                      <td className="max-w-[18rem] px-3 py-3">
                        <p className="font-bold text-zinc-900">{item.assistance_type}</p>
                        <p className="mt-1 whitespace-pre-wrap text-xs leading-relaxed text-zinc-600">{item.details || "No additional details."}</p>
                      </td>
                      <td className="max-w-[13rem] px-3 py-3">{item.location}</td>
                      <td className="whitespace-nowrap px-3 py-3 text-xs">{formatDate(item.preferred_at)}</td>
                      <td className="px-3 py-3">{item.tourist_count} tourist{item.tourist_count === 1 ? "" : "s"}</td>
                      <td className="px-3 py-3">
                        <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${STATUS_STYLES[item.status] || "bg-zinc-100 text-zinc-600"}`}>
                          {item.status}
                        </span>
                        {item.assigned_at ? <p className="mt-2 text-[10px] text-zinc-500">Assigned {formatDate(item.assigned_at)}</p> : null}
                        {item.responded_at ? <p className="mt-1 text-[10px] text-zinc-500">Responded {formatDate(item.responded_at)}</p> : null}
                      </td>
                      <td className="px-3 py-3">
                        {item.guide ? (
                          <>
                            <p className="font-bold text-zinc-900">{item.guide.full_name || "Guide account"}</p>
                            <p className="mt-1 text-xs text-zinc-500">{item.guide.email}</p>
                            {currentGuide ? (
                              <p className="mt-1 text-[10px] leading-relaxed text-zinc-500">
                                Workload: {currentGuide.activeTourGroups} active group(s), {currentGuide.activeTourists} active tourist(s)
                              </p>
                            ) : null}
                            {item.status === "Assigned" ? <p className="mt-2 text-[10px] font-bold text-blue-700">Awaiting guide response</p> : null}
                            {item.status === "Accepted" ? <p className="mt-2 text-[10px] font-bold text-green-700">Accepted</p> : null}
                          </>
                        ) : <p className="text-xs text-zinc-500">Not assigned</p>}
                        {item.assignmentHistory?.length > 0 ? (
                          <details className="mt-2 text-xs">
                            <summary className="cursor-pointer font-bold text-blue-700">
                              Assignment history ({item.assignmentHistory.length})
                            </summary>
                            <ul className="mt-2 space-y-1.5 border-l border-zinc-200 pl-3">
                              {item.assignmentHistory.map((assignment) => (
                                <li key={assignment.id}>
                                  <span className="font-bold text-zinc-800">
                                    {assignment.guide?.full_name || "Guide unavailable"} · {assignment.status}
                                  </span>
                                  <span className="block text-[10px] text-zinc-500">{formatDate(assignment.assigned_at)}</span>
                                </li>
                              ))}
                            </ul>
                          </details>
                        ) : null}
                        {canAssign ? (
                          <>
                            <select
                              value={guideSelection[item.id] || ""}
                              onChange={(event) => setGuideSelection((current) => ({ ...current, [item.id]: event.target.value }))}
                              className={`${adminShell.select} mt-2 w-full min-w-56`}
                            >
                              <option value="">Select an active guide</option>
                              {guides.map((guide) => (
                                <option key={guide.id} value={guide.id}>
                                  {guide.full_name || guide.email || "Guide"} · {guide.activeTourGroups} active groups · {guide.activeTourists} active tourists
                                </option>
                              ))}
                            </select>
                            {selectedGuide ? (
                              <p className="mt-1 text-[10px] leading-relaxed text-zinc-500">
                                Existing workload: {selectedGuide.activeTourGroups} active group(s), {selectedGuide.activeTourists} active tourist(s). Availability schedules are not tracked here.
                              </p>
                            ) : null}
                            {guides.length === 0 ? (
                              <p className="mt-1 text-[10px] font-semibold text-amber-800">No active administrator-designated guide profiles are available to assign.</p>
                            ) : null}
                          </>
                        ) : null}
                      </td>
                      <td className="min-w-52 px-3 py-3">
                        <div className="flex flex-col items-start gap-2">
                          {canAssign ? (
                            <button
                              type="button"
                              disabled={Boolean(busyId) || !guideSelection[item.id] || (item.status === "Declined" && guideSelection[item.id] === item.assigned_guide_id)}
                              onClick={() => saveAction(item, "assign")}
                              className={`${adminShell.btnPrimary} !px-3 !py-2 !text-[10px]`}
                            >
                              {busyId === item.id ? "Saving…" : item.status === "Declined" ? "Assign another guide" : "Assign selected guide"}
                            </button>
                          ) : null}
                          {canComplete ? (
                            <button type="button" disabled={Boolean(busyId)} onClick={() => saveAction(item, "status", "Completed")} className={`${adminShell.btnSuccess} !px-3 !py-2 !text-[10px]`}>
                              Mark completed
                            </button>
                          ) : null}
                          {canCancel ? (
                            <button type="button" disabled={Boolean(busyId)} onClick={() => saveAction(item, "status", "Cancelled")} className={`${adminShell.btnGhost} !border-red-200 !px-3 !py-2 !text-[10px] !text-red-700`}>
                              Cancel request
                            </button>
                          ) : null}
                          {!canAssign && !canComplete && !canCancel ? <span className="text-xs text-zinc-500">No further actions</span> : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </AsyncState>

        <ListPager page={page} pageCount={pageCount} onPage={setPage} disabled={loading} />
      </AdminPanel>
    </>
  );
}
