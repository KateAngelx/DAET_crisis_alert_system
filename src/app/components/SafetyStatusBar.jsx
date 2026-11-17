"use client";

import React from "react";
import Link from "next/link";
import { AlertTriangle, ChevronRight, Loader2, ShieldAlert, ShieldCheck, WifiOff } from "lucide-react";
import { getSafetyStatus } from "@/lib/safetyStatus";

const TONES = {
  loading: { className: "border-zinc-200 bg-white text-zinc-700", Icon: Loader2, iconClass: "animate-spin text-zinc-400" },
  error: { className: "border-zinc-300 bg-zinc-50 text-zinc-800", Icon: WifiOff, iconClass: "text-zinc-500" },
  critical: { className: "border-red-300 bg-red-600 text-white", Icon: ShieldAlert, iconClass: "text-white" },
  high: { className: "border-orange-300 bg-orange-50 text-orange-900", Icon: AlertTriangle, iconClass: "text-orange-600" },
  low: { className: "border-amber-200 bg-amber-50 text-amber-900", Icon: AlertTriangle, iconClass: "text-amber-600" },
  safe: { className: "border-green-200 bg-green-50 text-green-900", Icon: ShieldCheck, iconClass: "text-green-600" },
};

/** `href`: send every tap to this page instead (e.g. the guide's own Alerts page). */
export function SafetyStatusBar({ alerts, loading, error, loaded = true, href = null, className = "" }) {
  const status = getSafetyStatus(alerts, { loading, error, loaded });
  if (href) status.href = href;
  const tone = TONES[status.tone];
  const Icon = tone.Icon;

  return (
    <Link
      href={status.href}
      role="status"
      aria-live="polite"
      className={`flex w-full items-center gap-3 rounded-2xl border px-4 py-3 shadow-sm transition-opacity hover:opacity-90 ${tone.className} ${className}`}
    >
      <Icon size={20} className={`shrink-0 ${tone.iconClass}`} aria-hidden />
      <span className="min-w-0 flex-1 text-sm font-bold leading-snug">{status.text}</span>
      <ChevronRight size={18} className="shrink-0 opacity-70" aria-hidden />
    </Link>
  );
}
