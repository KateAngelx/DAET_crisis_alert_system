"use client";

import React from 'react';
import { Phone, AlertTriangle } from 'lucide-react';
import { EMERGENCY_FALLBACK } from '@/lib/constants';

export function EmergencyFallbackBanner({ compact = false }) {
  if (compact) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
        <AlertTriangle size={18} className="text-amber-600 shrink-0 mt-0.5" />
        <div>
          <p className="text-xs font-bold text-amber-900">{EMERGENCY_FALLBACK.title}</p>
          <p className="text-[11px] text-amber-800 mt-1">{EMERGENCY_FALLBACK.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-red-50 border-2 border-red-200 rounded-3xl p-6 space-y-4">
      <div className="flex items-start gap-4">
        <div className="p-3 bg-red-100 rounded-2xl shrink-0">
          <AlertTriangle size={24} className="text-red-600" />
        </div>
        <div>
          <h3 className="font-black text-red-900 uppercase tracking-tight">{EMERGENCY_FALLBACK.title}</h3>
          <p className="text-sm text-red-800 mt-2 leading-relaxed">{EMERGENCY_FALLBACK.message}</p>
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
        {EMERGENCY_FALLBACK.hotlines.map((h) => (
          <a
            key={h.number}
            href={`tel:${h.number}`}
            className="flex items-center gap-2 bg-white border border-red-100 rounded-xl p-3 hover:bg-red-100 transition-colors"
          >
            <Phone size={14} className="text-red-600" />
            <div>
              <p className="text-[9px] font-black text-red-400 uppercase">{h.name}</p>
              <p className="text-sm font-black text-red-900">{h.number}</p>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}

export function OfflineNotice() {
  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-80 bg-gray-900 text-white p-4 rounded-2xl shadow-2xl z-50 animate-in slide-in-from-bottom">
      <p className="text-xs font-bold uppercase tracking-widest text-yellow-400 mb-1">Offline Mode</p>
      <p className="text-[11px] text-gray-300">
        You are currently offline. Notifications and reports will sync when your connection is restored.
        For emergencies, use local hotlines: 911 or 117.
      </p>
    </div>
  );
}
