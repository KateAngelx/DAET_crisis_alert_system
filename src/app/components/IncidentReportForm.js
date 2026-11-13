"use client";

import React, { useState } from "react";
import { LocateFixed, MapPin, Send, Loader2 } from "lucide-react";
import { useAuthStore } from "@/app/store/crisisStore";
import { useIncidentStore } from "@/app/store/incidentStore";
import { INCIDENT_CATEGORIES, INCIDENT_SEVERITIES } from "@/lib/constants";
import { portalShell } from "@/lib/designSystem";

const INITIAL_FORM = {
  category: "Accident",
  description: "",
  location: "",
  severity: "Medium",
  latitude: null,
  longitude: null,
};

export function IncidentReportForm({
  onSuccess,
  onCancel,
  categoryOverride,
  categories = INCIDENT_CATEGORIES,
  introductoryInfo,
  availabilityMessage,
}) {
  const { user } = useAuthStore();
  const { submitReport, submitting } = useIncidentStore();
  const [form, setForm] = useState(() => ({
    ...INITIAL_FORM,
    category: categoryOverride || INITIAL_FORM.category,
  }));
  const [files, setFiles] = useState([]);
  const [error, setError] = useState(null);
  const [locating, setLocating] = useState(false);
  const [locationMessage, setLocationMessage] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!user?.id) {
      setError("Sign in to submit a report.");
      return;
    }

    if (!form.description.trim() || !form.location.trim()) {
      setError("Please provide a description and location.");
      return;
    }

    const result = await submitReport(
      { ...form, reporterId: user.id, reporterRole: user.role },
      files
    );

    if (result.success) {
      setForm({ ...INITIAL_FORM, category: categoryOverride || INITIAL_FORM.category });
      setFiles([]);
      setLocationMessage("");
      onSuccess?.(result.incident, result.notificationWarnings || []);
    } else {
      setError(result.error);
    }
  };

  const requestLocation = () => {
    if (!navigator.geolocation) {
      setLocationMessage("This browser cannot share your location. Type the place instead.");
      return;
    }

    setLocating(true);
    setLocationMessage("");
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        const latitude = Number(coords.latitude.toFixed(6));
        const longitude = Number(coords.longitude.toFixed(6));
        let place = "";
        try {
          const response = await fetch(`/api/geocode?lat=${latitude}&lon=${longitude}`);
          const data = await response.json();
          place = typeof data?.display_name === "string" ? data.display_name : "";
        } catch {
          place = "";
        }
        setForm((current) => ({
          ...current,
          latitude,
          longitude,
          location: place || current.location || `GPS location (${latitude}, ${longitude})`,
        }));
        setLocationMessage("Location added. You can edit the place name. The GPS pin stays with this report.");
        setLocating(false);
      },
      (locationError) => {
        const message = locationError.code === 1
          ? "Location permission was denied. Allow it in your browser, or type the place."
          : "Could not read your location. Try again or type the place.";
        setLocationMessage(message);
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
  };

  return (
    <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col overflow-hidden">
      {error ? (
        <div className="shrink-0 border-b border-red-100 bg-red-50 px-6 py-3 text-sm font-bold text-red-700">
          {error}
        </div>
      ) : null}
      <div className={`${portalShell.modalActionBar} flex-col sm:flex-row`}>
        <button
          type="button"
          onClick={requestLocation}
          disabled={locating}
          aria-label="Add my current location"
          className="inline-flex min-h-12 w-full items-center gap-3 rounded-xl bg-blue-600 px-3 text-left text-white hover:bg-blue-700 disabled:opacity-50 sm:w-auto sm:min-w-[12.5rem]"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/15">
            {locating ? <Loader2 size={18} className="animate-spin" /> : <LocateFixed size={18} />}
          </span>
          <span>
            <span className="block text-[10px] font-black uppercase tracking-widest">
              {locating ? "Finding you" : "Add my location"}
            </span>
            <span className="block text-[11px] font-medium normal-case tracking-normal text-blue-100">
              Phone or browser GPS
            </span>
          </span>
        </button>
        <div className="flex w-full flex-1 gap-2 sm:w-auto sm:justify-end">
          {onCancel ? (
            <button
              type="button"
              onClick={onCancel}
              className={`${portalShell.btnGhost} min-h-11 flex-1 sm:flex-none`}
            >
              Cancel
            </button>
          ) : null}
          <button
            type="submit"
            disabled={submitting}
            className={`${portalShell.btnDanger} min-h-11 flex-1 sm:flex-none`}
          >
            {submitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            {submitting ? "Submitting..." : "Submit Report"}
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain px-6 py-5">
        {introductoryInfo ? (
          <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm font-medium leading-relaxed text-blue-900">
            {introductoryInfo}
          </div>
        ) : null}
        {availabilityMessage ? (
          <div className="rounded-xl border border-amber-100 bg-amber-50 p-3 text-xs font-semibold leading-relaxed text-amber-900">
            {availabilityMessage}
          </div>
        ) : null}

        <div>
          <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Category</label>
          {categoryOverride ? (
            <p className="mt-1 rounded-xl border border-zinc-100 bg-zinc-50 p-3 text-sm font-bold text-zinc-800">
              {categoryOverride}
            </p>
          ) : (
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="w-full mt-1 p-3 bg-gray-50 border border-gray-100 rounded-xl font-bold text-sm"
            >
              {categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          )}
        </div>

        <div>
          <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Severity / Priority</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-1">
            {INCIDENT_SEVERITIES.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setForm({ ...form, severity: s })}
                className={`p-3 rounded-xl font-black text-xs uppercase border-2 transition-all ${
                  form.severity === s
                    ? s === "Critical" ? "border-red-500 bg-red-50 text-red-700"
                      : s === "High" ? "border-orange-500 bg-orange-50 text-orange-700"
                      : "border-blue-500 bg-blue-50 text-blue-700"
                    : "border-gray-100 text-gray-400 hover:border-gray-200"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Description</label>
          <textarea
            required
            rows={4}
            maxLength={5000}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Describe what happened..."
            className="w-full mt-1 p-3 bg-gray-50 border border-gray-100 rounded-xl font-medium text-sm resize-none"
          />
        </div>

        <div>
          <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-1">
            <MapPin size={12} /> Location
          </label>
          <div className="mt-1 flex gap-2">
            <input
              required
              maxLength={500}
              value={form.location}
              onChange={(e) => {
                const location = e.target.value;
                setForm({
                  ...form,
                  location,
                  ...(location.trim() ? {} : { latitude: null, longitude: null }),
                });
              }}
              placeholder="e.g. Bagasbas Beach, Daet"
              className="min-w-0 flex-1 p-3 bg-gray-50 border border-gray-100 rounded-xl font-bold text-sm"
            />
            <button
              type="button"
              onClick={requestLocation}
              disabled={locating}
              aria-label="Add my current location"
              title="Add my location"
              className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {locating ? <Loader2 size={18} className="animate-spin" /> : <LocateFixed size={18} />}
            </button>
          </div>
          <p className={`mt-1 text-[11px] font-medium ${form.latitude != null ? "text-blue-700" : locationMessage ? "text-zinc-600" : "text-zinc-400"}`}>
            {form.latitude != null && form.longitude != null
              ? `GPS pin saved: ${Number(form.latitude).toFixed(5)}, ${Number(form.longitude).toFixed(5)}. The tourism office can open this on a map.`
              : locationMessage || "Tap the location icon to drop a GPS pin, or type the place."}
          </p>
        </div>

        <div>
          <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Evidence (Optional)</label>
          <input
            type="file"
            multiple
            accept="image/*,.pdf"
            onChange={(e) => setFiles(Array.from(e.target.files || []))}
            className="w-full mt-1 text-sm"
          />
          {files.length > 0 && (
            <p className="text-[10px] text-gray-400 mt-1">{files.length} file(s) selected</p>
          )}
        </div>
      </div>
    </form>
  );
}
