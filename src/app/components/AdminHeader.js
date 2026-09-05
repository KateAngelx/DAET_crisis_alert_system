"use client";

import React from "react";
import { Bell, User, LogOut, Zap } from "lucide-react";
import { useCrisisStore, useAuthStore } from "../store/crisisStore";
import Link from "next/link";
import { MobileAdminMenu } from "./MobileAdminMenu";
import { typography, iconSize } from "@/lib/designSystem";

export function AdminHeader() {
  const alerts = useCrisisStore((state) => state.alerts) || [];
  const { user, logout } = useAuthStore();
  const activeCount = alerts.filter((a) => a.status === "Active").length;

  return (
    <header className="h-[72px] bg-white border-b border-zinc-200 px-4 lg:px-6 flex items-center justify-between sticky top-0 z-10 dashboard-shell">
      <div className="flex items-center gap-4">
        <MobileAdminMenu />
        <Link href="/admin" className={`lg:hidden flex items-center gap-2 ${typography.brand} text-zinc-900`}>
          <Zap size={iconSize.brand} className="text-blue-600" fill="currentColor" />
          <span className={typography.brand}>CONNECT-DAET</span>
        </Link>
        <div className="hidden sm:block">
          <p className={`${typography.statLabel} tracking-[0.2em] text-blue-600 leading-none mb-0.5`}>Administration</p>
          <h1 className={`${typography.pageTitle} leading-none`}>
            Crisis Operations
          </h1>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Link
          href="/crisis/admin"
          className="relative p-2 hover:bg-zinc-100 rounded-xl transition-colors"
          aria-label="Active alerts"
        >
          <Bell size={iconSize.nav} className="text-zinc-600" />
          {activeCount > 0 && (
            <span className="absolute top-0.5 right-0.5 bg-red-600 text-white text-[10px] font-black rounded-full min-w-[18px] h-[18px] flex items-center justify-center border-2 border-white">
              {activeCount}
            </span>
          )}
        </Link>

        <div className="flex items-center gap-2 px-3 py-2 bg-zinc-50 rounded-2xl border border-zinc-100">
          <div className="bg-blue-600 p-1.5 rounded-lg">
            <User size={16} className="text-white" />
          </div>
          <div className="hidden md:block leading-none text-left">
            <p className="text-sm font-black text-zinc-900 truncate max-w-[120px]">{user?.name || "Admin"}</p>
            <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">Administrator</p>
          </div>
          <button
            onClick={logout}
            className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
            title="Logout"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </header>
  );
}
