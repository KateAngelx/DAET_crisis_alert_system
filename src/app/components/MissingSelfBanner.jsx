"use client";

import React, { useCallback, useEffect, useState } from "react";
import { CheckCircle2, Loader2, UserSearch } from "lucide-react";
import { useAuthStore } from "@/app/store/crisisStore";
import { fetchWithFreshSession } from "@/lib/authSession";

/**
 * Shown to a signed-in tourist whom someone reported missing, on every page,
 * until they tap "I'm safe" or the Tourism Office closes the case.
 */
export function MissingSelfBanner() {
  const { user, isAuthenticated } = useAuthStore();
  const [cases, setCases] = useState([]);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const isTourist = isAuthenticated && user?.role === "tourist";

  const load = useCallback(async () => {
    try {
      const response = await fetchWithFreshSession("/api/missing-persons?mine=1");
      const json = await response.json().catch(() => ({}));
      setCases(response.ok ? json.cases || [] : []);
    } catch {
      /* offline or not set up: nothing to show */
    }
  }, []);

  useEffect(() => {
    if (!isTourist) return undefined;
    load();
    const timer = setInterval(load, 2 * 60_000);
    return () => clearInterval(timer);
  }, [isTourist, load]);

  if (!isTourist || (!cases.length && !done)) return null;

  if (done) {
    return (
      <div role="status" className="fixed inset-x-3 top-24 z-[95] mx-auto flex max-w-xl items-center gap-3 rounded-2xl bg-green-600 p-4 text-white shadow-2xl">
        <CheckCircle2 size={20} className="shrink-0" />
        <p className="flex-1 text-sm font-bold">Thank you. The Tourism Office and the person who reported you know you are safe.</p>
        <button type="button" onClick={() => setDone(false)} className="text-[10px] font-black uppercase underline">OK</button>
      </div>
    );
  }

  const latest = cases[0];
  const confirm = async () => {
    setBusy(true);
    setError("");
    try {
      for (const c of cases) {
        const response = await fetchWithFreshSession(`/api/missing-persons/${c.incidentId}/safe`, { method: "POST" });
        if (!response.ok) {
          const json = await response.json().catch(() => ({}));
          throw new Error(json.error || "Could not send. Try again or call the Tourism Office.");
        }
      }
      setCases([]);
      setDone(true);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div role="alert" className="fixed inset-x-3 top-24 z-[95] mx-auto max-w-xl rounded-2xl border-2 border-red-300 bg-red-600 p-4 text-white shadow-2xl">
      <p className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-red-100">
        <UserSearch size={16} /> You were reported missing
      </p>
      <p className="mt-1 text-sm font-medium">
        {latest.reportedBy ? `${latest.reportedBy} reported` : "Someone reported"} you missing near {latest.lastSeenLocation}. If you are safe, let them know now.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={confirm}
          disabled={busy}
          className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-xs font-black uppercase tracking-widest text-red-700 hover:bg-red-50 disabled:opacity-60"
        >
          {busy ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />} I&apos;m safe
        </button>
        <a href="tel:911" className="inline-flex items-center rounded-xl border border-white/40 px-4 py-2 text-xs font-black uppercase tracking-widest">
          I need help — call 911
        </a>
      </div>
      {error ? <p className="mt-2 text-xs font-bold text-yellow-200">{error}</p> : null}
    </div>
  );
}
