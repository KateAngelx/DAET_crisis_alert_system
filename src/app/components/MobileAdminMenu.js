"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Menu,
  X,
  LayoutDashboard,
  Users,
  AlertTriangle,
  FileWarning,
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

export function MobileAdminMenu({ open, onOpen, onClose }) {
  const pathname = usePathname();
  const counts = useDashboardNavCounts();

  const renderSection = (title, items, variant = "default") => (
    <div>
      <h3
        className={`text-[10px] font-black uppercase tracking-[0.2em] mb-4 px-4 ${
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
        {items.map((item) => {
          const Icon = ICONS[item.id] || LayoutDashboard;
          const active = isNavActive(pathname, item.path);
          const activeClass =
            variant === "crisis" && active
              ? "bg-blue-600 text-white font-bold shadow-lg shadow-blue-600/20"
              : variant === "tourist" && active
                ? "bg-amber-50 text-amber-900 font-bold ring-1 ring-amber-200"
                : variant === "guide" && active
                  ? "bg-violet-50 text-violet-900 font-bold ring-1 ring-violet-200"
                  : active
                    ? "bg-blue-50 text-blue-600 font-bold ring-1 ring-blue-100"
                    : "text-zinc-600 hover:bg-zinc-50";

          return (
            <Link
              key={item.path}
              href={item.path}
              onClick={onClose}
              className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-all ${activeClass}`}
            >
              <Icon size={20} />
              <span className="min-w-0 flex-1 truncate text-sm font-bold">{item.label}</span>
              <DashboardNavCountBadge count={counts[item.countKey]} label={item.countDescription || item.label} />
            </Link>
          );
        })}
      </div>
    </div>
  );

  return (
    <>
      <button
        onClick={onOpen}
        className="lg:hidden p-2 hover:bg-zinc-100 rounded-lg transition-colors"
        aria-label="Open menu"
      >
        <Menu size={24} className="text-zinc-600" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm" onClick={onClose} />
          <div className="fixed inset-y-0 left-0 w-[280px] bg-white z-50 lg:hidden overflow-y-auto shadow-2xl animate-in slide-in-from-left duration-300 dashboard-shell">
            <div className="flex items-center justify-between p-4 border-b border-zinc-200">
              <div className="flex items-center gap-2">
                <BrandLogo size={28} />
                <span className="text-sm font-black text-blue-600 tracking-tighter uppercase">CONNECT-DAET</span>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-zinc-100 rounded-lg" aria-label="Close menu">
                <X size={24} />
              </button>
            </div>

            <div className="p-4 space-y-6">
              {ADMIN_NAV_SECTIONS.map(([title, items]) => (
                <React.Fragment key={title}>
                  {renderSection(title, items, SECTION_ACCENT[title] || "default")}
                </React.Fragment>
              ))}
            </div>
          </div>
        </>
      )}
    </>
  );
}
