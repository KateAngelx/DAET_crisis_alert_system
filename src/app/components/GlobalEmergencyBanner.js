"use client";

import React, { useState, useEffect } from "react";
import { useCrisisStore } from "../store/crisisStore";
import { X, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Critical alerts stay visible on every public page until they are resolved.
 * Closing the card shrinks it to a small red button; it never disappears on its own.
 */
export function GlobalEmergencyBanner() {
  const pathname = usePathname();
  const { alerts, isSubscribed, fetchAlerts } = useCrisisStore();
  const [collapsedAlertId, setCollapsedAlertId] = useState(null);

  // Load alerts (and live updates) on pages that don't load them themselves, e.g. Contact or Profile.
  useEffect(() => {
    if (!isSubscribed) fetchAlerts();
  }, [isSubscribed, fetchAlerts]);

  const criticalAlerts = alerts.filter(
    (a) => a.severity === "Critical" && a.status === "Active" && a.is_public !== false
  );
  const latestAlert = criticalAlerts[0];

  // Admin shells: /admin, /crisis/command, /crisis/roads, /crisis/hazards
  const isAdminPage =
    pathname.startsWith("/admin") ||
    pathname.startsWith("/crisis/command") ||
    pathname.startsWith("/crisis/roads") ||
    pathname.startsWith("/crisis/hazards") ||
    pathname.includes("/admin");

  const isAuthPage = pathname === "/login" || pathname === "/register";
  if (!latestAlert || isAdminPage || isAuthPage) return null;

  const more = criticalAlerts.length > 1 ? ` (+${criticalAlerts.length - 1} more)` : "";

  if (collapsedAlertId === latestAlert.id) {
    return (
      <Link
        href="/crisis"
        className="fixed top-[80px] right-4 z-[9999] flex items-center gap-2 rounded-full bg-red-600 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-white shadow-2xl ring-2 ring-red-300 hover:bg-red-700"
        aria-label={`Critical alert active: ${latestAlert.title}. Open Crisis Hub`}
      >
        <ShieldAlert size={14} className="animate-pulse" /> Critical alert{more}
      </Link>
    );
  }

  return (
    <div role="alert" className="fixed top-[80px] right-4 z-[9999] w-full max-w-[300px] animate-in fade-in slide-in-from-right-4 duration-300">
      <div className="bg-slate-900 dark:bg-zinc-950 text-white rounded-2xl shadow-2xl border border-white/10 overflow-hidden ring-1 ring-red-500/50">
        <div className="p-4">
          <div className="flex justify-between items-start mb-2">
            <div className="flex items-center gap-2">
              <span className="bg-red-600 p-1.5 rounded-lg">
                <ShieldAlert size={14} className="text-white" />
              </span>
              <span className="bg-red-600 text-white px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-widest">
                Critical{more}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setCollapsedAlertId(latestAlert.id)}
              className="text-zinc-300 hover:text-white"
              aria-label="Minimize critical alert"
            >
              <X size={16} />
            </button>
          </div>

          <h4 className="text-base font-black tracking-tight leading-tight mb-1">
            {latestAlert.title}
          </h4>
          <p className="text-xs font-semibold text-zinc-300 mb-1">
            {latestAlert.type} · {latestAlert.location}
          </p>
          <p className="text-xs text-zinc-300 mb-4 line-clamp-2 leading-relaxed">
            {latestAlert.message}
          </p>

          <div className="flex gap-2">
            <Link
              href="/crisis"
              className="flex-1 bg-red-600 text-white py-2 rounded-lg text-[10px] font-black uppercase tracking-widest text-center hover:bg-red-700 transition-all"
            >
              Open Crisis Hub
            </Link>
            <a
              href="tel:911"
              className="rounded-lg border border-white/20 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-white hover:bg-white/10"
            >
              Call 911
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
