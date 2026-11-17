"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, CheckCircle2, Home, Loader2 } from "lucide-react";
import { useAuthStore } from "@/app/store/crisisStore";
import { fetchWithFreshSession } from "@/lib/authSession";
import { CHECKIN_LABELS, CHECKIN_NOTE_MAX, alertAcceptsCheckins } from "@/lib/alertCheckins";

const BUTTONS = [
  { status: "safe", Icon: CheckCircle2, className: "border-green-200 bg-green-50 text-green-800 hover:bg-green-100", active: "ring-2 ring-green-500" },
  { status: "need_help", Icon: AlertTriangle, className: "border-red-200 bg-red-50 text-red-800 hover:bg-red-100", active: "ring-2 ring-red-500" },
  { status: "evacuated", Icon: Home, className: "border-blue-200 bg-blue-50 text-blue-800 hover:bg-blue-100", active: "ring-2 ring-blue-500" },
];

const CONFIRMATION = {
  safe: "Thank you. The Tourism Office knows you are safe.",
  need_help: "Help request sent. The Tourism Office and your guide were alerted. If you are in immediate danger, call 911 now.",
  evacuated: "Thank you. The Tourism Office knows you have evacuated.",
};

function formatTime(value) {
  return value ? new Date(value).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" }) : "";
}

/** "I'm safe / I need help / Evacuated" on an alert that asks tourists to check in. */
export function AlertCheckinPanel({ alert }) {
  const { user, isAuthenticated } = useAuthStore();
  const isTourist = isAuthenticated && user?.role === "tourist";
  const alertId = alert?.id;
  // A plain true/false, so the effect below does not re-run every time the alert list refreshes.
  const acceptsCheckins = alertAcceptsCheckins(alert);
  const [state, setState] = useState({ alertId: null, checkin: null, available: true });
  const [choice, setChoice] = useState(null);
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    if (!isTourist || !alertId || !acceptsCheckins) return undefined;
    let cancelled = false;
    fetchWithFreshSession(`/api/crisis/alerts/checkin?alertId=${alertId}`)
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) setState({ alertId, checkin: data?.checkin || null, available: data?.available !== false });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [isTourist, alertId, acceptsCheckins]);

  if (!alertAcceptsCheckins(alert)) return null;

  if (!isTourist) {
    return (
      <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm font-medium text-blue-900">
        The Tourism Office is asking tourists to check in.{" "}
        {isAuthenticated ? null : (
          <Link href="/login" className="font-black underline">Sign in</Link>
        )}{" "}
        {isAuthenticated ? "Check-ins are for tourist accounts." : "to tell them you are safe or need help. In an emergency, call 911."}
      </div>
    );
  }

  const current = state.alertId === alertId ? state.checkin : null;
  if (state.alertId === alertId && !state.available) return null;

  const send = async (status) => {
    setSending(true);
    setMessage(null);
    try {
      const response = await fetchWithFreshSession("/api/crisis/alerts/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ alertId, status, note: status === "need_help" ? note : "" }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Could not send your answer.");
      setState({ alertId, checkin: data.checkin, available: true });
      setChoice(null);
      setNote("");
      setMessage({ type: status === "need_help" ? "urgent" : "ok", text: CONFIRMATION[status] });
    } catch (error) {
      setMessage({ type: "error", text: `${error.message} If you need help now, call 911.` });
    } finally {
      setSending(false);
    }
  };

  return (
    <section className="rounded-2xl border-2 border-blue-200 bg-white p-4" aria-label="Check in">
      <p className="text-xs font-black uppercase tracking-widest text-blue-700">Are you safe?</p>
      <p className="mt-1 text-sm font-medium text-zinc-600">
        {current
          ? `You answered "${CHECKIN_LABELS[current.status] || current.status}" at ${formatTime(current.updated_at)}. You can change it.`
          : "Let the Daet Tourism Office know how you are."}
      </p>
      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
        {BUTTONS.map(({ status, Icon, className, active }) => (
          <button
            key={status}
            type="button"
            disabled={sending}
            onClick={() => (status === "need_help" ? setChoice("need_help") : send(status))}
            className={`flex min-h-12 items-center justify-center gap-2 rounded-xl border px-3 py-2 text-xs font-black uppercase tracking-wide disabled:opacity-50 ${className} ${current?.status === status ? active : ""}`}
          >
            <Icon size={16} /> {CHECKIN_LABELS[status]}
          </button>
        ))}
      </div>

      {choice === "need_help" ? (
        <div className="mt-3 space-y-2">
          <label htmlFor="checkin-note" className="block text-[10px] font-black uppercase tracking-widest text-zinc-500">
            Where are you and what help do you need? (optional)
          </label>
          <textarea
            id="checkin-note"
            rows={2}
            maxLength={CHECKIN_NOTE_MAX}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="w-full rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-sm outline-none focus:ring-2 focus:ring-red-500"
          />
          <div className="flex flex-wrap gap-2">
            <button type="button" disabled={sending} onClick={() => send("need_help")}
              className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-white hover:bg-red-700 disabled:opacity-50">
              {sending ? <Loader2 size={12} className="animate-spin" /> : <AlertTriangle size={12} />} Send help request
            </button>
            <a href="tel:911" className="inline-flex items-center rounded-xl border border-red-200 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-red-700">
              Call 911
            </a>
            <button type="button" onClick={() => setChoice(null)} className="px-2 text-[10px] font-black uppercase text-zinc-500">Cancel</button>
          </div>
        </div>
      ) : null}

      {message ? (
        <p role={message.type === "ok" ? "status" : "alert"}
          className={`mt-3 text-sm font-bold ${message.type === "ok" ? "text-green-700" : "text-red-700"}`}>
          {message.text}
        </p>
      ) : null}
    </section>
  );
}
