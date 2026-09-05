"use client";

import React, { useState } from "react";
import { MapPin, Upload, Send, Loader2 } from "lucide-react";
import { useAuthStore } from "@/app/store/crisisStore";
import { useIncidentStore } from "@/app/store/incidentStore";
import { INCIDENT_CATEGORIES, INCIDENT_SEVERITIES } from "@/lib/constants";

const INITIAL_FORM = {
  category: "Accident",
  description: "",
  location: "",
  severity: "Medium",
};

export function IncidentReportForm({ onSuccess, onCancel, compact = false }) {
  const { user } = useAuthStore();
  const { submitReport, loading } = useIncidentStore();
  const [form, setForm] = useState(INITIAL_FORM);
  const [files, setFiles] = useState([]);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!form.description.trim() || !form.location.trim()) {
      setError("Please provide a description and location.");
      return;
    }

    const result = await submitReport({ ...form, reporterId: user.id }, files);

    if (result.success) {
      setForm(INITIAL_FORM);
      setFiles([]);
      onSuccess?.(result.incident);
    } else {
      setError(result.error);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={`space-y-5 ${compact ? "" : ""}`}>
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-2xl text-sm font-bold">
          {error}
        </div>
      )}

      <div>
        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Category</label>
        <select
          value={form.category}
          onChange={(e) => setForm({ ...form, category: e.target.value })}
          className="w-full mt-1 p-3 bg-gray-50 border border-gray-100 rounded-xl font-bold text-sm"
        >
          {INCIDENT_CATEGORIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
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
        <input
          required
          value={form.location}
          onChange={(e) => setForm({ ...form, location: e.target.value })}
          placeholder="e.g. Bagasbas Beach, Daet"
          className="w-full mt-1 p-3 bg-gray-50 border border-gray-100 rounded-xl font-bold text-sm"
        />
      </div>

      <div>
        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-1">
          <Upload size={12} /> Evidence (Optional)
        </label>
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

      <div className={`flex gap-3 ${onCancel ? "" : ""}`}>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-4 border border-zinc-200 text-zinc-600 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-zinc-50"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={loading}
          className={`${onCancel ? "flex-1" : "w-full"} py-4 bg-red-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest flex items-center justify-center gap-2 hover:bg-red-700 disabled:opacity-50`}
        >
          {loading ? <><Loader2 size={18} className="animate-spin" /> Submitting...</> : <><Send size={18} /> Submit Report</>}
        </button>
      </div>
    </form>
  );
}
