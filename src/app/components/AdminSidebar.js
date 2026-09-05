"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuthStore } from "@/app/store/crisisStore";
import {
  LayoutDashboard, Users, Workflow, AlertTriangle, FileWarning, Zap, LogOut,
} from "lucide-react";
import { ADMIN_NAV, isNavActive } from "@/lib/dashboardNav";
import { typography, iconSize } from "@/lib/designSystem";

const ICONS = {
  Dashboard: LayoutDashboard,
  Users,
  "Alert Pipeline": Workflow,
  "Command Center": AlertTriangle,
  "Incident Reports": FileWarning,
};

function Logo() {
  return (
    <div className="h-[72px] border-b border-zinc-200 px-6 flex items-center gap-3">
      <div className="bg-blue-600 rounded-lg size-8 flex items-center justify-center shadow-lg shadow-blue-600/20">
        <Zap size={iconSize.brand} className="text-white" fill="white" />
      </div>
      <div className="leading-none">
        <span className={`${typography.brand} text-blue-600 block`}>CONNECT-DAET</span>
        <span className={`${typography.badge} text-zinc-400 tracking-widest`}>Admin Portal</span>
      </div>
    </div>
  );
}

function NavLink({ item, pathname, variant = "default" }) {
  const Icon = ICONS[item.label] || LayoutDashboard;
  const active = isNavActive(pathname, item.path);
  const activeClass =
    variant === "crisis" && active
      ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20"
      : active
        ? "bg-blue-50 text-blue-600 ring-1 ring-blue-100"
        : "text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900";

  return (
    <Link
      href={item.path}
      className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-200 ${activeClass}`}
    >
      <Icon size={iconSize.nav} />
      <span className="font-bold text-sm">{item.label}</span>
    </Link>
  );
}

export function AdminSidebar() {
  const pathname = usePathname();
  const { logout } = useAuthStore();

  return (
    <aside className="w-[280px] bg-white border-r border-zinc-200 flex flex-col h-screen sticky top-0 hidden lg:flex dashboard-shell">
      <Logo />

      <div className="flex-1 overflow-y-auto px-4 py-6 custom-scrollbar">
        <div className="mb-8">
          <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] mb-4 px-4">
            Administration
          </h3>
          <div className="space-y-1">
            {ADMIN_NAV.coreAdmin.map((item) => (
              <NavLink key={item.path} item={item} pathname={pathname} />
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] mb-4 px-4">
            Crisis Operations
          </h3>
          <div className="space-y-1">
            {ADMIN_NAV.crisisOps.map((item) => (
              <NavLink key={item.path} item={item} pathname={pathname} variant="crisis" />
            ))}
          </div>
        </div>
      </div>

      <div className="p-4 border-t border-zinc-100 space-y-3">
        <div className="bg-zinc-50 rounded-2xl p-4 border border-zinc-100">
          <p className="text-[10px] font-black text-zinc-400 uppercase mb-1 tracking-widest">System Status</p>
          <div className="flex items-center gap-2">
            <div className="size-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-xs font-bold text-zinc-700">Alert Channels Active</span>
          </div>
        </div>
        <button
          onClick={logout}
          className="w-full flex items-center justify-center gap-2 bg-red-50 text-red-600 px-4 py-3 rounded-2xl hover:bg-red-100 transition-colors font-black text-sm border border-red-100"
        >
          <LogOut size={18} /> Logout
        </button>
      </div>
    </aside>
  );
}
