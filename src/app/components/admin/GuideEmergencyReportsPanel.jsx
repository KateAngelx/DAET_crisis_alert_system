"use client";

import React, { useCallback, useEffect, useState } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { getActiveSession } from "@/lib/authSession";
import { useConfirm } from "@/app/components/ui/ConfirmDialogProvider";

const STATUSES = ["All", "New", "Acknowledged", "Responding", "Resolved", "Closed"];
const TRANSITIONS = {
  New: ["Acknowledged", "Responding", "Resolved"],
  Acknowledged: ["Responding", "Resolved"],
  Responding: ["Resolved"],
  Resolved: ["Closed"],
  Closed: [],
};
const PAGE_SIZE = 50;

function formatDate(value) {
  return value ? new Date(value).toLocaleString() : "—";
}

export function GuideEmergencyReportsPanel() {
  const { confirm } = useConfirm();
  const [reports, setReports] = useState([]);
  const [status, setStatus] = useState("All");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [nextStatus, setNextStatus] = useState({});
  const [notes, setNotes] = useState({});
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const session = await getActiveSession();
      if (!session?.access_token) throw new Error("Your administrator session expired.");
      const params = new URLSearchParams({ page: String(page), status, search });
      const response = await fetch(`/api/admin/guide-emergency-reports?${params}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
        cache: "no-store",
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Unable to load guide emergency reports.");
      setReports(result.reports || []);
      setTotalCount(result.totalCount || 0);
    } catch (loadError) {
      setError(loadError.message || "Unable to load guide emergency reports.");
    } finally {
      setLoading(false);
    }
  }, [page, search, status]);

  useEffect(() => {
    const timer = setTimeout(load, 250);
    return () => clearTimeout(timer);
  }, [load]);

  const updateStatus = async (report) => {
    const selectedStatus = nextStatus[report.id];
    if (!selectedStatus || busyId) return;
    const accepted = await confirm({
      title: `Update ${report.reference_number}?`,
      description: `Change status from ${report.status} to ${selectedStatus}. This action will be recorded in the audit history.`,
      confirmLabel: "Update emergency status",
      variant: selectedStatus === "Resolved" || selectedStatus === "Closed" ? "success" : "warning",
    });
    if (!accepted) return;

    setBusyId(report.id);
    setError("");
    setMessage("");
    try {
      const session = await getActiveSession();
      if (!session?.access_token) throw new Error("Your administrator session expired.");
      const response = await fetch("/api/admin/guide-emergency-reports", {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ reportId: report.id, status: selectedStatus, note: notes[report.id] || null }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Unable to update emergency status.");
      const warnings = result.notificationWarnings || [];
      setNextStatus((current) => {
        const updated = { ...current };
        delete updated[report.id];
        return updated;
      });
      setMessage(warnings.length
        ? `Status saved. Guide notification warning: ${warnings.join("; ")}`
        : "Emergency status updated and the guide notified.");
      await load();
    } catch (updateError) {
      setError(updateError.message || "Unable to update emergency status.");
    } finally {
      setBusyId(null);
    }
  };

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  return (
    <section className="rounded-2xl border-2 border-red-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-red-100 bg-red-50/70 px-4 py-4 sm:px-5">
        <div className="flex items-center gap-3">
          <span className="rounded-xl bg-red-700 p-2 text-white"><AlertTriangle size={20} /></span>
          <div>
            <h2 className="text-lg font-black text-zinc-950">Guide Emergency Reports</h2>
            <p className="text-xs font-medium text-zinc-600">Urgent reports submitted directly by active guides.</p>
          </div>
        </div>
        <button type="button" onClick={load} disabled={loading} className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs font-bold text-zinc-700 disabled:opacity-50">
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh
        </button>
      </div>

      <div className="space-y-4 p-4 sm:p-5">
        {error ? <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-800">{error}</p> : null}
        {message ? <p role="status" className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm font-bold text-green-800">{message}</p> : null}

        <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
          <input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Search reference, type, location, or description" className="rounded-lg border border-zinc-200 p-2.5 text-sm" />
          <select aria-label="Filter emergency reports by status" value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }} className="rounded-lg border border-zinc-200 bg-white p-2.5 text-sm font-semibold">
            {STATUSES.map((item) => <option key={item}>{item}</option>)}
          </select>
        </div>

        {loading ? <p className="py-8 text-center text-sm font-semibold text-zinc-500">Loading emergency reports…</p> : null}
        {!loading && reports.length === 0 ? <p className="rounded-xl border border-dashed border-zinc-200 p-8 text-center text-sm font-semibold text-zinc-500">No guide emergency reports found.</p> : null}

        <div className="space-y-4">
          {reports.map((report) => {
            const allowedTransitions = TRANSITIONS[report.status] || [];
            const history = report.history || [];
            return (
              <article key={report.id} className="rounded-xl border border-zinc-200 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-black uppercase tracking-wider text-red-800">{report.reference_number} · {report.emergency_type}</p>
                    <p className="mt-1 flex items-center gap-1 text-sm font-bold text-zinc-900"><span>{report.location}</span></p>
                    <p className="mt-1 text-xs text-zinc-500">Submitted {formatDate(report.submitted_at)} by {report.guide?.full_name || "Guide"}{report.guide?.phone ? ` · ${report.guide.phone}` : ""}{report.guide?.email ? ` · ${report.guide.email}` : ""}</p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-black ${report.status === "New" ? "bg-red-100 text-red-800" : report.status === "Resolved" || report.status === "Closed" ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-900"}`}>{report.status}</span>
                </div>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-zinc-800">{report.description}</p>
                {report.affected_tourists || report.affected_info ? (
                  <p className="mt-2 rounded-lg bg-zinc-50 p-2.5 text-xs text-zinc-700">
                    {report.affected_tourists ? `${report.affected_tourists} affected tourist(s). ` : ""}
                    {report.affected_info || ""}
                  </p>
                ) : null}
                {report.latitude != null && report.longitude != null ? (
                  <a className="mt-2 inline-block text-xs font-bold text-blue-700 underline" target="_blank" rel="noreferrer" href={`https://www.google.com/maps?q=${report.latitude},${report.longitude}`}>
                    Open device coordinates in map
                  </a>
                ) : null}

                <div className="mt-4 grid gap-2 border-t border-zinc-100 pt-3 sm:grid-cols-[1fr_2fr_auto]">
                  <select
                    aria-label={`Next status for ${report.reference_number}`}
                    value={nextStatus[report.id] || ""}
                    onChange={(event) => setNextStatus((current) => ({ ...current, [report.id]: event.target.value }))}
                    disabled={allowedTransitions.length === 0}
                    className="rounded-lg border border-zinc-200 bg-white p-2 text-sm"
                  >
                    <option value="">{allowedTransitions.length ? "Select next status" : "No further status changes"}</option>
                    {allowedTransitions.map((item) => <option key={item}>{item}</option>)}
                  </select>
                  <input maxLength={1000} value={notes[report.id] || ""} onChange={(event) => setNotes((current) => ({ ...current, [report.id]: event.target.value }))} placeholder="Optional response note (saved to audit history)" className="rounded-lg border border-zinc-200 p-2 text-sm" />
                  <button type="button" disabled={!nextStatus[report.id] || busyId === report.id} onClick={() => updateStatus(report)} className="rounded-lg bg-zinc-900 px-4 py-2 text-xs font-black text-white disabled:opacity-40">
                    {busyId === report.id ? "Saving…" : "Update status"}
                  </button>
                </div>

                <details className="mt-3">
                  <summary className="cursor-pointer text-xs font-bold text-zinc-600">Audit history ({history.length})</summary>
                  <ol className="mt-2 space-y-2 border-l-2 border-zinc-200 pl-3">
                    {history.map((event) => (
                      <li key={event.id} className="text-xs text-zinc-700">
                        <span className="font-bold">{event.old_status ? `${event.old_status} → ` : ""}{event.new_status}</span>
                        <span className="ml-2 text-zinc-500">{formatDate(event.changed_at)} · {event.actor?.full_name || "System"}</span>
                        {event.note ? <p className="mt-0.5">{event.note}</p> : null}
                      </li>
                    ))}
                  </ol>
                </details>
              </article>
            );
          })}
        </div>

        {totalCount > PAGE_SIZE ? (
          <div className="flex items-center justify-between border-t border-zinc-100 pt-3 text-sm">
            <span className="text-zinc-500">{totalCount} emergency report(s) · Page {page} of {totalPages}</span>
            <div className="flex gap-2">
              <button type="button" disabled={page <= 1 || loading} onClick={() => setPage((value) => value - 1)} className="rounded-lg border px-3 py-1.5 disabled:opacity-40">Previous</button>
              <button type="button" disabled={page >= totalPages || loading} onClick={() => setPage((value) => value + 1)} className="rounded-lg border px-3 py-1.5 disabled:opacity-40">Next</button>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
