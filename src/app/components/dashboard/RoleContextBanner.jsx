"use client";

import React from "react";
import { Info } from "lucide-react";
import { useAuthStore } from "@/app/store/crisisStore";

/** Informational helper — shown only to guests on public pages. */
export function RoleContextBanner({ helper, tone = "neutral" }) {
  const { isAuthenticated } = useAuthStore();

  if (!helper || isAuthenticated) return null;

  const tones = {
    neutral: "bg-zinc-50 border-zinc-200 text-zinc-700",
    info: "bg-blue-50 border-blue-100 text-blue-900",
    warn: "bg-amber-50 border-amber-200 text-amber-900",
  };

  return (
    <div className={`flex items-start gap-3 p-4 rounded-2xl border text-sm font-medium ${tones[tone] || tones.neutral}`}>
      <Info className="shrink-0 mt-0.5 opacity-70" size={18} />
      <p>{helper}</p>
    </div>
  );
}
