"use client";

import React, { useState } from "react";
import { User, LogOut, LayoutDashboard, AlertTriangle, Route, FileWarning } from "lucide-react";
import { useInstalledApp } from "@/lib/useInstalledApp";
import { InstalledBottomNav } from "@/app/components/shell/InstalledBottomNav";
import { BrandLogo } from "@/app/components/BrandLogo";
import { useAuthStore } from "../store/crisisStore";
import Link from "next/link";
import { MobileAdminMenu } from "./MobileAdminMenu";
import { NotificationPanel } from "@/app/components/NotificationPanel";
import { typography } from "@/lib/designSystem";

const ADMIN_APP_NAV = [
  { href: "/admin", short: "Home", icon: LayoutDashboard },
  { href: "/crisis/admin", short: "Crisis", icon: AlertTriangle },
  { href: "/crisis/admin/routes", short: "Roads", icon: Route },
  { href: "/admin/incidents", short: "Reports", icon: FileWarning },
];

export function AdminHeader() {
  const { user, logout } = useAuthStore();
  const installed = useInstalledApp();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
    <header className="h-[72px] bg-white border-b border-zinc-200 px-4 lg:px-6 flex items-center justify-between sticky top-0 z-10 dashboard-shell">
      <div className="flex items-center gap-4">
        <MobileAdminMenu hideButton={installed} open={menuOpen} onOpenChange={setMenuOpen} />
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
    {installed ? (
      <InstalledBottomNav items={ADMIN_APP_NAV} onMore={() => setMenuOpen(true)} />
    ) : null}
    </>
  );
}
