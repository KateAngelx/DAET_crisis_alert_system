"use client";

import React, { useRef, useState } from "react";
import { getActiveSession } from "@/lib/authSession";

const ASSISTANCE_TYPES = [
  "Help finding a tourist guide",
  "Tourism information or directions",
  "Assistance at a tourist destination",
  "Other tourism-related assistance",
];

export function GuideAssistanceRequestForm({ assistance, onClose, onSubmitted }) {
  const [form, setForm] = useState({
    assistanceType: ASSISTANCE_TYPES[0],
    location: "",
    preferredAt: "",
    touristCount: "1",
    details: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const idempotencyKey = useRef(null);

  const updateForm = (patch) => {
    idempotencyKey.current = null;
    setForm((current) => ({ ...current, ...patch }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (submitting) return;
    setError("");

    const touristCount = Number(form.touristCount);
    if (!Number.isInteger(touristCount) || touristCount < 1 || touristCount > 100) {
      setError("Enter a number of tourists between 1 and 100.");
      return;
    }

    setSubmitting(true);
    try {
      const session = await getActiveSession();
      if (!session?.access_token) {
        throw new Error("Please sign in again to submit a request.");
      }

      idempotencyKey.current ||= crypto.randomUUID();
      const response = await fetch("/api/tourist/guide-assistance", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          idempotencyKey: idempotencyKey.current,
          assistanceType: form.assistanceType,
          location: form.location,
          preferredAt: form.preferredAt || null,
          touristCount,
          details: form.details,
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Unable to submit your request.");

      idempotencyKey.current = null;
      onSubmitted?.(result.request);
      onClose?.();
    } catch (submitError) {
      setError(submitError.message || "Unable to submit your request.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[210] flex items-center justify-center bg-black/60 p-3 backdrop-blur-sm sm:p-5">
      <form
        onSubmit={handleSubmit}
        className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white shadow-2xl"
      >
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 rounded-t-3xl border-b border-zinc-100 bg-white px-5 py-4 sm:px-7">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-purple-700">Tourist Guide Assistance</p>
            <h2 className="mt-1 text-xl font-black text-zinc-900">Request local assistance</h2>
            <p className="mt-1 text-sm text-zinc-600">
              Requests depend on guide availability and Tourism Office coordination. This is not an emergency service.
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close request form" className="rounded-full p-2 text-zinc-500 hover:bg-zinc-100">
            <span aria-hidden="true">×</span>
          </button>
        </div>

        <div className="space-y-4 p-5 sm:p-7">
          {assistance?.introductoryInformation ? (
            <p className="whitespace-pre-wrap rounded-xl border border-purple-100 bg-purple-50 p-3 text-sm leading-relaxed text-purple-950">
              {assistance.introductoryInformation}
            </p>
          ) : null}
          {assistance?.availabilityMessage ? (
            <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm font-medium text-amber-950">
              {assistance.availabilityMessage}
            </p>
          ) : null}
          {error ? <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-800">{error}</p> : null}

          <label className="block text-sm font-bold text-zinc-800">
            Type of assistance
            <select
              required
              value={form.assistanceType}
              onChange={(event) => updateForm({ assistanceType: event.target.value })}
              className="mt-1.5 w-full rounded-xl border border-zinc-200 bg-white p-3 font-medium"
            >
              {ASSISTANCE_TYPES.map((type) => <option key={type}>{type}</option>)}
            </select>
          </label>

          <label className="block text-sm font-bold text-zinc-800">
            Location or destination
            <input
              required
              maxLength={500}
              value={form.location}
              onChange={(event) => updateForm({ location: event.target.value })}
              placeholder="e.g. Bagasbas Beach, Daet"
              className="mt-1.5 w-full rounded-xl border border-zinc-200 p-3 font-medium"
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-bold text-zinc-800">
              Preferred date and time <span className="font-medium text-zinc-500">(optional)</span>
              <input
                type="datetime-local"
                value={form.preferredAt}
                onChange={(event) => updateForm({ preferredAt: event.target.value })}
                className="mt-1.5 w-full rounded-xl border border-zinc-200 p-3 font-medium"
              />
            </label>
            <label className="block text-sm font-bold text-zinc-800">
              Number of tourists
              <input
                required
                type="number"
                min="1"
                max="100"
                step="1"
                value={form.touristCount}
                onChange={(event) => updateForm({ touristCount: event.target.value })}
                className="mt-1.5 w-full rounded-xl border border-zinc-200 p-3 font-medium"
              />
            </label>
          </div>

          <label className="block text-sm font-bold text-zinc-800">
            Additional details <span className="font-medium text-zinc-500">(optional)</span>
            <textarea
              rows={4}
              maxLength={5000}
              value={form.details}
              onChange={(event) => updateForm({ details: event.target.value })}
              placeholder="Share any details that will help the Tourism Office coordinate your request."
              className="mt-1.5 w-full resize-y rounded-xl border border-zinc-200 p-3 font-medium"
            />
            <span className="mt-1 block text-right text-xs text-zinc-500">{form.details.length}/5000</span>
          </label>

          <div className="flex flex-col-reverse gap-3 pt-1 sm:flex-row sm:justify-end">
            <button type="button" onClick={onClose} className="rounded-xl border border-zinc-200 px-5 py-3 text-sm font-bold text-zinc-700 hover:bg-zinc-50">
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-xl bg-purple-700 px-5 py-3 text-sm font-black text-white hover:bg-purple-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? "Submitting…" : "Submit assistance request"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
