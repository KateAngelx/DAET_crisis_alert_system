"use client";

import React, { useEffect, useState } from "react";
import { Loader2, MapPin } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { fetchWithFreshSession } from "@/lib/authSession";
import { getCurrentPosition } from "@/lib/locationSharing.client";
import { useAuthStore } from "@/app/store/crisisStore";

function timeAgo(value) {
  if (!value) return null;
  const minutes = Math.round((Date.now() - Date.parse(value)) / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  return `${hours} hour${hours === 1 ? "" : "s"} ago`;
}

/** Opt-in switch: share a rounded position so the office can alert tourists near an emergency. */
export function LocationSharingPanel({ userId }) {
  const [enabled, setEnabled] = useState(false);
  const [savedAt, setSavedAt] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [available, setAvailable] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    if (!userId) return undefined;
    let cancelled = false;
    Promise.all([
      supabase.from("profiles").select("location_sharing_enabled").eq("id", userId).maybeSingle(),
      supabase.from("tourist_locations").select("recorded_at").eq("user_id", userId).maybeSingle(),
    ]).then(([profileResult, locationResult]) => {
      if (cancelled) return;
      if (profileResult.error) {
        setAvailable(false); // migration 049 not applied yet
      } else {
        setEnabled(profileResult.data?.location_sharing_enabled === true);
        setSavedAt(locationResult.data?.recorded_at || null);
      }
      setLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const update = async (turnOn) => {
    setBusy(true);
    setMessage(null);
    try {
      let position = null;
      if (turnOn) position = await getCurrentPosition(); // asks the browser for permission
      const response = await fetchWithFreshSession("/api/auth/location", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: turnOn, ...(position || {}) }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Could not update location sharing.");
      setEnabled(turnOn);
      setSavedAt(turnOn && data.saved ? new Date().toISOString() : null);
      const user = useAuthStore.getState().user;
      if (user) useAuthStore.setState({ user: { ...user, location_sharing_enabled: turnOn } });
      setMessage({
        type: "success",
        text: turnOn ? "Location sharing is on." : "Location sharing is off and your saved location was deleted.",
      });
    } catch (error) {
      setMessage({ type: "error", text: error.message });
    } finally {
      setBusy(false);
    }
  };

  if (loaded && !available) return null;

  return (
    <div className="space-y-3 border-t border-zinc-100 pt-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-2">
          <MapPin size={16} className="mt-0.5 shrink-0 text-blue-600" />
          <div>
            <p className="text-sm font-bold text-zinc-900">Share my location for alerts</p>
            <p className="text-xs font-medium text-zinc-600">
              Optional. While CONNECT-DAET is open, your approximate location (rounded to about 100 m) is saved so the
              Tourism Office can alert tourists near an emergency. It is deleted after 48 hours, and right away when you
              turn this off. You still get alerts sent to everyone either way.
            </p>
          </div>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          aria-label="Share my location for alerts"
          disabled={!loaded || busy}
          onClick={() => update(!enabled)}
          className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-50 ${
            enabled ? "bg-blue-600" : "bg-zinc-300"
          }`}
        >
          {busy ? (
            <Loader2 size={12} className="absolute left-1/2 -translate-x-1/2 animate-spin text-white" />
          ) : (
            <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${enabled ? "translate-x-5" : "translate-x-0.5"}`} />
          )}
        </button>
      </div>
      {enabled && savedAt ? (
        <p className="text-[11px] font-medium text-zinc-500">Location last saved {timeAgo(savedAt)}.</p>
      ) : null}
      {message ? (
        <p role={message.type === "error" ? "alert" : "status"}
          className={`text-sm font-bold ${message.type === "error" ? "text-red-700" : "text-green-700"}`}>
          {message.text}
        </p>
      ) : null}
    </div>
  );
}
