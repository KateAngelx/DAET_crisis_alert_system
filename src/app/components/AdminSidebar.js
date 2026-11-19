"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuthStore } from "@/app/store/crisisStore";
import {
  LayoutDashboard,
  Users,
  AlertTriangle,
  FileWarning,
  LogOut,
  Archive,
  LifeBuoy,
  Route,
  Settings,
  Compass,
  Siren,
  UserSearch,
} from "lucide-react";
import { BrandLogo } from "@/app/components/BrandLogo";
import { ADMIN_NAV_SECTIONS, isNavActive } from "@/lib/dashboardNav";
import { typography, iconSize } from "@/lib/designSystem";
import { useDashboardNavCounts } from "@/app/components/dashboard/DashboardNavCountsProvider";
import { DashboardNavCountBadge } from "@/app/components/dashboard/DashboardNavCountBadge";

/** Icons by nav item id (labels can change; ids do not). */
const ICONS = {
  dashboard: LayoutDashboard,
  alerts: AlertTriangle,
  reports: FileWarning,
  help: LifeBuoy,
  roads: Route,
  missing: UserSearch,
  guideEmergencies: Siren,
  guideMonitoring: Compass,
  people: Users,
  history: Archive,
  settings: Settings,
};

const SECTION_ACCENT = {
  "Command center": "crisis",
  Tourists: "tourist",
  Guides: "guide",
  "Accounts & records": "default",
};

function Logo() {
  return (
    <div className="h-[72px] border-b border-zinc-200 bg-zinc-50/80 px-6 flex items-center gap-3">
      <BrandLogo size={32} />
      <div className="leading-none">
        <span className={`${typography.brand} text-blue-600 block`}>CONNECT-DAET</span>
        <span className={`${typography.badge} text-zinc-400 tracking-widest`}>Admin Portal</span>
      </div>
    </div>
  );
}

function NavLink({ item, pathname, variant = "default", counts }) {
  const Icon = ICONS[item.id] || LayoutDashboard;
  const active = isNavActive(pathname, item.path);
  const activeClass =
    variant === "crisis" && active
      ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20"
      : variant === "tourist" && active
        ? "bg-amber-50 text-amber-900 ring-1 ring-amber-200"
        : variant === "guide" && active
          ? "bg-violet-50 text-violet-900 ring-1 ring-violet-200"
          : active
            ? "bg-blue-50 text-blue-600 ring-1 ring-blue-100"
            : "text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900";

  return (
    <Link
      href={item.path}
      className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-200 ${activeClass}`}
    >
      <Icon size={iconSize.nav} />
      <span className="min-w-0 flex-1 truncate font-bold text-sm">{item.label}</span>
      <DashboardNavCountBadge count={counts[item.countKey]} label={item.countDescription || item.label} />
    </Link>
  );
}

export function AdminSidebar() {
  const pathname = usePathname();
  const { logout } = useAuthStore();
  const counts = useDashboardNavCounts();

  return (
    <aside className="w-[280px] bg-white border-r border-zinc-200 flex flex-col h-screen sticky top-0 hidden lg:flex dashboard-shell">
      <Logo />

      <div className="flex-1 overflow-y-auto px-4 py-6 custom-scrollbar">
        {ADMIN_NAV_SECTIONS.map(([title, items]) => (
          <div key={title} className="mb-6 last:mb-0">
            <h3
              className={`text-[10px] font-black uppercase tracking-[0.2em] mb-3 px-4 ${
                title === "Tourists"
                  ? "text-amber-600"
                  : title === "Guides"
                    ? "text-violet-600"
                    : "text-zinc-400"
              }`}
            >
              {title}
            </h3>
            <div className="space-y-1">
              {items.map((item) => (
                <NavLink
                  key={item.path}
                  item={item}
                  pathname={pathname}
                  variant={SECTION_ACCENT[title] || "default"}
                  counts={counts}
                />
              ))}
            </div>
          </div>
        ))}
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
