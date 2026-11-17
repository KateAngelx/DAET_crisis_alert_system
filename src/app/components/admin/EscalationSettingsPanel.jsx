"use client";

import React, { useEffect, useState } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { AdminPanel } from "@/app/components/admin/AdminPanel";
import { fetchWithFreshSession } from "@/lib/authSession";
import { adminShell } from "@/lib/designSystem";
import { MAX_ESCALATION_CONTACTS } from "@/lib/escalation";

const label = "block text-[10px] font-black uppercase tracking-widest text-zinc-500";

/** Admin → Settings: how long before unanswered urgent reports escalate, and who gets them. */
export function EscalationSettingsPanel() {
  const [state, setState] = useState({ loading: true, available: true, error: "" });
  const [form, setForm] = useState({ enabled: true, minutes: 10, contacts: [] });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    let cancelled = false;
    fetchWithFreshSession("/api/admin/escalation-settings")
      .then((r) => r.json())
      .then((json) => {
        if (cancelled) return;
        if (json.available === false) return setState({ loading: false, available: false, error: "" });
        if (json.settings) setForm(json.settings);
        setState({ loading: false, available: true, error: json.error || "" });
      })
      .catch(() => !cancelled && setState({ loading: false, available: true, error: "Could not load escalation settings." }));
    return () => {
      cancelled = true;
    };
  }, []);

  const save = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const response = await fetchWithFreshSession("/api/admin/escalation-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(json.error || "Could not save.");
      setForm(json.settings);
      setMessage({ ok: true, text: "Escalation settings saved." });
    } catch (e) {
      setMessage({ ok: false, text: e.message });
    } finally {
      setSaving(false);
    }
  };

  const setContact = (i, patch) =>
    setForm((f) => ({ ...f, contacts: f.contacts.map((c, j) => (j === i ? { ...c, ...patch } : c)) }));

  return (
    <AdminPanel title="Escalation" subtitle="What happens when nobody responds to an urgent report">
      {state.loading ? (
        <p className="flex items-center gap-2 text-xs text-zinc-500"><Loader2 size={12} className="animate-spin" /> Loading…</p>
      ) : !state.available ? (
        <p className="text-sm text-zinc-600">Apply database migration 055 to turn on automatic escalation.</p>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-zinc-600">
            Applies to: tourists who answer <b>I need help</b> or are marked <b>Missing</b>, missing-person reports,
            Critical incident reports and guide emergency reports. Admins are alerted at once. If nobody acts, admins are
            re-alerted by SMS after the time below, and the outside contacts get an SMS after twice that time.
          </p>
          <label className="flex items-center gap-3 text-sm font-bold text-zinc-800">
            <input type="checkbox" className="h-4 w-4" checked={form.enabled} onChange={(e) => setForm({ ...form, enabled: e.target.checked })} />
            Escalate unanswered urgent reports automatically
          </label>
          <div className="max-w-xs">
            <label htmlFor="escalation-minutes" className={label}>Minutes before re-alerting admins</label>
            <input
              id="escalation-minutes"
              type="number"
              min={3}
              max={120}
              className={`${adminShell.input} w-full`}
              value={form.minutes}
              onChange={(e) => setForm({ ...form, minutes: e.target.value })}
            />
            <p className="mt-1 text-[11px] text-zinc-500">Outside contacts are texted after {Number(form.minutes) * 2 || "—"} minutes.</p>
          </div>
          <div className="space-y-2">
            <span className={label}>Outside contacts (e.g. MDRRMO duty officer) — up to {MAX_ESCALATION_CONTACTS}</span>
            {form.contacts.length === 0 ? (
              <p className="text-[11px] font-medium text-amber-700">No outside contact yet. Unanswered reports will only re-alert admins.</p>
            ) : null}
            {form.contacts.map((c, i) => (
              <div key={i} className="flex flex-wrap gap-2">
                <input
                  aria-label="Contact name"
                  placeholder="Name or office (e.g. MDRRMO Daet)"
                  className={`${adminShell.input} min-w-0 flex-1`}
                  value={c.name}
                  onChange={(e) => setContact(i, { name: e.target.value })}
                />
                <input
                  aria-label="Mobile number"
                  placeholder="09XXXXXXXXX"
                  className={`${adminShell.input} w-40`}
                  value={c.phone}
                  onChange={(e) => setContact(i, { phone: e.target.value })}
                />
                <button
                  type="button"
                  aria-label="Remove contact"
                  onClick={() => setForm((f) => ({ ...f, contacts: f.contacts.filter((_, j) => j !== i) }))}
                  className="rounded-lg p-2 text-red-600 hover:bg-red-50"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
            {form.contacts.length < MAX_ESCALATION_CONTACTS ? (
              <button
                type="button"
                onClick={() => setForm((f) => ({ ...f, contacts: [...f.contacts, { name: "", phone: "" }] }))}
                className="inline-flex items-center gap-1 text-[10px] font-black uppercase text-blue-700"
              >
                <Plus size={12} /> Add outside contact
              </button>
            ) : null}
          </div>
          {message ? (
            <p role={message.ok ? "status" : "alert"} className={`text-sm font-bold ${message.ok ? "text-green-700" : "text-red-700"}`}>{message.text}</p>
          ) : null}
          {state.error ? <p className="text-sm font-bold text-red-700">{state.error}</p> : null}
          <button type="button" disabled={saving} onClick={save} className={`${adminShell.btnPrimary} disabled:opacity-50`}>
            {saving ? "Saving…" : "Save escalation settings"}
          </button>
        </div>
      )}
    </AdminPanel>
  );
}
