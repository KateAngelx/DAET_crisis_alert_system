"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Loader2, MapPin, ShieldCheck } from "lucide-react";
import { useAuthStore } from "@/app/store/crisisStore";
import { fetchWithFreshSession } from "@/lib/authSession";
import { getCurrentPosition } from "@/lib/locationSharing.client";
import {
  LOCATION_PROMPT_SNOOZE_MS,
  locationPromptKey,
  shouldShowLocationPrompt,
  startGuideDoneKey,
} from "@/lib/locationPrompt";

function readNumber(key) {
  try {
    const v = Number(window.localStorage.getItem(key));
    return Number.isFinite(v) && v > 0 ? v : null;
  } catch {
    return null;
  }
}
function readFlag(key) {
  try {
    return window.localStorage.getItem(key) === "1";
  } catch {
    return true; // storage blocked: don't wait for the start guide
  }
}
async function geoPermission() {
  try {
    if (!navigator.permissions?.query) return "unknown";
    return (await navigator.permissions.query({ name: "geolocation" })).state;
  } catch {
    return "unknown";
  }
}

/**
 * "Are you in Daet?" — asks signed-in tourists (once, then every 7 days if they say Not now)
 * to share their location so the Tourism Office can warn them about dangers nearby.
 */
export function LocationConsentPrompt() {
  const pathname = usePathname();
  const { user, isAuthenticated } = useAuthStore();
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const userId = isAuthenticated ? user?.id : null;
  const role = user?.role;
  const sharing = user?.location_sharing_enabled === true;

  // Check now and again every 15 s (e.g. after the start guide closes). Never shows mid-render.
  useEffect(() => {
    if (!userId || role !== "tourist" || sharing) return undefined;
    let cancelled = false;
    const check = async () => {
      const show = shouldShowLocationPrompt({
        role,
        sharing,
        snoozedUntil: readNumber(locationPromptKey(userId)),
        startGuideDone: readFlag(startGuideDoneKey(userId)),
        permission: await geoPermission(),
        geolocation: typeof navigator !== "undefined" && Boolean(navigator.geolocation),
        path: window.location.pathname,
      });
      if (!cancelled && show) setVisible(true);
    };
    const first = setTimeout(check, 4000);
    const again = setInterval(check, 15000);
    return () => {
      cancelled = true;
      clearTimeout(first);
      clearInterval(again);
    };
  }, [userId, role, sharing, pathname]);

  const snooze = useCallback(() => {
    try {
      window.localStorage.setItem(locationPromptKey(userId), String(Date.now() + LOCATION_PROMPT_SNOOZE_MS));
    } catch {
      /* storage blocked: it may ask again next visit */
    }
    setVisible(false);
    setResult(null);
  }, [userId]);

  const share = async () => {
    setBusy(true);
    setResult(null);
    try {
      const position = await getCurrentPosition(); // the browser asks for permission here
      const response = await fetchWithFreshSession("/api/auth/location", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: true, ...position }),
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(json.error || "Could not turn on location sharing.");
      const current = useAuthStore.getState().user;
      if (current) useAuthStore.setState({ user: { ...current, location_sharing_enabled: true } });
      setResult({ ok: true, text: "Thank you. You'll get alerts about dangers near you. You can turn this off anytime in Profile." });
      setTimeout(() => setVisible(false), 4000);
    } catch (error) {
      setResult({ ok: false, text: error.message });
    } finally {
      setBusy(false);
    }
  };

  // Hide once sharing is on, except while showing the short "Thank you" message.
  if (!visible || (sharing && !result?.ok)) return null;

  return (
    <div className="fixed inset-0 z-[96] flex items-end justify-center bg-black/40 p-3 sm:items-center" role="dialog" aria-modal="true" aria-labelledby="location-consent-title">
      <div className="w-full max-w-md rounded-3xl bg-white p-5 shadow-2xl">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
            <MapPin size={22} />
          </span>
          <div className="min-w-0">
            <h2 id="location-consent-title" className="text-lg font-black text-zinc-900">Are you in Daet right now?</h2>
            <p className="mt-1 text-sm text-zinc-600">
              Share your location so the Daet Tourism Office can warn you about floods, road closures and other dangers
              <b> near where you are</b>.
            </p>
          </div>
        </div>

        <ul className="mt-4 space-y-1.5 rounded-2xl bg-zinc-50 p-3 text-xs font-medium text-zinc-600">
          <li className="flex items-start gap-2"><ShieldCheck size={14} className="mt-0.5 shrink-0 text-green-600" /> Only while CONNECT-DAET is open — never in the background.</li>
          <li className="flex items-start gap-2"><ShieldCheck size={14} className="mt-0.5 shrink-0 text-green-600" /> Rounded to about 100 m and deleted after 48 hours.</li>
          <li className="flex items-start gap-2"><ShieldCheck size={14} className="mt-0.5 shrink-0 text-green-600" /> Only the Tourism Office&apos;s system uses it. Turn it off anytime in Profile.</li>
        </ul>

        {result ? (
          <p role={result.ok ? "status" : "alert"} className={`mt-3 text-sm font-bold ${result.ok ? "text-green-700" : "text-red-700"}`}>{result.text}</p>
        ) : null}

        {!result?.ok ? (
          <div className="mt-4 flex flex-col gap-2 sm:flex-row-reverse">
            <button
              type="button"
              onClick={share}
              disabled={busy}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-xs font-black uppercase tracking-widest text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {busy ? <Loader2 size={14} className="animate-spin" /> : <MapPin size={14} />} Share my location
            </button>
            <button type="button" onClick={snooze} disabled={busy} className="flex-1 rounded-xl border border-zinc-200 px-4 py-3 text-xs font-black uppercase tracking-widest text-zinc-600 hover:bg-zinc-50">
              Not now
            </button>
          </div>
        ) : null}
        {!result?.ok ? (
          <p className="mt-3 text-center text-[11px] text-zinc-500">
            Prefer not to? You can add your <Link href="/profile" onClick={snooze} className="font-bold text-blue-700 underline">visit dates</Link> instead.
          </p>
        ) : null}
      </div>
    </div>
  );
}
