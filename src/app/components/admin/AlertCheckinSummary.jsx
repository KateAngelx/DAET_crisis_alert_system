"use client";

import React, { useCallback, useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Loader2, Phone } from "lucide-react";
import { fetchWithFreshSession } from "@/lib/authSession";
import { CHECKIN_BADGE, CHECKIN_STATUS_TEXT } from "@/lib/alertCheckins";
import { AlertNamesListModal } from "@/app/components/admin/AlertNamesListModal";

function formatTime(value) {
  return value ? new Date(value).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "";
}

const COUNT_ROWS = [
  ["safe", "Safe", "text-green-700"],
  ["evacuated", "Evacuated", "text-blue-700"],
  ["need_help", "Need help", "text-red-700"],
  ["missing", "Missing", "text-red-700"],
  ["noReply", "No reply yet", "text-zinc-600"],
];

function RoleFraction({ role, count, total, className = "" }) {
  if (!total) return <p className={`text-[8px] font-bold uppercase text-zinc-400 ${className}`}>{role} —</p>;
  return (
    <p className={`text-[8px] font-bold uppercase text-zinc-600 ${className}`}>
      {role} {count}/{total}
    </p>
  );
}

/** Live check-in counts; names open in a separate modal. */
export function AlertCheckinSummary({ alertId }) {
  const [data, setData] = useState(null);
  const [busyUser, setBusyUser] = useState(null);
  const [namesModal, setNamesModal] = useState(null);

  const load = useCallback(async () => {
    try {
      const response = await fetchWithFreshSession(`/api/crisis/alerts/checkins?alertId=${alertId}`);
      setData(await response.json());
    } catch {
      setData({ available: true, error: "Could not load check-ins." });
    }
  }, [alertId]);

  useEffect(() => {
    load();
    const timer = setInterval(load, 30_000);
    return () => clearInterval(timer);
  }, [load]);

  if (!data) {
    return <p className="flex items-center gap-2 text-xs text-zinc-500"><Loader2 size={12} className="animate-spin" /> Loading check-ins…</p>;
  }
  if (data.available === false) return null;
  if (data.error) return <p className="text-xs font-bold text-red-700">{data.error}</p>;

  const setHandled = async (userId, handled) => {
    setBusyUser(userId);
    try {
      await fetchWithFreshSession("/api/crisis/alerts/checkins", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ alertId, userId, handled }),
      });
      await load();
    } finally {
      setBusyUser(null);
    }
  };

  const { summary, byStatus = {}, reached, audience } = data;
  const touristTotal = audience?.tourist?.reached ?? reached ?? 0;
  const guideTotal = audience?.guide?.reached ?? 0;
  const guideOpened = audience?.guide?.opened ?? 0;
  const guideNoOpen = Math.max(0, guideTotal - guideOpened);
  const unhandledUrgent = (byStatus.need_help || []).filter((p) => !p.handledAt).length
    + (byStatus.missing || []).filter((p) => !p.handledAt).length;

  const renderPersonList = (people, { showActions = false } = {}) => {
    if (!people?.length) {
      return <p className="px-3 py-4 text-xs font-medium text-zinc-500">No names in this group.</p>;
    }
    return (
      <ul className="divide-y divide-zinc-100">
        {people.map((p) => (
          <li key={p.userId} className={`px-3 py-2 ${p.handledAt && showActions ? "opacity-75" : ""}`}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="flex flex-wrap items-center gap-1.5 font-bold text-zinc-900">
                  {showActions && !p.handledAt ? <AlertTriangle size={14} className="text-red-600" /> : null}
                  {showActions && p.handledAt ? <CheckCircle2 size={14} className="text-green-600" /> : null}
                  {p.name}
                  <span className={`rounded px-1.5 py-0.5 text-[9px] font-black uppercase ${CHECKIN_BADGE[p.status]}`}>
                    {CHECKIN_STATUS_TEXT[p.status]}
                  </span>
                </p>
                <p className="text-[11px] text-zinc-500">
                  {formatTime(p.updatedAt)}{p.reportedBy ? ` · reported by guide ${p.reportedBy}` : " · own reply"}
                </p>
                {p.note ? <p className="mt-1 text-sm text-zinc-700">&ldquo;{p.note}&rdquo;</p> : null}
              </div>
              {showActions ? (
                <div className="flex shrink-0 gap-2">
                  {p.phone ? (
                    <a href={`tel:${p.phone}`} className="inline-flex items-center gap-1 rounded-lg border border-blue-200 px-2.5 py-1.5 text-[10px] font-black uppercase text-blue-700">
                      <Phone size={11} /> Call
                    </a>
                  ) : null}
                  <button
                    type="button"
                    disabled={busyUser === p.userId}
                    onClick={() => setHandled(p.userId, !p.handledAt)}
                    className="rounded-lg border border-zinc-200 px-2.5 py-1.5 text-[10px] font-black uppercase text-zinc-700 disabled:opacity-50"
                  >
                    {p.handledAt ? "Reopen" : "Mark handled"}
                  </button>
                </div>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    );
  };

  const openNames = (key) => {
    if (key === "noReply") return;
    const people = byStatus[key];
    if (!people?.length) return;
    setNamesModal({
      key,
      title: CHECKIN_STATUS_TEXT[key] || key,
      subtitle: `${people.length} tourist${people.length === 1 ? "" : "s"}`,
      people,
      showActions: key === "need_help" || key === "missing",
    });
  };

  return (
    <>
      <section className="space-y-3 rounded-2xl border border-blue-200 bg-blue-50/40 p-4" aria-label="Check-ins">
        <p className="text-[10px] font-black uppercase tracking-widest text-blue-700">
          Check-ins · Tourists {summary.replied}/{touristTotal} replied
          {guideTotal ? ` · Guides ${guideOpened}/${guideTotal} opened` : ""}
          {unhandledUrgent > 0 ? ` · ${unhandledUrgent} need action` : ""}
        </p>
        <div className="grid grid-cols-5 gap-2 text-center">
          {COUNT_ROWS.map(([key, label, color]) => {
            const touristCount = key === "noReply" ? summary.noReply : summary[key];
            const guideCount = key === "noReply" ? guideNoOpen : 0;
            const canViewNames = key !== "noReply" && touristCount > 0;
            return (
              <div key={key} className="rounded-xl bg-white p-2">
                <p className={`text-lg font-black ${color}`}>{touristCount}</p>
                <p className="text-[9px] font-bold uppercase text-zinc-500">{label}</p>
                <RoleFraction role="Tourists" count={touristCount} total={touristTotal} className="mt-1" />
                <RoleFraction role="Guides" count={guideCount} total={guideTotal} />
                {canViewNames ? (
                  <button
                    type="button"
                    onClick={() => openNames(key)}
                    className="mt-1 text-[8px] font-black uppercase text-blue-700 hover:underline"
                  >
                    View names
                  </button>
                ) : null}
              </div>
            );
          })}
        </div>
        {summary.noReply > 0 ? (
          <p className="text-[11px] font-medium text-zinc-600">
            {summary.noReply} tourist{summary.noReply === 1 ? "" : "s"} with no check-in yet
            {guideNoOpen > 0 ? `; ${guideNoOpen} guide${guideNoOpen === 1 ? "" : "s"} have not opened the alert` : ""}.
            Full list is in the delivery report.
          </p>
        ) : null}
      </section>

      <AlertNamesListModal
        open={Boolean(namesModal)}
        onClose={() => setNamesModal(null)}
        title={namesModal?.title || "Names"}
        subtitle={namesModal?.subtitle}
      >
        {namesModal ? renderPersonList(namesModal.people, { showActions: namesModal.showActions }) : null}
      </AlertNamesListModal>
    </>
  );
}