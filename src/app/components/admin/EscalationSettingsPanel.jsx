"use client";

import React, { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { AdminPanel } from "@/app/components/admin/AdminPanel";
import { fetchWithFreshSession } from "@/lib/authSession";
import { adminShell } from "@/lib/designSystem";
import { HelpTip } from "@/app/components/ui/HelpTip";

const label = "block text-[10px] font-black uppercase tracking-widest text-zinc-500";

/** Admin → Settings: how long before unanswered urgent reports re-alert the admins. */
export function EscalationSettingsPanel() {
  const [state, setState] = useState({ loading: true, available: true, error: "" });
  const [form, setForm] = useState({ enabled: true, minutes: 10 });
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

  return (
    <AdminPanel title="Escalation" subtitle="What happens when nobody responds to an urgent report">
      {state.loading ? (
        <p className="flex items-center gap-2 text-xs text-zinc-500"><Loader2 size={12} className="animate-spin" /> Loading…</p>
      ) : !state.available ? (
        <p className="text-sm text-zinc-600">Apply database migration 055 to turn on automatic escalation.</p>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-zinc-600">
            <span className="font-bold text-zinc-800">Escalation<HelpTip label="escalation">If nobody acts on an urgent case in time, the system alerts all admins again by SMS and in the app. It never texts anyone outside the Tourism Office.</HelpTip></span>{" "}
            Applies to: tourists who answer <b>I need help</b> or are marked <b>Missing</b>, missing-person reports,
            Critical incident reports and guide emergency reports. Admins are alerted at once. If nobody acts, admins are
            re-alerted by SMS after the time below, and again after twice that time.
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
            <p className="mt-1 text-[11px] text-zinc-500">A second reminder goes to admins after {Number(form.minutes) * 2 || "—"} minutes.</p>
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
