"use client";

import React, { useState } from "react";
import { AlertTriangle, FileWarning, LayoutDashboard, LogOut, User, Users } from "lucide-react";
import { BrandLogo } from "@/app/components/BrandLogo";
import { useAuthStore } from "../store/crisisStore";
import Link from "next/link";
import { MobileAdminMenu } from "./MobileAdminMenu";
import { NotificationPanel } from "@/app/components/NotificationPanel";
import { typography } from "@/lib/designSystem";
import { InstalledBottomNav } from "@/app/components/shell/InstalledBottomNav";
import { useInstalledApp } from "@/lib/useInstalledApp";

const ADMIN_BOTTOM_NAV = [
  { href: "/admin", short: "Home", icon: LayoutDashboard },
  { href: "/admin/users", short: "Users", icon: Users },
  { href: "/crisis/command", short: "Command", icon: AlertTriangle },
  { href: "/admin/incidents", short: "Incidents", icon: FileWarning },
];

export function AdminHeader() {
  const { user, logout } = useAuthStore();
  const [menuOpen, setMenuOpen] = useState(false);
  useInstalledApp();

  return (
    <header className="h-16 shrink-0 bg-white border-b border-zinc-200 px-2.5 sm:px-4 lg:px-6 flex items-center justify-between sticky top-0 z-10 dashboard-shell">
      <div className="flex min-w-0 items-center gap-2 sm:gap-4">
        <MobileAdminMenu
          open={menuOpen}
          onOpen={() => setMenuOpen(true)}
          onClose={() => setMenuOpen(false)}
        />
        <Link href="/admin" className={`lg:hidden flex items-center gap-2 ${typography.brand} text-zinc-900`}>
          <BrandLogo size={28} />
        </Link>
        <div className="hidden sm:block">
          <p className={`${typography.statLabel} tracking-[0.2em] text-zinc-400 leading-none mb-0.5`}>Admin portal</p>
          <h1 className={`${typography.pageTitle} leading-none text-zinc-800`}>DAET crisis operations</h1>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1.5 sm:gap-3">
        <NotificationPanel />

        <div className="flex items-center gap-1 rounded-2xl border border-zinc-100 bg-zinc-50 px-1.5 py-1.5 sm:gap-2 sm:px-3 sm:py-2">
          <div className="hidden rounded-lg bg-blue-600 p-1.5 sm:block">
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
      <InstalledBottomNav
        items={ADMIN_BOTTOM_NAV}
        onMore={() => setMenuOpen(true)}
        menuOpen={menuOpen}
      />
    </header>
  );
}
