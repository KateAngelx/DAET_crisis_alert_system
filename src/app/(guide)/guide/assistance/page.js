"use client";

import React, { useCallback, useEffect, useState } from "react";
import { CheckCircle, Compass, RefreshCw, XCircle } from "lucide-react";
import { GuidePageHeader } from "@/app/components/guide/GuidePageHeader";
import { GuidePanel } from "@/app/components/guide/GuidePanel";
import { AsyncState, EmptyState } from "@/app/components/ui/AsyncState";
import { useConfirm } from "@/app/components/ui/ConfirmDialogProvider";
import { useAuthStore } from "@/app/store/crisisStore";
import { getActiveSession } from "@/lib/authSession";
import { guideShell } from "@/lib/designSystem";

function formatDate(value) {
  if (!value) return "Not specified";
  return new Date(value).toLocaleString();
}

export default function GuideAssistanceRequestsPage() {
  const { confirm } = useConfirm();
  const { user } = useAuthStore();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");

  const loadRequests = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const session = await getActiveSession();
      if (!session?.access_token) throw new Error("Your session expired. Please sign in again.");
      const response = await fetch("/api/guide/assistance", {
        headers: { Authorization: `Bearer ${session.access_token}` },
        cache: "no-store",
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Unable to load assistance assignments.");
      setRequests(result.requests || []);
    } catch (loadError) {
      setError(loadError.message || "Unable to load assistance assignments.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  const respond = async (item, action) => {
    const accepted = action === "accept";
    const confirmed = await confirm({
      title: accepted ? "Accept this assistance request?" : "Decline this assistance request?",
      description: accepted
        ? "The tourist and Tourism Office will be notified that you accepted."
        : "The tourist and Tourism Office will be notified. An administrator may select another guide.",
      confirmLabel: accepted ? "Accept request" : "Decline request",
      variant: accepted ? "success" : "warning",
    });
    if (!confirmed || busyId) return;

    setBusyId(item.id);
    setError("");
    setFeedback("");
    try {
      const session = await getActiveSession();
      if (!session?.access_token) throw new Error("Your session expired. Please sign in again.");
      const response = await fetch("/api/guide/assistance", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ requestId: item.id, action }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Unable to respond to this request.");
      const warnings = result.notificationWarnings || [];
      setFeedback(warnings.length
        ? `Your response was recorded. Notification warning: ${warnings.join("; ")}`
        : accepted
          ? "Request accepted. The tourist and Tourism Office have been notified."
          : "Request declined. The tourist and Tourism Office have been notified.");
      await loadRequests();
    } catch (actionError) {
      setError(actionError.message || "Unable to respond to this request.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <>
      <GuidePageHeader
        title="Guide Assistance Requests"
        description={`Requests selected for ${user?.name || "you"} by the Tourism Office. Only an administrator can assign guides.`}
        action={
          <button type="button" onClick={loadRequests} disabled={loading} className={guideShell.btnGhost}>
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh
          </button>
        }
      />
      {error ? <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-800">{error}</p> : null}
      {feedback ? <p role="status" className="rounded-xl border border-green-200 bg-green-50 p-3 text-sm font-bold text-green-800">{feedback}</p> : null}

      <GuidePanel title="Guide Assistance Requests" subtitle={`${requests.length} current assignment(s)`}>
        <AsyncState
          loading={loading}
          error={null}
          isEmpty={!loading && requests.length === 0}
          loadingFallback={<div className="rounded-xl border border-zinc-200 p-8 text-center text-sm text-zinc-500">Loading assigned requests…</div>}
          emptyFallback={<EmptyState icon={Compass} title="No assigned requests" description="When the Tourism Office selects you for a request, it will appear here." />}
        >
          <div className="grid gap-3 lg:grid-cols-2">
            {requests.map((item) => (
              <article key={item.id} className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-purple-700">{item.assistance_type}</p>
                    <h2 className="mt-1 text-base font-black text-zinc-900">{item.location}</h2>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${item.status === "Accepted" ? "bg-green-100 text-green-800" : "bg-blue-100 text-blue-800"}`}>
                    {item.status}
                  </span>
                </div>
                <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <dt className="text-[9px] font-black uppercase tracking-widest text-zinc-400">Tourist</dt>
                    <dd className="mt-1 font-bold text-zinc-800">{item.tourist?.full_name || "Tourist"}</dd>
                  </div>
                  {item.status === "Accepted" && (item.tourist?.email || item.tourist?.phone) ? (
                    <div className="col-span-2 rounded-xl border border-green-200 bg-green-50 p-3">
                      <dt className="text-[9px] font-black uppercase tracking-widest text-green-800">Tourist contact</dt>
                      {item.tourist.email ? (
                        <dd className="mt-1 text-sm font-semibold text-green-900">
                          <a href={`mailto:${item.tourist.email}`} className="underline">{item.tourist.email}</a>
                        </dd>
                      ) : null}
                      {item.tourist.phone ? (
                        <dd className="mt-1 text-sm font-semibold text-green-900">
                          <a href={`tel:${item.tourist.phone}`} className="underline">{item.tourist.phone}</a>
                        </dd>
                      ) : null}
                    </div>
                  ) : null}
                  <div>
                    <dt className="text-[9px] font-black uppercase tracking-widest text-zinc-400">Group size</dt>
                    <dd className="mt-1 font-bold text-zinc-800">{item.tourist_count} tourist{item.tourist_count === 1 ? "" : "s"}</dd>
                  </div>
                  <div className="col-span-2">
                    <dt className="text-[9px] font-black uppercase tracking-widest text-zinc-400">Preferred date and time</dt>
                    <dd className="mt-1 font-medium text-zinc-700">{formatDate(item.preferred_at)}</dd>
                  </div>
                  {item.details ? (
                    <div className="col-span-2">
                      <dt className="text-[9px] font-black uppercase tracking-widest text-zinc-400">Additional details</dt>
                      <dd className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-zinc-700">{item.details}</dd>
                    </div>
                  ) : null}
                </dl>
                {item.status === "Assigned" ? (
                  <div className="mt-5 flex flex-col gap-2 sm:flex-row">
                    <button
                      type="button"
                      disabled={Boolean(busyId)}
                      onClick={() => respond(item, "accept")}
                      className={`${guideShell.btnGuide} flex-1 justify-center`}
                    >
                      <CheckCircle size={15} /> Accept
                    </button>
                    <button
                      type="button"
                      disabled={Boolean(busyId)}
                      onClick={() => respond(item, "decline")}
                      className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-4 py-2.5 text-xs font-black uppercase tracking-widest text-red-700 hover:bg-red-50 disabled:opacity-50"
                    >
                      <XCircle size={15} /> Decline
                    </button>
                  </div>
                ) : (
                  <p className="mt-5 rounded-xl bg-green-50 p-3 text-xs font-semibold text-green-800">
                    You accepted this request. The Tourism Office will coordinate the assistance details.
                  </p>
                )}
              </article>
            ))}
          </div>
        </AsyncState>
      </GuidePanel>
    </>
  );
}
