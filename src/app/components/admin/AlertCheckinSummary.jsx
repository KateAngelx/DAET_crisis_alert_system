"use client";

import React, { useCallback, useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Loader2, Phone } from "lucide-react";
import { fetchWithFreshSession } from "@/lib/authSession";
import { CHECKIN_BADGE, CHECKIN_STATUS_TEXT } from "@/lib/alertCheckins";

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

/** Live check-in counts and the people who need help, for one alert. */
export function AlertCheckinSummary({ alertId }) {
  const [data, setData] = useState(null);
  const [busyUser, setBusyUser] = useState(null);

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

  const { summary, urgent = [], reached } = data;
  return (
    <section className="space-y-3 rounded-2xl border border-blue-200 bg-blue-50/40 p-4" aria-label="Check-ins">
      <p className="text-[10px] font-black uppercase tracking-widest text-blue-700">
        Check-ins · {summary.replied} of {reached} tourists replied
      </p>
      <div className="grid grid-cols-5 gap-2 text-center">
        {COUNT_ROWS.map(([key, label, color]) => (
          <div key={key} className="rounded-xl bg-white p-2">
            <p className={`text-lg font-black ${color}`}>{summary[key]}</p>
            <p className="text-[9px] font-bold uppercase text-zinc-500">{label}</p>
          </div>
        ))}
      </div>

      {urgent.length ? (
        <ul className="space-y-2">
          {urgent.map((p) => (
            <li key={p.userId} className={`rounded-xl border bg-white p-3 ${p.handledAt ? "border-zinc-200 opacity-70" : "border-red-200"}`}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="flex items-center gap-1.5 font-bold text-zinc-900">
                    {p.handledAt ? <CheckCircle2 size={14} className="text-green-600" /> : <AlertTriangle size={14} className="text-red-600" />}
                    {p.name}
                    <span className={`rounded px-1.5 py-0.5 text-[9px] font-black uppercase ${CHECKIN_BADGE[p.status]}`}>{CHECKIN_STATUS_TEXT[p.status]}</span>
                  </p>
                  <p className="text-[11px] text-zinc-500">
                    {formatTime(p.updatedAt)}{p.reportedBy ? ` · reported by guide ${p.reportedBy}` : " · own reply"}
                  </p>
                  {p.note ? <p className="mt-1 text-sm text-zinc-700">&ldquo;{p.note}&rdquo;</p> : null}
                </div>
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
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs font-medium text-zinc-600">Nobody has asked for help.</p>
      )}
    </section>
  );
}
