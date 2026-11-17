"use client";

import React, { useState } from "react";
import Link from "next/link";
import { CheckCircle2, Loader2, LocateFixed, Phone, Send } from "lucide-react";
import { INCIDENT_SEVERITIES } from "@/lib/constants";
import { GUEST_INCIDENT_CATEGORIES } from "@/lib/guestIncidentReport";
import { allEmergencyHotlines, hotlineTel } from "@/lib/siteInfo";
import { portalShell } from "@/lib/designSystem";

const INITIAL_FORM = {
  name: "",
  phone: "",
  email: "",
  category: "Accident",
  severity: "Medium",
  location: "",
  description: "",
  latitude: null,
  longitude: null,
  website: "", // hidden spam trap — people never see or fill it
};

const label = "block text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-1";

/** Incident report for walk-in tourists with no account. */
export function GuestIncidentReportForm() {
  const [form, setForm] = useState(INITIAL_FORM);
  const [startedAt] = useState(() => Date.now());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [locating, setLocating] = useState(false);
  const [locationMessage, setLocationMessage] = useState("");
  const [referenceNumber, setReferenceNumber] = useState("");

  const update = (field) => (event) => setForm((current) => ({ ...current, [field]: event.target.value }));

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
        setLocationMessage("Location added. You can edit the place name.");
        setLocating(false);
      },
      (locationError) => {
        setLocationMessage(
          locationError.code === 1
            ? "Location permission was denied. Type the place instead."
            : "Could not read your location. Type the place instead."
        );
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 }
    );
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    if (!form.phone.trim() && !form.email.trim()) {
      setError("Enter a mobile number or email so the tourism office can reach you.");
      return;
    }
    setSubmitting(true);
    try {
      const response = await fetch("/api/incidents/guest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, startedAt }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.success) {
        setError(
          response.status === 429
            ? "Too many reports from this device or contact. Please wait, or call the hotlines below."
            : data.error || "We could not send your report. Please try again or call the hotlines below."
        );
        return;
      }
      setReferenceNumber(data.referenceNumber);
    } catch {
      setError("No connection. Please try again, or call the hotlines below.");
    } finally {
      setSubmitting(false);
    }
  };

  const hotlines = (
    <div className="rounded-xl border border-red-200 bg-red-50 p-4">
      <p className="text-xs font-black uppercase tracking-widest text-red-700">Life-threatening emergency? Call now</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {allEmergencyHotlines.slice(0, 4).map((h) => (
          <a
            key={h.name}
            href={`tel:${hotlineTel(h)}`}
            className="inline-flex items-center gap-1.5 rounded-lg border border-red-100 bg-white px-3 py-1.5 text-xs font-black text-red-800 hover:bg-red-100"
          >
            <Phone size={12} /> {h.name}: {h.number}
          </a>
        ))}
      </div>
    </div>
  );

  if (referenceNumber) {
    return (
      <div className="space-y-4">
        <div className="rounded-2xl border border-green-200 bg-green-50 p-5" role="status">
          <CheckCircle2 className="text-green-600" size={28} />
          <h2 className="mt-2 text-lg font-black text-green-900">Report sent to the Tourism Office</h2>
          <p className="mt-1 text-sm font-medium text-green-900">
            Your reference number is <strong className="font-black">{referenceNumber}</strong>. Keep it and quote it if
            you call the office. Staff will contact you on the number or email you gave.
          </p>
        </div>
        {hotlines}
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={portalShell.btnGhost}
            onClick={() => {
              setForm(INITIAL_FORM);
              setReferenceNumber("");
              setLocationMessage("");
            }}
          >
            Send another report
          </button>
          <Link href="/register" className={portalShell.btnPrimary}>
            Create an account to track reports
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      {hotlines}

      {/* Spam trap: hidden from people and screen readers; bots tend to fill every field. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label>
          Website
          <input type="text" tabIndex={-1} autoComplete="off" value={form.website} onChange={update("website")} />
        </label>
      </div>

      <fieldset className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <legend className="mb-2 text-sm font-black text-zinc-900">Your contact details</legend>
        <div>
          <label htmlFor="guest-name" className={label}>Name *</label>
          <input id="guest-name" required maxLength={80} autoComplete="name" className={portalShell.input} value={form.name} onChange={update("name")} />
        </div>
        <div>
          <label htmlFor="guest-phone" className={label}>Mobile number</label>
          <input id="guest-phone" type="tel" inputMode="tel" maxLength={30} autoComplete="tel" placeholder="0917 123 4567" className={portalShell.input} value={form.phone} onChange={update("phone")} />
        </div>
        <div>
          <label htmlFor="guest-email" className={label}>Email</label>
          <input id="guest-email" type="email" maxLength={120} autoComplete="email" className={portalShell.input} value={form.email} onChange={update("email")} />
        </div>
        <p className="text-[11px] font-medium text-zinc-500 sm:col-span-3">
          Give a mobile number or an email (or both) so the Tourism Office can follow up with you.
        </p>
      </fieldset>

      <fieldset className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <legend className="mb-2 text-sm font-black text-zinc-900">What happened</legend>
        <div>
          <label htmlFor="guest-category" className={label}>Type *</label>
          <select id="guest-category" className={portalShell.select} value={form.category} onChange={update("category")}>
            {GUEST_INCIDENT_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="guest-severity" className={label}>How serious *</label>
          <select id="guest-severity" className={portalShell.select} value={form.severity} onChange={update("severity")}>
            {INCIDENT_SEVERITIES.map((s) => <option key={s}>{s}</option>)}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="guest-location" className={label}>Where *</label>
          <div className="flex gap-2">
            <input id="guest-location" required maxLength={500} placeholder="e.g. Bagasbas Beach, near the lifeguard tower" className={portalShell.input} value={form.location} onChange={update("location")} />
            <button
              type="button"
              onClick={requestLocation}
              disabled={locating}
              className={`${portalShell.btnGhost} shrink-0`}
              aria-label="Use my current location"
            >
              {locating ? <Loader2 size={14} className="animate-spin" /> : <LocateFixed size={14} />}
              <span className="hidden sm:inline">My location</span>
            </button>
          </div>
          {locationMessage ? <p className="mt-1 text-[11px] font-medium text-zinc-500">{locationMessage}</p> : null}
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="guest-description" className={label}>Details *</label>
          <textarea
            id="guest-description"
            required
            rows={4}
            maxLength={2000}
            placeholder="What happened, who is affected, and what help is needed."
            className={portalShell.input}
            value={form.description}
            onChange={update("description")}
          />
        </div>
      </fieldset>

      {error ? (
        <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-700">{error}</p>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={submitting} className={`${portalShell.btnPrimary} min-h-11 disabled:opacity-50`}>
          {submitting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
          {submitting ? "Sending…" : "Send report"}
        </button>
        <p className="text-[11px] font-medium text-zinc-500">
          Have an account? <Link href="/login" className="font-bold text-blue-600 hover:underline">Sign in</Link> to add photos and track your report.
        </p>
      </div>
    </form>
  );
}
