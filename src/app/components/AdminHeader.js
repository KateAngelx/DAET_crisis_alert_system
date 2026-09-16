"use client";

import React from "react";
import { User, LogOut } from "lucide-react";
import { BrandLogo } from "@/app/components/BrandLogo";
import { useAuthStore } from "../store/crisisStore";
import Link from "next/link";
import { MobileAdminMenu } from "./MobileAdminMenu";
import { NotificationPanel } from "@/app/components/NotificationPanel";
import { typography } from "@/lib/designSystem";

export function AdminHeader() {
  const { user, logout } = useAuthStore();

  return (
    <header className="h-[72px] bg-white border-b border-zinc-200 px-4 lg:px-6 flex items-center justify-between sticky top-0 z-10 dashboard-shell">
      <div className="flex items-center gap-4">
        <MobileAdminMenu />
        <Link href="/admin" className={`lg:hidden flex items-center gap-2 ${typography.brand} text-zinc-900`}>
          <BrandLogo size={28} />
          <span className={typography.brand}>CONNECT-DAET</span>
        </Link>
        <div className="hidden sm:block">
          <p className={`${typography.statLabel} tracking-[0.2em] text-zinc-400 leading-none mb-0.5`}>Admin portal</p>
          <h1 className={`${typography.pageTitle} leading-none text-zinc-800`}>DAET crisis operations</h1>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <NotificationPanel />

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
            className="lg:hidden p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
            title="Logout"
            aria-label="Logout"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </header>
  );
}
