"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Clock, Loader2, MapPin, Phone, UserSearch } from "lucide-react";
import { AdminPanel } from "@/app/components/admin/AdminPanel";
import { fetchWithFreshSession } from "@/lib/authSession";
import { MISSING_STATUS_BADGE, MISSING_STATUS_LABELS } from "@/lib/missingPersons";
import Image from "next/image";

const ACTIONS = [
  { status: "found_safe", label: "Found safe", className: "border-green-200 text-green-700 hover:bg-green-50" },
  { status: "found_injured", label: "Found injured", className: "border-orange-200 text-orange-700 hover:bg-orange-50" },
  { status: "closed", label: "Close case", className: "border-zinc-200 text-zinc-700 hover:bg-zinc-50" },
  { status: "searching", label: "Reopen search", className: "border-red-200 text-red-700 hover:bg-red-50" },
];

function fmt(value) {
  return value ? new Date(value).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "time not given";
}

function CallLink({ phone, label }) {
  if (!phone) return null;
  return (
    <a href={`tel:${phone}`} className="inline-flex items-center gap-1 rounded-lg border border-blue-200 px-2 py-1 text-[10px] font-black uppercase text-blue-700 hover:bg-blue-50">
      <Phone size={10} /> {label}
    </a>
  );
}

/** Command Center: missing-tourist cases, open ones first, with contacts and status buttons. */
export function MissingPersonsPanel() {
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const response = await fetchWithFreshSession("/api/missing-persons");
      const json = await response.json().catch(() => ({}));
      setData(response.ok ? json : { available: true, cases: [], error: json.error || "Could not load cases." });
    } catch {
      setData({ available: true, cases: [], error: "Could not load cases." });
    }
  }, []);

  useEffect(() => {
    load();
    const timer = setInterval(load, 30_000);
    return () => clearInterval(timer);
  }, [load]);

  const acknowledge = async (id) => {
    setBusy(`${id}:ack`);
    setError("");
    try {
      const response = await fetchWithFreshSession(`/api/missing-persons/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ acknowledge: true }),
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(json.error || "Could not acknowledge.");
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(null);
    }
  };

  const update = async (id, status) => {
    const note = status === "searching" ? "" : window.prompt("Add a short note for the reporter and guide (optional):", "") ?? null;
    if (note === null) return;
    setBusy(`${id}:${status}`);
    setError("");
    try {
      const response = await fetchWithFreshSession(`/api/missing-persons/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, note }),
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(json.error || "Could not update.");
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(null);
    }
  };

  if (data && data.available === false) return null;
  const cases = data?.cases || [];
  const open = cases.filter((c) => c.search_status === "searching").length;
  if (data && !cases.length) return null; // nothing to show: keep the Command Center uncluttered

  return (
    <AdminPanel
      title={`Missing persons${open ? ` · ${open} searching` : ""}`}
      compact
      className={open ? "border-2 border-red-300" : ""}
    >
      {!data ? (
        <p className="flex items-center gap-2 text-xs text-zinc-500"><Loader2 size={12} className="animate-spin" /> Loading cases…</p>
      ) : (
        <ul className="space-y-3">
          {cases.map((c) => (
            <li key={c.incident_id} className={`rounded-2xl border bg-white p-4 ${c.search_status === "searching" ? "border-red-200" : "border-zinc-200 opacity-80"}`}>
              <div className="flex flex-col gap-3 sm:flex-row">
                {c.photoUrl ? (
                  <a href={c.photoUrl} target="_blank" rel="noopener noreferrer" className="shrink-0">
                    <Image src={c.photoUrl} alt={`Photo of ${c.person_name}`} width={96} height={96} className="h-24 w-24 rounded-xl object-cover" />
                  </a>
                ) : (
                  <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-xl bg-zinc-100 text-zinc-400">
                    <UserSearch size={28} />
                  </div>
                )}
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded px-1.5 py-0.5 text-[9px] font-black uppercase ${MISSING_STATUS_BADGE[c.search_status]}`}>
                      {MISSING_STATUS_LABELS[c.search_status]}
                    </span>
                    {c.reference ? <span className="font-mono text-[10px] font-black text-blue-700">{c.reference}</span> : null}
                    {c.tagged_user_id ? <span className="text-[9px] font-black uppercase text-zinc-400">Registered tourist</span> : null}
                    {c.acknowledged_at ? (
                      <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[9px] font-black uppercase text-blue-700">Acknowledged</span>
                    ) : c.escalation_level > 0 ? (
                      <span className="rounded bg-red-600 px-1.5 py-0.5 text-[9px] font-black uppercase text-white">
                        {c.escalation_level >= 2 ? "Escalated outside" : "Unanswered"}
                      </span>
                    ) : null}
                  </div>
                  <p className="text-base font-black text-zinc-900">{c.person_name}</p>
                  <p className="flex items-start gap-1 text-xs font-medium text-zinc-700"><MapPin size={12} className="mt-0.5 shrink-0" /> {c.last_seen_location}</p>
                  <p className="flex items-center gap-1 text-[11px] text-zinc-500"><Clock size={11} /> Last seen {fmt(c.last_seen_at)} · reported {fmt(c.created_at)}</p>
                  {c.person_description ? <p className="text-sm text-zinc-700">{c.person_description}</p> : null}
                  {c.status_note ? <p className="text-xs font-bold text-zinc-600">Note: {c.status_note}</p> : null}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    <CallLink phone={c.tagged?.phone} label={`Call ${c.person_name.split(" ")[0]}`} />
                    <CallLink phone={c.reporter?.phone} label={`Reporter ${c.reporter?.full_name ? `(${c.reporter.full_name.split(" ")[0]})` : ""}`} />
                    {(c.guides || []).map((g) => <CallLink key={g.phone || g.name} phone={g.phone} label={`Guide ${g.name?.split(" ")[0] || ""}`} />)}
                  </div>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5 border-t border-zinc-100 pt-3">
                {c.search_status === "searching" && !c.acknowledged_at ? (
                  <button
                    type="button"
                    disabled={Boolean(busy)}
                    onClick={() => acknowledge(c.incident_id)}
                    className="rounded-lg bg-blue-600 px-2.5 py-1.5 text-[10px] font-black uppercase text-white hover:bg-blue-700 disabled:opacity-50"
                    title="Tells the reporter and guide you are responding, and stops automatic escalation"
                  >
                    {busy === `${c.incident_id}:ack` ? <Loader2 size={10} className="inline animate-spin" /> : "Acknowledge — we're responding"}
                  </button>
                ) : null}
                {ACTIONS.filter((a) => a.status !== c.search_status).map((a) => (
                  <button
                    key={a.status}
                    type="button"
                    disabled={Boolean(busy)}
                    onClick={() => update(c.incident_id, a.status)}
                    className={`rounded-lg border px-2.5 py-1.5 text-[10px] font-black uppercase disabled:opacity-50 ${a.className}`}
                  >
                    {busy === `${c.incident_id}:${a.status}` ? <Loader2 size={10} className="inline animate-spin" /> : a.label}
                  </button>
                ))}
              </div>
            </li>
          ))}
        </ul>
      )}
      {error ? <p role="alert" className="mt-2 text-sm font-bold text-red-700">{error}</p> : null}
    </AdminPanel>
  );
}
