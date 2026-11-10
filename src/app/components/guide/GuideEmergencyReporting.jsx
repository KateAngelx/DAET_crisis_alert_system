"use client";

import React, { useRef, useState } from "react";
import { AlertTriangle, MapPin, X } from "lucide-react";
import { getActiveSession } from "@/lib/authSession";
import { useConfirm } from "@/app/components/ui/ConfirmDialogProvider";

const EMERGENCY_TYPES = [
  "Medical emergency",
  "Accident or injury",
  "Lost tourist",
  "Safety or security concern",
  "Natural disaster or hazardous situation",
  "Other emergency",
];

const EMPTY_FORM = {
  emergencyType: EMERGENCY_TYPES[0],
  location: "",
  description: "",
  affectedTourists: "",
  affectedInfo: "",
  latitude: null,
  longitude: null,
};

export function GuideEmergencyReporting() {
  const { confirm } = useConfirm();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [locating, setLocating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [confirmation, setConfirmation] = useState(null);
  const idempotencyKey = useRef(null);

  const updateForm = (patch) => {
    idempotencyKey.current = null;
    setForm((current) => ({ ...current, ...patch }));
  };

  const requestDeviceLocation = () => {
    if (!navigator.geolocation) {
      setError("Device location is not available in this browser. Enter the location manually.");
      return;
    }
    setLocating(true);
    setError("");
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const latitude = Number(coords.latitude.toFixed(6));
        const longitude = Number(coords.longitude.toFixed(6));
        setForm((current) => ({
          ...current,
          location: `GPS location (${latitude}, ${longitude})`,
          latitude,
          longitude,
        }));
        idempotencyKey.current = null;
        setLocating(false);
      },
      (locationError) => {
        const message = locationError.code === 1
          ? "Location permission was denied. Allow it in your browser settings or enter the location manually."
          : locationError.code === 3
            ? "Getting your location timed out. Try GPS again or enter the location manually."
            : "Could not determine your location. Try GPS again or enter the location manually.";
        setError(message);
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  const openEmergencyForm = () => {
    setError("");
    setOpen(true);
    requestDeviceLocation();
  };

  const submit = async (event) => {
    event.preventDefault();
    if (submitting) return;
    setError("");
    const accepted = await confirm({
      title: "Send emergency report now?",
      description: `${form.emergencyType} at ${form.location}. This will immediately alert authorized administrators.`,
      confirmLabel: "Send emergency report",
      variant: "danger",
    });
    if (!accepted) return;

    setSubmitting(true);
    try {
      const session = await getActiveSession();
      if (!session?.access_token) throw new Error("Your session expired. Please sign in again.");
      idempotencyKey.current ||= crypto.randomUUID();
      const response = await fetch("/api/guide/emergency-reports", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          idempotencyKey: idempotencyKey.current,
          emergencyType: form.emergencyType,
          location: form.location,
          latitude: form.latitude,
          longitude: form.longitude,
          description: form.description,
          affectedTourists: form.affectedTourists || null,
          affectedInfo: form.affectedInfo || null,
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Unable to submit the emergency report.");

      setConfirmation({
        referenceNumber: result.report.referenceNumber,
        warnings: result.notificationWarnings || [],
      });
      setOpen(false);
      setForm(EMPTY_FORM);
      idempotencyKey.current = null;
    } catch (submitError) {
      setError(submitError.message || "Unable to submit the emergency report.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <section className="rounded-2xl border-2 border-red-300 bg-red-50 p-4 shadow-sm sm:flex sm:items-center sm:justify-between sm:gap-6 sm:p-5">
        <div className="flex items-start gap-3">
          <span className="rounded-xl bg-red-600 p-2.5 text-white"><AlertTriangle size={22} /></span>
          <div>
            <h2 className="text-base font-black text-red-950 sm:text-lg">Emergency Assistance</h2>
            <p className="mt-1 max-w-2xl text-sm font-medium text-red-900">
              Report an urgent safety, medical, or tourist emergency directly to the Tourism Office. This is separate from guide assistance requests.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={openEmergencyForm}
          className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-red-700 px-5 py-3 text-sm font-black uppercase tracking-wide text-white shadow hover:bg-red-800 focus:outline-none focus:ring-4 focus:ring-red-300 sm:mt-0 sm:w-auto"
        >
          <AlertTriangle size={17} /> Emergency Report
        </button>
      </section>

      {confirmation ? (
        <div role="status" className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-950">
          <p className="font-black">Emergency report submitted. Reference: {confirmation.referenceNumber}</p>
          <p className="mt-1">
            {confirmation.warnings.length
              ? "The report is saved. Review the notification delivery warning below."
              : "The report is saved and administrators have been alerted."}
          </p>
          {confirmation.warnings.length ? (
            <p className="mt-2 text-xs font-semibold text-amber-900">
              Some notifications could not be queued: {confirmation.warnings.join("; ")}
            </p>
          ) : null}
          <button type="button" className="mt-2 text-xs font-bold underline" onClick={() => setConfirmation(null)}>Dismiss</button>
        </div>
      ) : null}

      {open ? (
        <div className="fixed inset-0 z-[2100] flex items-center justify-center bg-black/60 p-3 backdrop-blur-sm sm:p-5">
          <form onSubmit={submit} className="max-h-[94vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-red-100 bg-white px-5 py-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-red-700">Emergency report</p>
                <h2 className="mt-1 text-xl font-black text-zinc-950">Tell us what happened</h2>
                <p className="mt-1 text-xs font-medium text-zinc-600">Your report is sent directly to authorized administrators.</p>
              </div>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close emergency form" className="rounded-full p-2 text-zinc-500 hover:bg-zinc-100"><X size={20} /></button>
            </div>
            <div className="space-y-4 p-5">
              {error ? <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-800">{error}</p> : null}
              <label className="block text-sm font-bold text-zinc-800">
                Emergency type
                <select required value={form.emergencyType} onChange={(event) => updateForm({ emergencyType: event.target.value })} className="mt-1.5 w-full rounded-xl border border-zinc-200 bg-white p-3">
                  {EMERGENCY_TYPES.map((type) => <option key={type}>{type}</option>)}
                </select>
              </label>

              <div>
                <label htmlFor="guide-emergency-location" className="block text-sm font-bold text-zinc-800">Location</label>
                <div className="mt-1.5 flex gap-2">
                  <input
                    id="guide-emergency-location"
                    required
                    maxLength={500}
                    value={form.location}
                    onChange={(event) => updateForm({ location: event.target.value, latitude: null, longitude: null })}
                    placeholder="GPS location will be filled automatically, or enter manually"
                    className="min-w-0 flex-1 rounded-xl border border-zinc-200 p-3 text-sm"
                  />
                  <button type="button" onClick={requestDeviceLocation} disabled={locating} className="inline-flex shrink-0 items-center gap-1 rounded-xl border border-zinc-200 px-3 text-xs font-bold text-zinc-700 disabled:opacity-50">
                    <MapPin size={15} /> {locating ? "Locating…" : "Refresh GPS"}
                  </button>
                </div>
                <p className="mt-1 text-[11px] text-zinc-500">
                  GPS is requested when you open this form and included only with this report. If permission is denied, enter the location manually.
                </p>
              </div>

              <label className="block text-sm font-bold text-zinc-800">
                Description
                <textarea required rows={3} maxLength={5000} value={form.description} onChange={(event) => updateForm({ description: event.target.value })} placeholder="Briefly describe the emergency and immediate needs." className="mt-1.5 w-full resize-y rounded-xl border border-zinc-200 p-3 text-sm" />
              </label>

              <label className="block text-sm font-bold text-zinc-800">
                Number of affected tourists <span className="font-medium text-zinc-500">(optional)</span>
                <input type="number" min="1" max="500" step="1" value={form.affectedTourists} onChange={(event) => updateForm({ affectedTourists: event.target.value })} className="mt-1.5 w-full rounded-xl border border-zinc-200 p-3 text-sm" />
              </label>

              <label className="block text-sm font-bold text-zinc-800">
                Affected tourist or group information <span className="font-medium text-zinc-500">(optional)</span>
                <textarea rows={2} maxLength={1000} value={form.affectedInfo} onChange={(event) => updateForm({ affectedInfo: event.target.value })} placeholder="Names, group name, or other identifying details if known." className="mt-1.5 w-full resize-y rounded-xl border border-zinc-200 p-3 text-sm" />
              </label>

              <div className="flex flex-col-reverse gap-2 border-t border-zinc-100 pt-4 sm:flex-row sm:justify-end">
                <button type="button" onClick={() => setOpen(false)} className="rounded-xl border border-zinc-200 px-4 py-3 text-sm font-bold text-zinc-700">Cancel</button>
                <button type="submit" disabled={submitting || !form.location.trim() || !form.description.trim()} className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-700 px-5 py-3 text-sm font-black text-white hover:bg-red-800 disabled:opacity-50">
                  <AlertTriangle size={16} /> {submitting ? "Sending…" : "Send Emergency Report"}
                </button>
              </div>
            </div>
          </form>
        </div>
      ) : null}
    </>
  );
}
