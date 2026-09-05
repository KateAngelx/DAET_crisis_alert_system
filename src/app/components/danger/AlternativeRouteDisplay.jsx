"use client";

import React from "react";
import { MapPin, ArrowRight, Navigation, ShieldCheck } from "lucide-react";
import { iconSize } from "@/lib/designSystem";

export function AlternativeRouteDisplay({ warning, compact = false }) {
  const from = warning.current_location || "Current Location";
  const via = warning.alternative_route;
  const to = warning.destination;

  if (compact) {
    return (
      <div className="flex flex-wrap items-center gap-1.5 text-xs font-bold text-zinc-700">
        <span className="inline-flex items-center gap-1 text-zinc-500">
          <MapPin size={iconSize.inlineSm} className="text-zinc-400" />
          {from}
        </span>
        <ArrowRight size={12} className="text-blue-500 shrink-0" />
        <span className="inline-flex items-center gap-1 text-blue-700 bg-blue-50 px-2 py-0.5 rounded-lg">
          <Navigation size={iconSize.inlineSm} />
          {via}
        </span>
        <ArrowRight size={12} className="text-green-600 shrink-0" />
        <span className="inline-flex items-center gap-1 text-green-700">
          <ShieldCheck size={iconSize.inlineSm} />
          {to}
        </span>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-blue-200 bg-blue-50/60 p-4 space-y-3">
      <p className="text-[10px] font-black uppercase tracking-widest text-blue-700 flex items-center gap-1.5">
        <Navigation size={iconSize.inlineSm} /> Recommended Alternative Route
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr_auto_1fr] gap-2 sm:gap-3 items-center">
        <div className="p-3 rounded-xl bg-white border border-zinc-100 text-left">
          <p className="text-[9px] font-black uppercase text-zinc-400 mb-1">From</p>
          <p className="text-sm font-bold text-zinc-800">{from}</p>
        </div>
        <ArrowRight className="hidden sm:block text-blue-500 mx-auto" size={18} />
        <div className="p-3 rounded-xl bg-blue-600 text-white text-left shadow-sm">
          <p className="text-[9px] font-black uppercase text-blue-100 mb-1">Safer Route</p>
          <p className="text-sm font-bold">{via}</p>
        </div>
        <ArrowRight className="hidden sm:block text-green-600 mx-auto" size={18} />
        <div className="p-3 rounded-xl bg-green-50 border border-green-200 text-left">
          <p className="text-[9px] font-black uppercase text-green-700 mb-1">Destination</p>
          <p className="text-sm font-bold text-green-900">{to}</p>
        </div>
      </div>
    </div>
  );
}
