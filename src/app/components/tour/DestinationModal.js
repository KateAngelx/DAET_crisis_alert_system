"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  X, MapPin, Calendar, Clock, Users, Phone, Mail, AlertTriangle, ShieldCheck, Loader2, Pencil, Navigation,
} from "lucide-react";
import { Card } from "@/app/components/ui/Card";
import { formatTourRoute, formatTourDate, getRelevantAlertsForGroup } from "@/lib/tourGroupRoute";

function InfoRow({ label, value, icon: Icon }) {
  if (!value) return null;
  return (
    <div>
      <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-1">{label}</p>
      <p className="text-sm font-medium text-zinc-800 flex items-start gap-2">
        {Icon && <Icon size={14} className="text-blue-500 shrink-0 mt-0.5" />}
        <span>{value}</span>
      </p>
    </div>
  );
}

export function DestinationModal({
  open,
  onClose,
  group,
  guide,
  members = [],
  alerts = [],
  editable = false,
  onSave,
}) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [form, setForm] = useState({});

  useEffect(() => {
    if (open && group) {
      setForm({
        starting_location: group.starting_location || "",
        destination: group.destination || "",
        trip_info: group.trip_info || "",
        start_date: group.start_date || "",
        end_date: group.end_date || "",
        meeting_location: group.meeting_location || "",
        estimated_travel_time: group.estimated_travel_time || "",
        destination_notes: group.destination_notes || "",
      });
      setEditing(false);
      setError(null);

    }
  }, [open, group, members.length]);

  const relevantAlerts = useMemo(
    () => getRelevantAlertsForGroup(alerts, group),
    [alerts, group]
  );

  if (!open || !group) return null;

  const handleSave = async (e) => {
    e.preventDefault();
    if (!onSave) return;
    setSaving(true);
    setError(null);
    const result = await onSave({
      starting_location: form.starting_location.trim(),
      destination: form.destination.trim(),
      trip_info: form.trip_info.trim() || null,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
      meeting_location: form.meeting_location.trim() || null,
      estimated_travel_time: form.estimated_travel_time.trim() || null,
      destination_notes: form.destination_notes.trim() || null,
    });
    setSaving(false);
    if (result?.success) {
      setEditing(false);
    } else {
      setError(result?.error || "Failed to update route.");
    }
  };

  const routeLabel = formatTourRoute(group);
  const tourDate = formatTourDate(group);

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl custom-scrollbar">
        <div className="sticky top-0 bg-white border-b border-zinc-100 px-6 py-4 flex items-start justify-between gap-4 rounded-t-3xl z-10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Navigation size={18} className="text-blue-600" />
              <h2 className="text-lg font-black uppercase tracking-tight text-zinc-900">Destination & Route</h2>
            </div>
            <p className="text-sm font-bold text-zinc-700">{group.name}</p>
            {!editing && (
              <p className="text-sm text-blue-600 font-black mt-1">{routeLabel}</p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {editable && !editing && (
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="flex items-center gap-1 px-3 py-2 text-[10px] font-black uppercase text-blue-600 bg-blue-50 rounded-xl hover:bg-blue-100"
              >
                <Pencil size={12} /> Edit Route
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-2 hover:bg-zinc-100 rounded-full transition-colors"
              aria-label="Close"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {error && (
            <p className="text-sm text-red-600 font-medium p-3 bg-red-50 rounded-xl border border-red-100">{error}</p>
          )}

          {editing ? (
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-zinc-400">From (Starting Location)</label>
                  <input
                    required
                    value={form.starting_location}
                    onChange={(e) => setForm({ ...form, starting_location: e.target.value })}
                    className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl text-sm font-bold"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-zinc-400">To (Destination)</label>
                  <input
                    required
                    value={form.destination}
                    onChange={(e) => setForm({ ...form, destination: e.target.value })}
                    className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl text-sm font-bold"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-zinc-400">Tour Date</label>
                  <input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl text-sm font-bold" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-zinc-400">End Date (optional)</label>
                  <input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl text-sm font-bold" />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-zinc-400">Route / Travel Information</label>
                <textarea rows={3} value={form.trip_info} onChange={(e) => setForm({ ...form, trip_info: e.target.value })} className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl text-sm font-medium" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-zinc-400">Meeting / Pickup Location</label>
                  <input value={form.meeting_location} onChange={(e) => setForm({ ...form, meeting_location: e.target.value })} className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl text-sm font-bold" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-zinc-400">Estimated Travel Time</label>
                  <input value={form.estimated_travel_time} onChange={(e) => setForm({ ...form, estimated_travel_time: e.target.value })} placeholder="e.g. 4 hours" className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl text-sm font-bold" />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-zinc-400">Important Destination Information</label>
                <textarea rows={3} value={form.destination_notes} onChange={(e) => setForm({ ...form, destination_notes: e.target.value })} className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl text-sm font-medium" />
              </div>
              <div className="flex gap-3">
                <button type="submit" disabled={saving} className="px-5 py-2.5 bg-blue-600 text-white rounded-xl font-black uppercase text-xs tracking-widest disabled:opacity-50 flex items-center gap-2">
                  {saving ? <><Loader2 size={14} className="animate-spin" /> Saving...</> : "Save Route"}
                </button>
                <button type="button" onClick={() => setEditing(false)} className="px-5 py-2.5 bg-zinc-100 text-zinc-600 rounded-xl font-black uppercase text-xs tracking-widest">
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <>
              <Card className="p-5 bg-blue-50/50 border-blue-100">
                <p className="text-[10px] font-black uppercase tracking-widest text-blue-600 mb-2">Route</p>
                <p className="text-xl font-black text-zinc-900">{routeLabel}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                  <InfoRow label="From" value={group.starting_location} icon={MapPin} />
                  <InfoRow label="To" value={group.destination} icon={MapPin} />
                  <InfoRow label="Tour Date" value={tourDate} icon={Calendar} />
                  <InfoRow label="Estimated Travel Time" value={group.estimated_travel_time} icon={Clock} />
                </div>
              </Card>

              <InfoRow label="Route / Travel Information" value={group.trip_info} />
              <InfoRow label="Meeting / Pickup Location" value={group.meeting_location} icon={MapPin} />
              <InfoRow label="Important Destination Information" value={group.destination_notes} />

              {guide && (
                <Card className="p-5 border-zinc-100">
                  <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-3">Assigned Guide</p>
                  <p className="font-bold text-zinc-900">{guide.full_name}</p>
                  <div className="flex flex-wrap gap-4 mt-2 text-xs text-zinc-500">
                    {guide.phone && <span className="flex items-center gap-1"><Phone size={12} /> {guide.phone}</span>}
                    {guide.email && <span className="flex items-center gap-1"><Mail size={12} /> {guide.email}</span>}
                  </div>
                </Card>
              )}

              <Card className="p-5 border-zinc-100">
                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-3 flex items-center gap-2">
                  <Users size={14} /> Tourists in Group ({members.length})
                </p>
                {members.length === 0 ? (
                  <p className="text-sm text-zinc-400">No tourists assigned yet.</p>
                ) : (
                  <ul className="space-y-2">
                    {members.map((m) => (
                      <li key={m.id || m.tourist_id} className="flex items-center justify-between py-2 px-3 bg-zinc-50 rounded-xl text-sm">
                        <span className="font-medium text-zinc-800">{m.tourist?.full_name || m.full_name}</span>
                        <span className="text-xs text-zinc-400">{m.tourist?.nationality || m.nationality || "—"}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>

              <Card className={`p-5 border-zinc-100 ${relevantAlerts.length > 0 ? "bg-red-50/30 border-red-100" : ""}`}>
                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-3 flex items-center gap-2">
                  {relevantAlerts.length > 0 ? (
                    <AlertTriangle size={14} className="text-red-600" />
                  ) : (
                    <ShieldCheck size={14} className="text-green-600" />
                  )}
                  Emergency / Crisis Information
                </p>
                {relevantAlerts.length === 0 ? (
                  <p className="text-sm text-zinc-500">No active crisis advisories specifically match this route or destination.</p>
                ) : (
                  <div className="space-y-3">
                    {relevantAlerts.map((alert) => (
                      <div key={alert.id} className="p-3 bg-white rounded-xl border border-red-100">
                        <p className="text-[10px] font-black uppercase text-red-600">{alert.severity} · {alert.alert_type || alert.type}</p>
                        <p className="font-bold text-zinc-900 text-sm mt-1">{alert.title}</p>
                        <p className="text-xs text-zinc-600 mt-1 line-clamp-2">{alert.description || alert.message}</p>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export function DestinationButton({ onClick, className = "" }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 transition-colors ${className}`}
    >
      <MapPin size={12} /> Destination
    </button>
  );
}
