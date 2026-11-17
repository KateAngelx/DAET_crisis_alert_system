"use client";

import React, { useEffect, useState } from "react";
import { MapPin, Phone, RefreshCw, WifiOff } from "lucide-react";
import { allEmergencyHotlines, hotlineTel, siteInfo } from "@/lib/siteInfo";
import { loadOfflineSnapshot } from "@/lib/offlineSnapshot";
import { getSeverityColor } from "@/lib/constants";
import { AlertTypeIcon, HazardTypeIcon, RoadStatusTypeIcon } from "@/app/components/ui/cardTypeIcons";

function formatSavedAt(value) {
  if (!value) return null;
  return new Date(value).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

/**
 * Shown by the service worker when a page cannot load without internet.
 * Everything here works offline: phone numbers dial directly, and alerts come from the
 * copy saved on this phone the last time it was online.
 */
export default function OfflinePage() {
  const [saved, setSaved] = useState({ alerts: null, hazards: null, roads: null, ready: false });

  useEffect(() => {
    const load = () =>
      setSaved({
        alerts: loadOfflineSnapshot("alerts"),
        hazards: loadOfflineSnapshot("hazards"),
        roads: loadOfflineSnapshot("roads"),
        ready: true,
      });
    load();
    const backOnline = () => window.location.reload();
    window.addEventListener("online", backOnline);
    return () => window.removeEventListener("online", backOnline);
  }, []);

  const alerts = saved.alerts?.items || [];
  const hazards = saved.hazards?.items || [];
  const roads = (saved.roads?.items || []).filter((r) => r.route_status && r.route_status !== "Safe");
  const savedAt = formatSavedAt(saved.alerts?.savedAt || saved.hazards?.savedAt || saved.roads?.savedAt);

  return (
    <main className="mx-auto max-w-2xl space-y-5 px-4 py-8">
      <header className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
        <p className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-zinc-500">
          <WifiOff size={14} /> You are offline
        </p>
        <h1 className="mt-2 text-2xl font-black text-zinc-900">Emergency information</h1>
        <p className="mt-1 text-sm font-medium text-zinc-600">
          {savedAt
            ? `Showing the alerts saved on this phone at ${savedAt}. They may be out of date.`
            : "No alerts are saved on this phone yet. Open CONNECT-DAET once while online to save them."}
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-3 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-white hover:bg-blue-700"
        >
          <RefreshCw size={12} /> Try again
        </button>
      </header>

      <section className="rounded-2xl border-2 border-red-200 bg-red-50 p-5">
        <h2 className="text-sm font-black uppercase tracking-widest text-red-800">Emergency hotlines</h2>
        <p className="mt-1 text-xs font-medium text-red-900">Calls work without internet. In a life-threatening emergency, call 911.</p>
        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {allEmergencyHotlines.map((h) => (
            <a key={h.name} href={`tel:${hotlineTel(h)}`} className="flex items-center gap-3 rounded-xl border border-red-100 bg-white p-3 hover:bg-red-100">
              <Phone size={16} className="shrink-0 text-red-600" />
              <span>
                <span className="block text-[10px] font-black uppercase text-red-500">{h.name}</span>
                <span className="block text-base font-black text-red-900">{h.number}</span>
              </span>
            </a>
          ))}
          <a href={`tel:${siteInfo.phoneMunicipalTel}`} className="flex items-center gap-3 rounded-xl border border-red-100 bg-white p-3 hover:bg-red-100">
            <Phone size={16} className="shrink-0 text-red-600" />
            <span>
              <span className="block text-[10px] font-black uppercase text-red-500">Daet Municipal Hotline</span>
              <span className="block text-base font-black text-red-900">{siteInfo.phoneMunicipal}</span>
            </span>
          </a>
        </div>
      </section>

      {saved.ready ? (
        <section className="space-y-3">
          <h2 className="text-sm font-black uppercase tracking-widest text-zinc-700">Active alerts ({alerts.length})</h2>
          {alerts.length === 0 ? (
            <p className="text-sm font-medium text-zinc-500">No active alerts were saved.</p>
          ) : (
            alerts.map((a) => (
              <article key={a.id} className="rounded-2xl border border-zinc-200 bg-white p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded px-2 py-0.5 text-[10px] font-black uppercase ${getSeverityColor(a.severity)}`}>{a.severity}</span>
                  <span className="flex items-center gap-1 text-[10px] font-bold uppercase text-zinc-400"><AlertTypeIcon type={a.type} size={12} /> {a.type}</span>
                </div>
                <h3 className="mt-1 font-black text-zinc-900">{a.title}</h3>
                {a.location ? <p className="flex items-center gap-1 text-xs font-bold text-zinc-500"><MapPin size={12} /> {a.location}</p> : null}
                {a.message ? <p className="mt-2 text-sm text-zinc-700">{a.message}</p> : null}
              </article>
            ))
          )}
        </section>
      ) : null}

      {hazards.length ? (
        <section className="space-y-3">
          <h2 className="text-sm font-black uppercase tracking-widest text-zinc-700">Areas to avoid ({hazards.length})</h2>
          {hazards.map((w) => (
            <article key={w.id} className="rounded-2xl border border-zinc-200 bg-white p-4">
              <p className="flex items-center gap-1 text-[10px] font-black uppercase text-zinc-500"><HazardTypeIcon type={w.danger_type} size={12} /> {w.severity} · {w.danger_type}</p>
              <h3 className="font-black text-zinc-900">{w.dangerous_location}</h3>
              {w.alternative_route ? (
                <p className="mt-1 text-sm text-zinc-700">Use instead: {w.alternative_route}{w.destination ? ` → ${w.destination}` : ""}</p>
              ) : null}
              {w.safety_instructions ? <p className="mt-1 text-sm text-zinc-600">{w.safety_instructions}</p> : null}
            </article>
          ))}
        </section>
      ) : null}

      {roads.length ? (
        <section className="space-y-3">
          <h2 className="text-sm font-black uppercase tracking-widest text-zinc-700">Road advisories ({roads.length})</h2>
          {roads.map((r) => (
            <article key={r.id} className="rounded-2xl border border-zinc-200 bg-white p-4">
              <p className="flex items-center gap-1 text-[10px] font-black uppercase text-zinc-500"><RoadStatusTypeIcon status={r.route_status} size={12} /> {r.route_status}</p>
              <h3 className="font-black text-zinc-900">{r.title}</h3>
              <p className="text-xs font-bold text-zinc-500">
                {[r.from_location, r.via_location, r.to_location].filter(Boolean).join(" → ")}
              </p>
              {r.reason || r.safety_instructions ? <p className="mt-1 text-sm text-zinc-700">{r.reason || r.safety_instructions}</p> : null}
            </article>
          ))}
        </section>
      ) : null}

      <p className="text-center text-[11px] font-medium text-zinc-400">
        {siteInfo.officeName} · {siteInfo.address}
      </p>
    </main>
  );
}
