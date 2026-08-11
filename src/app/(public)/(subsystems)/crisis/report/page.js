"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  AlertTriangle, MapPin, Upload, Send, Loader2, CheckCircle, ArrowLeft,
} from 'lucide-react';
import { Card } from '@/app/components/ui/Card';
import { useAuthStore } from '@/app/store/crisisStore';
import { useIncidentStore } from '@/app/store/incidentStore';
import { EmergencyFallbackBanner } from '@/app/components/EmergencyFallbackBanner';
import {
  INCIDENT_CATEGORIES, INCIDENT_SEVERITIES,
} from '@/lib/constants';

export default function ReportIncidentPage() {
  const { user, isAuthenticated } = useAuthStore();
  const { submitReport, loading } = useIncidentStore();
  const router = useRouter();

  const [form, setForm] = useState({
    category: 'Accident',
    description: '',
    location: '',
    severity: 'Medium',
  });
  const [files, setFiles] = useState([]);
  const [submitted, setSubmitted] = useState(null);
  const [error, setError] = useState(null);

  if (!isAuthenticated) {
    return (
      <div className="max-w-lg mx-auto py-20 text-center space-y-4">
        <AlertTriangle size={48} className="mx-auto text-amber-500" />
        <h1 className="text-2xl font-black uppercase">Login Required</h1>
        <p className="text-gray-500 text-sm">Please sign in to submit an incident report.</p>
        <Link href="/login" className="inline-block bg-blue-600 text-white px-8 py-3 rounded-full font-black text-xs uppercase tracking-widest">
          Sign In
        </Link>
      </div>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!form.description.trim() || !form.location.trim()) {
      setError('Please provide a description and location.');
      return;
    }

    const result = await submitReport(
      { ...form, reporterId: user.id },
      files
    );

    if (result.success) {
      setSubmitted(result.incident);
    } else {
      setError(result.error);
    }
  };

  if (submitted) {
    return (
      <div className="max-w-lg mx-auto py-12 space-y-6">
        <Card className="p-8 text-center space-y-4">
          <CheckCircle size={64} className="mx-auto text-green-500" />
          <h1 className="text-2xl font-black uppercase text-green-700">Report Submitted</h1>
          <p className="text-gray-600">Your incident has been received by our crisis management team.</p>
          <div className="bg-gray-50 rounded-2xl p-4">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Reference Number</p>
            <p className="text-2xl font-black text-blue-600 font-mono">{submitted.reference_number}</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href={`/crisis/reports/${submitted.id}`} className="bg-blue-600 text-white px-6 py-3 rounded-full font-black text-xs uppercase">
              Track Status
            </Link>
            <Link href="/crisis/reports" className="border border-gray-200 px-6 py-3 rounded-full font-black text-xs uppercase text-gray-600">
              My Reports
            </Link>
          </div>
        </Card>
        <EmergencyFallbackBanner compact />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-8 space-y-6">
      <Link href="/crisis" className="inline-flex items-center gap-2 text-xs font-black uppercase text-gray-400 hover:text-blue-600">
        <ArrowLeft size={14} /> Back to Crisis Hub
      </Link>

      <div>
        <h1 className="text-3xl font-black uppercase tracking-tight text-gray-900">Report an Incident</h1>
        <p className="text-gray-500 mt-1">Submit details about an emergency, hazard, or tourism-related concern.</p>
      </div>

      <EmergencyFallbackBanner compact />

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-2xl text-sm font-bold">
          {error}
        </div>
      )}

      <Card className="p-6 sm:p-8">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Category</label>
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="w-full mt-1 p-3 bg-gray-50 border border-gray-100 rounded-xl font-bold text-sm"
            >
              {INCIDENT_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
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
                      ? s === 'Critical' ? 'border-red-500 bg-red-50 text-red-700'
                        : s === 'High' ? 'border-orange-500 bg-orange-50 text-orange-700'
                        : 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-100 text-gray-400 hover:border-gray-200'
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

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-red-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest flex items-center justify-center gap-2 hover:bg-red-700 disabled:opacity-50"
          >
            {loading ? <><Loader2 size={18} className="animate-spin" /> Submitting...</> : <><Send size={18} /> Submit Report</>}
          </button>
        </form>
      </Card>
    </div>
  );
}
