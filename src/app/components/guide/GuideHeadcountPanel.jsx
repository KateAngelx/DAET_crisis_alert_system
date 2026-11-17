"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ClipboardCheck, Loader2, Phone } from "lucide-react";
import { fetchWithFreshSession } from "@/lib/authSession";
import {
  CHECKIN_BADGE,
  CHECKIN_STATUS_TEXT,
  GUIDE_CHECKIN_STATUSES,
  alertAcceptsCheckins,
} from "@/lib/alertCheckins";

const BUTTON_STYLE = {
  safe: "border-green-200 text-green-700 hover:bg-green-50",
  evacuated: "border-blue-200 text-blue-700 hover:bg-blue-50",
  need_help: "border-red-200 text-red-700 hover:bg-red-50",
  missing: "border-red-300 text-red-800 hover:bg-red-50",
};

/** Guides account for every tourist in their active groups during an alert that asks for check-ins. */
export function GuideHeadcountPanel({ alerts = [] }) {
  const checkinAlerts = useMemo(() => alerts.filter(alertAcceptsCheckins), [alerts]);
  const [alertId, setAlertId] = useState(null);
  const selectedId = checkinAlerts.some((a) => a.id === alertId) ? alertId : checkinAlerts[0]?.id || null;
  const [data, setData] = useState({ alertId: null, tourists: [], available: true, loading: false });
  const [savingKey, setSavingKey] = useState(null);
  const [error, setError] = useState("");

  const load = useCallback(async (id) => {
    if (!id) return;
    setData((d) => ({ ...d, loading: true }));
    try {
      const response = await fetchWithFreshSession(`/api/guide/headcount?alertId=${id}`);
      const json = await response.json();
      setData({ alertId: id, tourists: json.tourists || [], available: json.available !== false, loading: false });
    } catch {
      setData({ alertId: id, tourists: [], available: true, loading: false });
      setError("Could not load your tourists. Try again.");
    }
  }, []);

  useEffect(() => {
    if (!selectedId) return undefined;
    load(selectedId);
    const timer = setInterval(() => load(selectedId), 60_000); // pick up tourists' own replies
    return () => clearInterval(timer);
  }, [selectedId, load]);

  if (!checkinAlerts.length || (data.alertId === selectedId && !data.available)) return null;

  const tourists = data.alertId === selectedId ? data.tourists : [];
  const accounted = tourists.filter((t) => t.checkin && t.checkin.status !== "missing" && t.checkin.status !== "need_help").length;

  const mark = async (touristId, status) => {
    setSavingKey(`${touristId}:${status}`);
    setError("");
    try {
      const response = await fetchWithFreshSession("/api/guide/headcount", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ alertId: selectedId, touristId, status }),
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(json.error || "Could not save.");
      setData((d) => ({
        ...d,
        tourists: d.tourists.map((t) => (t.touristId === touristId ? { ...t, checkin: json.checkin } : t)),
      }));
    } catch (e) {
      setError(e.message);
    } finally {
      setSavingKey(null);
    }
  };

  return (
    <section className="rounded-2xl border-2 border-blue-200 bg-white p-4 sm:p-5" aria-label="Tourist headcount">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-blue-700">
            <ClipboardCheck size={14} /> Headcount
          </p>
          <p className="mt-1 text-sm font-medium text-zinc-600">
            Account for every tourist in your active groups. &ldquo;Needs help&rdquo; and &ldquo;Missing&rdquo; alert the Tourism Office at once.
          </p>
        </div>
        {checkinAlerts.length > 1 ? (
          <select
            aria-label="Alert"
            className="rounded-xl border border-zinc-200 bg-zinc-50 p-2 text-xs font-bold"
            value={selectedId || ""}
            onChange={(e) => setAlertId(e.target.value)}
          >
            {checkinAlerts.map((a) => <option key={a.id} value={a.id}>{a.title}</option>)}
          </select>
        ) : (
          <p className="text-xs font-black text-zinc-800">{checkinAlerts[0].title}</p>
        )}
      </div>

      {data.loading && !tourists.length ? (
        <p className="mt-4 flex items-center gap-2 text-sm text-zinc-500"><Loader2 size={14} className="animate-spin" /> Loading tourists…</p>
      ) : tourists.length === 0 ? (
        <p className="mt-4 text-sm font-medium text-zinc-500">You have no tourists in active tour groups.</p>
      ) : (
        <>
          <p className="mt-3 text-xs font-black text-zinc-700">{accounted} of {tourists.length} accounted for</p>
          <ul className="mt-2 divide-y divide-zinc-100">
            {tourists.map((t) => {
              const status = t.checkin?.status || "none";
              return (
                <li key={`${t.groupId}:${t.touristId}`} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="font-bold text-zinc-900">{t.name}</p>
                    <p className="text-[11px] font-medium text-zinc-500">
                      {t.groupName}
                      {t.phone ? (
                        <a href={`tel:${t.phone}`} className="ml-2 inline-flex items-center gap-1 font-bold text-blue-700"><Phone size={10} /> {t.phone}</a>
                      ) : null}
                    </p>
                    <span className={`mt-1 inline-block rounded px-1.5 py-0.5 text-[9px] font-black uppercase ${CHECKIN_BADGE[status]}`}>
                      {CHECKIN_STATUS_TEXT[status]}{t.checkin?.source === "tourist" ? " (own reply)" : ""}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {GUIDE_CHECKIN_STATUSES.map((s) => (
                      <button
                        key={s}
                        type="button"
                        disabled={Boolean(savingKey)}
                        onClick={() => mark(t.touristId, s)}
                        className={`rounded-lg border px-2.5 py-1.5 text-[10px] font-black uppercase disabled:opacity-50 ${BUTTON_STYLE[s]} ${status === s ? "bg-zinc-100" : "bg-white"}`}
                      >
                        {savingKey === `${t.touristId}:${s}` ? <Loader2 size={10} className="inline animate-spin" /> : CHECKIN_STATUS_TEXT[s]}
                      </button>
                    ))}
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}
      {error ? <p role="alert" className="mt-2 text-sm font-bold text-red-700">{error}</p> : null}
    </section>
  );
}
