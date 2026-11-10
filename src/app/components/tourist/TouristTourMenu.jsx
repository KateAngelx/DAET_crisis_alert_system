"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Compass, MapPin, X } from "lucide-react";
import { useAuthStore, useCrisisStore } from "@/app/store/crisisStore";
import { useGuideStore } from "@/app/store/guideStore";
import { DestinationModal } from "@/app/components/tour/DestinationModal";
import { GuideAssistanceRequestForm } from "@/app/components/tourist/GuideAssistanceRequestForm";
import { formatTourDate, formatTourEndDateTime, formatTourRoute } from "@/lib/tourGroupRoute";
import { getActiveSession } from "@/lib/authSession";
import { portalShell } from "@/lib/designSystem";

const OPEN_REQUEST = new Set(["Pending", "Assigned", "Accepted"]);

function requestStatusClass(status) {
  if (status === "Accepted" || status === "Completed") return "bg-green-100 text-green-700";
  if (status === "Pending" || status === "Assigned") return "bg-orange-100 text-orange-700";
  if (status === "Declined" || status === "Cancelled") return "bg-zinc-100 text-zinc-600";
  return "bg-zinc-100 text-zinc-600";
}

function statusCopy(status) {
  if (status === "Pending") return "Waiting for the tourism office to assign a guide.";
  if (status === "Assigned") return "A guide was assigned. Their phone stays hidden until they accept.";
  if (status === "Accepted") return "Your guide accepted this request.";
  if (status === "Completed") return "This request is finished.";
  if (status === "Declined") return "The guide declined. The office can assign another guide.";
  if (status === "Cancelled") return "This request was cancelled.";
  return status;
}

export function TouristTourMenu({ children }) {
  const { user, isAuthenticated } = useAuthStore();
  const { alerts, fetchAlerts } = useCrisisStore();
  const {
    touristActiveGroup,
    pendingAssignment,
    fetchTouristActiveGroup,
    fetchPendingAssignmentForTourist,
    acceptAssignmentRequest,
    declineAssignmentRequest,
  } = useGuideStore();
  const [open, setOpen] = useState(false);
  const [destinationOpen, setDestinationOpen] = useState(false);
  const [requestOpen, setRequestOpen] = useState(false);
  const [assistance, setAssistance] = useState(null);
  const [requests, setRequests] = useState([]);
  const [busy, setBusy] = useState("");

  const loadAssistance = useCallback(async () => {
    if (!isAuthenticated || user?.role !== "tourist") return;
    const session = await getActiveSession();
    const headers = session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {};
    const response = await fetch("/api/tourist/guide-assistance", { cache: "no-store", headers });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) return;
    setAssistance(result.assistance || null);
    setRequests(Array.isArray(result.requests) ? result.requests : []);
  }, [isAuthenticated, user?.role]);

  useEffect(() => {
    if (!isAuthenticated || user?.role !== "tourist" || !user?.id) return;
    fetchTouristActiveGroup(user.id);
    fetchPendingAssignmentForTourist(user.id);
    loadAssistance();
  }, [
    isAuthenticated,
    user?.id,
    user?.role,
    fetchTouristActiveGroup,
    fetchPendingAssignmentForTourist,
    loadAssistance,
  ]);

  const group = touristActiveGroup?.tour_group;
  const guide = touristActiveGroup?.guide;
  const hasOpenRequest = requests.some((item) => OPEN_REQUEST.has(item.status));
  const visible = isAuthenticated && user?.role === "tourist" && (
    assistance?.enabled === true || Boolean(group) || requests.length > 0 || Boolean(pendingAssignment)
  );

  const respond = async (action) => {
    if (!pendingAssignment || !user?.id) return;
    setBusy(action);
    const result = action === "accept"
      ? await acceptAssignmentRequest(pendingAssignment.id, user.id)
      : await declineAssignmentRequest(pendingAssignment.id, user.id);
    setBusy("");
    if (result?.success) {
      await fetchTouristActiveGroup(user.id);
      await fetchPendingAssignmentForTourist(user.id);
    }
  };

  return (
    <>
      {children?.({
        visible,
        openTour: () => {
          setOpen(true);
          loadAssistance();
          if (user?.id) {
            fetchTouristActiveGroup(user.id);
            fetchPendingAssignmentForTourist(user.id);
          }
        },
      })}
      {open && typeof document !== "undefined" ? createPortal(
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center overflow-y-auto bg-black/50 px-3 pt-[max(0.75rem,env(safe-area-inset-top))] pb-[max(0.75rem,env(safe-area-inset-bottom))]"
          role="presentation"
          onClick={(event) => {
            if (event.target === event.currentTarget) setOpen(false);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="my-tour-title"
            className="flex w-full max-w-md flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-xl"
            style={{
              maxHeight: "calc(100dvh - env(safe-area-inset-top) - env(safe-area-inset-bottom) - 1.5rem)",
            }}
          >
            <div className="flex shrink-0 items-start justify-between gap-3 border-b border-zinc-100 bg-white px-5 py-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-purple-700">My tour</p>
                <h2 id="my-tour-title" className="mt-1 text-lg font-black text-zinc-900">
                  {group?.name || "Tourist guide"}
                </h2>
              </div>
              <button
                type="button"
                className="rounded-lg p-1 text-zinc-500 hover:bg-zinc-100"
                aria-label="Close tour"
                onClick={() => setOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="min-h-0 overflow-y-auto overscroll-contain px-5 pb-5">
            {pendingAssignment ? (
              <section className="mt-4">
                <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-zinc-400">Guide request</p>
                <ul className="overflow-hidden rounded-xl border border-blue-200 bg-white divide-y divide-blue-100">
                  <li className="flex flex-col gap-3 bg-blue-50/50 p-3">
                    <div className="min-w-0">
                      <p className="text-sm font-black text-zinc-900">
                        {pendingAssignment.guide?.full_name || "A guide"} invited you
                      </p>
                      <p className="mt-1 text-sm font-bold text-blue-700">
                        {formatTourRoute(pendingAssignment.tour_group)}
                      </p>
                      <p className="mt-1 text-xs font-medium text-zinc-500">
                        The guide’s phone appears here after you confirm.
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={Boolean(busy)}
                        className="rounded-xl bg-white px-3 py-2 text-[10px] font-black uppercase tracking-widest text-zinc-700 ring-1 ring-zinc-200 disabled:opacity-50"
                        onClick={() => respond("decline")}
                      >
                        {busy === "decline" ? "Saving…" : "Decline"}
                      </button>
                      <button
                        type="button"
                        disabled={Boolean(busy)}
                        className="rounded-xl bg-blue-600 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-white disabled:opacity-50"
                        onClick={() => respond("accept")}
                      >
                        {busy === "accept" ? "Saving…" : "Confirm guide"}
                      </button>
                    </div>
                  </li>
                </ul>
              </section>
            ) : null}

            {group ? (
              <section className="mt-4">
                <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-zinc-400">Current tour</p>
                <ul className="overflow-hidden rounded-xl border border-zinc-200 bg-white divide-y divide-zinc-100">
                  <li className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-sm font-black text-zinc-900">{group.name}</p>
                        <span className="rounded-full bg-green-100 px-2 py-0.5 text-[9px] font-black uppercase text-green-700">
                          In progress
                        </span>
                      </div>
                      <p className="mt-1 text-sm font-bold text-blue-700">{formatTourRoute(group)}</p>
                      {formatTourDate(group) ? (
                        <p className="mt-1 text-xs font-medium text-zinc-500">{formatTourDate(group)}</p>
                      ) : null}
                      {formatTourEndDateTime(group) ? (
                        <p className="mt-1 text-xs font-medium text-zinc-500">
                          Planned end: {formatTourEndDateTime(group)}
                        </p>
                      ) : null}
                      <p className="mt-1 text-xs font-medium text-zinc-600">
                        Guide: {guide?.full_name || "Pending"}
                        {guide?.phone ? ` · ${guide.phone}` : ""}
                      </p>
                      {group.meeting_location ? (
                        <p className="mt-1 text-xs font-medium text-zinc-500">Meet at {group.meeting_location}</p>
                      ) : null}
                    </div>
                    <button
                      type="button"
                      className={`shrink-0 ${portalShell.btnPrimary}`}
                      onClick={() => {
                        fetchAlerts();
                        setDestinationOpen(true);
                      }}
                    >
                      <MapPin size={14} /> View destination
                    </button>
                  </li>
                </ul>
              </section>
            ) : null}

            <section className="mt-5">
              <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Guide help requests</p>
              {requests.length === 0 ? (
                <p className="mt-2 text-sm font-medium text-zinc-500">You have no guide help requests yet.</p>
              ) : (
                <ul className="mt-2 overflow-hidden rounded-xl border border-zinc-200 bg-white divide-y divide-zinc-100">
                  {requests.map((item) => (
                    <li key={item.id} className="flex items-start justify-between gap-3 p-3">
                      <div className="min-w-0">
                        <p className="text-sm font-black text-zinc-900">{item.assistanceType}</p>
                        <p className="mt-1 truncate text-xs font-medium text-zinc-600">{item.location}</p>
                        <p className="mt-1 text-xs font-medium text-zinc-500">{statusCopy(item.status)}</p>
                        {item.guide ? (
                          <p className="mt-1 text-xs font-bold text-zinc-800">
                            {item.guide.fullName}
                            {item.guide.phone ? ` · ${item.guide.phone}` : ""}
                          </p>
                        ) : null}
                      </div>
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] font-black uppercase ${requestStatusClass(item.status)}`}>
                        {item.status}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              {assistance?.enabled === true && !hasOpenRequest ? (
                <button
                  type="button"
                  className="mt-3 inline-flex min-h-11 items-center justify-center rounded-xl bg-purple-700 px-4 py-2.5 text-sm font-black text-white hover:bg-purple-800"
                  onClick={() => setRequestOpen(true)}
                >
                  Request guide help
                </button>
              ) : null}
            </section>
            </div>
          </div>
        </div>,
        document.body
      ) : null}
      <DestinationModal
        open={destinationOpen}
        onClose={() => setDestinationOpen(false)}
        group={group}
        guide={guide}
        members={[{ id: user.id, tourist: { full_name: user.name, nationality: user.nationality } }]}
        alerts={alerts}
        editable={false}
      />
      {requestOpen && assistance?.enabled === true ? (
        <GuideAssistanceRequestForm
          assistance={assistance}
          onClose={() => setRequestOpen(false)}
          onSubmitted={() => {
            setRequestOpen(false);
            loadAssistance();
          }}
        />
      ) : null}
    </>
  );
}
