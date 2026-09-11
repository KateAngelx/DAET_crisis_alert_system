"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Menu, X, LayoutDashboard, Users, Workflow, AlertTriangle, FileWarning,
} from "lucide-react";
import { BrandLogo } from "@/app/components/BrandLogo";
import { ADMIN_NAV, isNavActive } from "@/lib/dashboardNav";

const ICONS = {
  Dashboard: LayoutDashboard,
  Users,
  "Alert Pipeline": Workflow,
  "Command Center": AlertTriangle,
  "Incident Reports": FileWarning,
};

export function MobileAdminMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  const renderSection = (title, items, variant = "default") => (
    <div>
      <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] mb-4 px-4">{title}</h3>
      <div className="space-y-1">
        {items.map((item) => {
          const Icon = ICONS[item.label] || LayoutDashboard;
          const active = isNavActive(pathname, item.path);
          const activeClass =
            variant === "crisis" && active
              ? "bg-blue-600 text-white font-bold shadow-lg shadow-blue-600/20"
              : active
                ? "bg-blue-50 text-blue-600 font-bold ring-1 ring-blue-100"
                : "text-zinc-600 hover:bg-zinc-50";

          return (
            <Link
              key={item.path}
              href={item.path}
              onClick={() => setIsOpen(false)}
              className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-all ${activeClass}`}
            >
              <Icon size={20} />
              <span className="text-sm font-bold">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="lg:hidden p-2 hover:bg-zinc-100 rounded-lg transition-colors"
        aria-label="Open menu"
      >
        <Menu size={24} className="text-zinc-600" />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm" onClick={() => setIsOpen(false)} />
          <div className="fixed inset-y-0 left-0 w-[280px] bg-white z-50 lg:hidden overflow-y-auto shadow-2xl animate-in slide-in-from-left duration-300 dashboard-shell">
            <div className="flex items-center justify-between p-4 border-b border-zinc-200">
              <div className="flex items-center gap-2">
                <BrandLogo size={28} />
                <span className="text-sm font-black text-blue-600 tracking-tighter uppercase">CONNECT-DAET</span>
              </div>
              <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-zinc-100 rounded-lg" aria-label="Close menu">
                <X size={24} />
              </button>
            </div>

            <div className="p-4 space-y-6">
              {renderSection("Administration", ADMIN_NAV.coreAdmin)}
              {renderSection("Crisis Operations", ADMIN_NAV.crisisOps, "crisis")}
            </div>
          </div>
        </>
      )}
    </>
  );
}
