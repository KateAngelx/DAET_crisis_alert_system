"use client";

import React, { useEffect, useState } from "react";
import { CalendarDays, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { getActiveSession } from "@/lib/authSession";
import { validateVisitDates } from "@/lib/alertTargeting";
import { portalShell } from "@/lib/designSystem";

/** Optional visit dates so the Tourism Office can alert tourists who are in Daet now. */
export function VisitDatesPanel({ userId }) {
  const [dates, setDates] = useState({ start: "", end: "" });
  const [loaded, setLoaded] = useState(false);
  const [available, setAvailable] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    if (!userId) return undefined;
    let cancelled = false;
    supabase
      .from("profiles")
      .select("visit_start_date, visit_end_date")
      .eq("id", userId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          setAvailable(false); // migration 048 not applied yet
        } else {
          setDates({ start: data?.visit_start_date || "", end: data?.visit_end_date || "" });
        }
        setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const save = async (next) => {
    const problem = validateVisitDates(next.start || null, next.end || null);
    if (problem) {
      setMessage({ type: "error", text: problem });
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      const session = await getActiveSession();
      const response = await fetch("/api/auth/visit-dates", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token || ""}` },
        body: JSON.stringify({ visit_start_date: next.start || null, visit_end_date: next.end || null }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Could not save your visit dates.");
      setDates({ start: data.visit_start_date || "", end: data.visit_end_date || "" });
      setMessage({ type: "success", text: next.start || next.end ? "Visit dates saved." : "Visit dates cleared." });
    } catch (error) {
      setMessage({ type: "error", text: error.message });
    } finally {
      setSaving(false);
    }
  };

  if (loaded && !available) return null;

  const label = "block text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-1";

  return (
    <div className="space-y-3">
      <p className="flex items-start gap-2 text-sm font-medium text-zinc-600">
        <CalendarDays size={16} className="mt-0.5 shrink-0 text-blue-600" />
        Optional. When you are in Daet, the Tourism Office can send you alerts meant for visitors who are here now.
      </p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="visit-start" className={label}>Arriving</label>
          <input id="visit-start" type="date" className={portalShell.input} value={dates.start} disabled={!loaded || saving}
            onChange={(e) => setDates((d) => ({ ...d, start: e.target.value }))} />
        </div>
        <div>
          <label htmlFor="visit-end" className={label}>Leaving</label>
          <input id="visit-end" type="date" className={portalShell.input} value={dates.end} min={dates.start || undefined} disabled={!loaded || saving}
            onChange={(e) => setDates((d) => ({ ...d, end: e.target.value }))} />
        </div>
      </div>
      {message ? (
        <p role={message.type === "error" ? "alert" : "status"}
          className={`text-sm font-bold ${message.type === "error" ? "text-red-700" : "text-green-700"}`}>
          {message.text}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <button type="button" className={`${portalShell.btnPrimary} disabled:opacity-50`} disabled={!loaded || saving} onClick={() => save(dates)}>
          {saving ? <Loader2 size={14} className="animate-spin" /> : null} Save visit dates
        </button>
        {dates.start || dates.end ? (
          <button type="button" className={portalShell.btnGhost} disabled={saving} onClick={() => save({ start: "", end: "" })}>
            Clear
          </button>
        ) : null}
      </div>
    </div>
  );
}
