"use client";

import React, { useEffect, useState } from "react";
import { Loader2, Search, UserCheck, UserSearch, X } from "lucide-react";
import { fetchWithFreshSession } from "@/lib/authSession";

export const EMPTY_MISSING_PERSON = {
  taggedUserId: null,
  taggedName: "",
  personName: "",
  personDescription: "",
  lastSeenAt: "",
};

/** datetime-local value for "now" in the browser's time zone (max for the last-seen field). */
function nowLocalInput() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

const label = "text-[10px] font-black uppercase tracking-widest text-gray-400";
const input = "w-full mt-1 p-3 bg-gray-50 border border-gray-100 rounded-xl font-bold text-sm";

/** Extra fields for a "Missing Person" report: tag the person, describe them, last-seen time. */
export function MissingPersonFields({ value, onChange }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const set = (patch) => onChange({ ...value, ...patch });

  useEffect(() => {
    if (value.taggedUserId) return undefined;
    let cancelled = false;
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const response = await fetchWithFreshSession(`/api/missing-persons/candidates?q=${encodeURIComponent(query.trim())}`);
        const data = await response.json().catch(() => ({}));
        if (!cancelled) setResults(response.ok ? data.people || [] : []);
      } catch {
        if (!cancelled) setResults([]);
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, value.taggedUserId]);

  return (
    <div className="space-y-4 rounded-2xl border-2 border-red-200 bg-red-50/40 p-4">
      <p className="flex items-start gap-2 text-xs font-bold text-red-800">
        <UserSearch size={16} className="mt-0.5 shrink-0" />
        Missing tourist. The Tourism Office and the person&apos;s guide are alerted at once. If someone is in immediate danger, call 911.
      </p>

      <div>
        <span className={label}>Who is missing?</span>
        {value.taggedUserId ? (
          <div className="mt-1 flex items-center justify-between gap-2 rounded-xl border border-green-200 bg-white p-3">
            <span className="flex items-center gap-2 text-sm font-bold text-zinc-900">
              <UserCheck size={16} className="text-green-600" /> {value.taggedName}
            </span>
            <button
              type="button"
              onClick={() => set({ taggedUserId: null, taggedName: "" })}
              className="rounded-full p-1 text-zinc-500 hover:bg-zinc-100"
              aria-label="Remove tagged person"
            >
              <X size={14} />
            </button>
          </div>
        ) : (
          <>
            <div className="relative mt-1">
              <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search your group or a registered tourist by name"
                className={`${input} mt-0 pl-9`}
                aria-label="Search for the missing person"
              />
            </div>
            <div className="mt-2 max-h-40 overflow-y-auto rounded-xl border border-zinc-100 bg-white">
              {searching && !results.length ? (
                <p className="flex items-center gap-2 p-3 text-xs text-zinc-500"><Loader2 size={12} className="animate-spin" /> Searching…</p>
              ) : results.length ? (
                results.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => onChange({ ...value, taggedUserId: p.id, taggedName: p.name, personName: p.name })}
                    className="flex w-full items-center justify-between gap-2 border-b border-zinc-50 px-3 py-2 text-left text-sm hover:bg-blue-50"
                  >
                    <span className="font-bold text-zinc-900">{p.name}</span>
                    <span className="text-[10px] font-bold uppercase text-zinc-400">{p.inYourGroup ? p.group || "Your group" : "Registered tourist"}</span>
                  </button>
                ))
              ) : (
                <p className="p-3 text-xs text-zinc-500">
                  {query.trim().length >= 3 ? "No registered tourist found. Type their name below instead." : "Type at least 3 letters to search, or type their name below."}
                </p>
              )}
            </div>
            <label className="mt-3 block">
              <span className={label}>Or their name (not registered)</span>
              <input
                maxLength={120}
                value={value.personName}
                onChange={(e) => set({ personName: e.target.value })}
                placeholder="Full name"
                className={input}
              />
            </label>
          </>
        )}
      </div>

      <label className="block">
        <span className={label}>What do they look like? (optional)</span>
        <textarea
          rows={2}
          maxLength={1000}
          value={value.personDescription}
          onChange={(e) => set({ personDescription: e.target.value })}
          placeholder="Age, height, clothing, anything that helps identify them"
          className={`${input} resize-none font-medium`}
        />
      </label>

      <label className="block">
        <span className={label}>When were they last seen?</span>
        <input
          type="datetime-local"
          max={nowLocalInput()}
          value={value.lastSeenAt}
          onChange={(e) => set({ lastSeenAt: e.target.value })}
          className={input}
        />
      </label>
      <p className="text-[11px] font-medium text-zinc-500">
        Use the Location field below for where they were last seen, and add a recent photo under Evidence if you have one.
      </p>
    </div>
  );
}
