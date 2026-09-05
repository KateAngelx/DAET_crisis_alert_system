"use client";

import React, { useState, useEffect } from "react";
import { useCrisisStore } from "../store/crisisStore";
import { X, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function GlobalEmergencyBanner() {
  const pathname = usePathname();
  const { alerts } = useCrisisStore();
  const [isVisible, setIsVisible] = useState(false);

  // Filter active critical alerts
  const criticalAlerts = alerts.filter(
    (a) => a.severity === "Critical" && a.status === "Active"
  );

  /**
   * FIX: Mahigpit na check para sa Admin Pages.
   * Kasama na rito ang /admin at /crisis/admin
   */
  const isAdminPage =
    pathname.startsWith("/admin") ||
    pathname.includes("/admin") ||
    pathname.includes("admin");

  const isAuthPage = pathname === "/login" || pathname === "/register";

  useEffect(() => {
    if (criticalAlerts.length > 0 && !isAdminPage && !isAuthPage) {
      setIsVisible(true);
    } else {
      setIsVisible(false);
    }
  }, [criticalAlerts.length, isAdminPage, isAuthPage]);

  if (!isVisible || criticalAlerts.length === 0) return null;

  const latestAlert = criticalAlerts[0];

  return (
    <div className="fixed top-[80px] right-4 z-[9999] w-full max-w-[300px] animate-in fade-in slide-in-from-right-4 duration-300">
      <div className="bg-slate-900 dark:bg-zinc-950 text-white rounded-2xl shadow-2xl border border-white/10 overflow-hidden ring-1 ring-red-500/50">
        <div className="p-4">
          <div className="flex justify-between items-start mb-2">
            <div className="flex items-center gap-2">
              <span className="bg-red-600 p-1.5 rounded-lg animate-pulse">
                <ShieldAlert size={14} className="text-white" />
              </span>
              <span className="text-[10px] font-black uppercase tracking-widest text-red-500">
                {latestAlert.severity}
              </span>
            </div>
            <button onClick={() => setIsVisible(false)} className="text-zinc-500 hover:text-white">
              <X size={16} />
            </button>
          </div>
          
          <h4 className="text-sm font-black uppercase tracking-tight leading-tight mb-1">
            {latestAlert.title}
          </h4>
          <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-tighter mb-1">
            {latestAlert.type} · {latestAlert.location}
          </p>
          <p className="text-[10px] text-zinc-500 mb-4 line-clamp-2 leading-relaxed">
            {latestAlert.message}
          </p>

          <div className="flex gap-2">
            <Link 
              href="/crisis/alerts" 
              onClick={() => setIsVisible(false)}
              className="flex-1 bg-zinc-800 text-white py-2 rounded-lg text-[10px] font-black uppercase tracking-widest text-center hover:bg-zinc-700 transition-all"
            >
              Full Details
            </Link>
            <Link 
              href="/crisis" 
              onClick={() => setIsVisible(false)}
              className="flex-1 bg-red-600 text-white py-2 rounded-lg text-[10px] font-black uppercase tracking-widest text-center hover:bg-red-700 transition-all"
            >
              View on Map
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}