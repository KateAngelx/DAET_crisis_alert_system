"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Loader2, Send } from "lucide-react";
import { fetchWithFreshSession } from "@/lib/authSession";
import { CHECKIN_STATUS_TEXT } from "@/lib/alertCheckins";
import { AlertNamesListModal } from "@/app/components/admin/AlertNamesListModal";

const STATUS_TEXT = { sent: "Sent", delivered: "Delivered", pending: "Sending…", failed: "Failed" };
const STATUS_CLASS = {
  sent: "text-green-700",
  delivered: "text-green-700",
  pending: "text-zinc-500",
  failed: "text-red-700",
};

function Tile({ value, label, tone = "text-zinc-900" }) {
  return (
    <div className="rounded-xl bg-white p-2 text-center">
      <p className={`text-lg font-black ${tone}`}>{value}</p>
      <p className="text-[9px] font-bold uppercase text-zinc-500">{label}</p>
    </div>
  );
}

/** Delivery report for one alert, with "Resend SMS to non-responders". */
export function AlertDeliveryReport({ alertId }) {
  const [data, setData] = useState(null);
  const [namesOpen, setNamesOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState(null);

  const load = useCallback(async () => {
    try {
      const response = await fetchWithFreshSession(`/api/crisis/alerts/${alertId}/delivery`);
      const json = await response.json().catch(() => ({}));
      setData(response.ok ? json : { error: json.error || "Could not load the report." });
    } catch {
      setData({ error: "Could not load the report." });
    }
  }, [alertId]);

  useEffect(() => {
    load();
    const timer = setInterval(load, 30_000);
    return () => clearInterval(timer);
  }, [load]);

  const resend = async () => {
    setSending(true);
    setMessage(null);
    try {
      const response = await fetchWithFreshSession(`/api/crisis/alerts/${alertId}/delivery`, { method: "POST" });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(json.error || "Could not send reminders.");
      setMessage({
        ok: true,
        text: json.queued
          ? `Reminder SMS sent to ${json.queued} tourist${json.queued === 1 ? "" : "s"}.${json.skipped ? ` ${json.skipped} skipped (no number or SMS off).` : ""}`
          : json.message || "Nobody needed a reminder.",
      });
      await load();
    } catch (e) {
      setMessage({ ok: false, text: e.message });
    } finally {
      setSending(false);
    }
  };

  if (!data) {
    return <p className="flex items-center gap-2 text-xs text-zinc-500"><Loader2 size={12} className="animate-spin" /> Loading delivery report…</p>;
  }
  if (data.error) return <p className="text-xs font-bold text-red-700">{data.error}</p>;

  const s = data.summary;
  const tourists = (data.rows || []).filter((r) => r.role === "tourist");
  const guides = (data.rows || []).filter((r) => r.role === "guide");
  const isActive = data.alert?.status === "Active";
  const waitMin = Math.ceil((data.resendAvailableInMs || 0) / 60000);
  const label = data.alert?.checkin_requested ? "haven't answered" : "haven't opened it";

  return (
    <section className="space-y-3 rounded-2xl border border-zinc-200 bg-zinc-50 p-4" aria-label="Delivery report">
      <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600">
        Delivery report · {tourists.length} tourist{tourists.length === 1 ? "" : "s"}
        {guides.length ? ` · ${guides.length} guide${guides.length === 1 ? "" : "s"}` : ""}
      </p>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
        <Tile value={s.opened} label="Opened" tone="text-green-700" />
        <Tile value={s.smsSent} label="SMS sent" />
        <Tile value={s.smsFailed} label="SMS failed" tone={s.smsFailed ? "text-red-700" : "text-zinc-900"} />
        <Tile value={s.emailSent} label="Email sent" />
        <Tile value={s.reminded} label="Reminded" />
        <Tile value={s.noConfirmedContact} label="Not reached" tone={s.noConfirmedContact ? "text-red-700" : "text-zinc-900"} />
      </div>
      <p className="text-[11px] font-medium text-zinc-500">
        &ldquo;Not reached&rdquo; means no opened notice, no reply and no SMS or email confirmed as sent.
      </p>

      {isActive ? (
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={sending || !data.nonResponders || waitMin > 0}
            onClick={resend}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {sending ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
            Resend SMS to {data.nonResponders} who {label}
          </button>
          <span className="text-[11px] font-medium text-zinc-500">
            {waitMin > 0 ? `Available again in ${waitMin} min.` : `${data.nonRespondersWithPhone} of them have a phone number.`}
          </span>
        </div>
      ) : null}
      {message ? (
        <p role={message.ok ? "status" : "alert"} className={`text-xs font-bold ${message.ok ? "text-green-700" : "text-red-700"}`}>{message.text}</p>
      ) : null}

      {data.rows.length > 0 ? (
        <button
          type="button"
          onClick={() => setNamesOpen(true)}
          className="text-[10px] font-black uppercase text-blue-700 hover:underline"
        >
          View names ({data.rows.length})
        </button>
      ) : null}

      <AlertNamesListModal
        open={namesOpen}
        onClose={() => setNamesOpen(false)}
        title="Delivery report"
        subtitle={`${data.rows.length} recipient${data.rows.length === 1 ? "" : "s"}`}
      >
        <ul className="divide-y divide-zinc-100 text-xs">
          {data.rows.map((r) => (
            <li key={r.userId} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
              <span className="min-w-0">
                <span className="font-bold text-zinc-900">{r.name}</span>{" "}
                <span className="text-[9px] font-black uppercase text-zinc-400">{r.role}</span>
              </span>
              <span className="flex flex-wrap gap-2 text-[10px] font-bold">
                <span className={r.opened ? "text-green-700" : "text-zinc-400"}>{r.opened ? "Opened" : r.inApp ? "Not opened" : "No in-app"}</span>
                {r.sms ? <span className={STATUS_CLASS[r.sms]} title={r.smsError || ""}>SMS {STATUS_TEXT[r.sms]}</span> : null}
                {r.email ? <span className={STATUS_CLASS[r.email]}>Email {STATUS_TEXT[r.email]}</span> : null}
                {r.resent ? <span className={STATUS_CLASS[r.resent]}>Reminder {STATUS_TEXT[r.resent]}</span> : null}
                {r.reply ? <span className="text-blue-700">{CHECKIN_STATUS_TEXT[r.reply] || r.reply}</span> : null}
                {r.noConfirmedContact ? <span className="text-red-700">Not reached</span> : null}
              </span>
            </li>
          ))}
        </ul>
      </AlertNamesListModal>
    </section>
  );
}
