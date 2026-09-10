"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuthStore } from "@/app/store/crisisStore";
import {
  LayoutDashboard, Bell, ShieldCheck, FileText, Map, Zap, LogOut, Users, Compass, CheckCircle,
} from "lucide-react";
import { GUIDE_NAV, isNavActive } from "@/lib/dashboardNav";
import { NotificationPanel } from "@/app/components/NotificationPanel";
import { typography, iconSize } from "@/lib/designSystem";

const ICONS = {
  Dashboard: LayoutDashboard,
  "Tour Groups": Compass,
  "Completed Tours": CheckCircle,
  "Active Tourists": Users,
  Notifications: Bell,
  "Crisis Hub": ShieldCheck,
  "Roads & Travel": Map,
  "Safety Advisories": Bell,
  "Group Reports": FileText,
};

function Logo() {
  return (
    <div className="h-[72px] border-b border-zinc-200 px-6 flex items-center gap-3">
      <div className="bg-blue-600 rounded-lg size-8 flex items-center justify-center shadow-lg shadow-blue-600/20">
        <Zap size={iconSize.brand} className="text-white" fill="white" />
      </div>
      <div className="leading-none">
        <span className={`${typography.brand} text-blue-600 block`}>CONNECT-DAET</span>
        <span className={`${typography.badge} text-zinc-400 tracking-widest`}>Guide Portal</span>
      </div>
    </div>
  );
}

function NavLink({ item, pathname }) {
  const Icon = ICONS[item.label] || LayoutDashboard;
  const active = isNavActive(pathname, item.path);

  return (
    <Link
      href={item.path}
      className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-200 ${
        active ? "bg-blue-50 text-blue-600 ring-1 ring-blue-100" : "text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900"
      }`}
    >
      <Icon size={iconSize.nav} />
      <span className="font-bold text-sm">{item.label}</span>
    </Link>
  );
}

export function GuideSidebar() {
  const pathname = usePathname();
  const { logout } = useAuthStore();

  return (
    <aside className="w-[280px] bg-white border-r border-zinc-200 flex flex-col h-screen sticky top-0 hidden lg:flex dashboard-shell">
      <Logo />

      <div className="flex-1 overflow-y-auto px-4 py-6 custom-scrollbar">
        <div className="mb-8">
          <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] mb-4 px-4">Operations</h3>
          <div className="space-y-1">
            {GUIDE_NAV.operations.map((item) => (
              <NavLink key={item.path} item={item} pathname={pathname} />
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] mb-4 px-4">Crisis Information</h3>
          <div className="space-y-1">
            {GUIDE_NAV.crisisInfo.map((item) => (
              <NavLink key={item.path} item={item} pathname={pathname} />
            ))}
          </div>
        </div>
      </div>

      <div className="p-4 border-t border-zinc-100">
        <button
          onClick={logout}
          className="w-full flex items-center justify-center gap-2 bg-red-50 text-red-600 px-4 py-3 rounded-2xl hover:bg-red-100 transition-colors font-black text-sm border border-red-100"
        >
          <LogOut size={iconSize.nav} /> Logout
        </button>
      </div>
    </aside>
  );
}

export function MobileGuideMenu() {
  const [isOpen, setIsOpen] = React.useState(false);
  const pathname = usePathname();

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="lg:hidden p-2 hover:bg-zinc-100 rounded-lg transition-colors"
        aria-label="Open menu"
      >
        <Map size={iconSize.nav} className="text-zinc-600" />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm" onClick={() => setIsOpen(false)} />
          <div className="fixed inset-y-0 left-0 w-[280px] bg-white z-50 lg:hidden overflow-y-auto shadow-2xl dashboard-shell">
            <div className="flex items-center justify-between p-4 border-b border-zinc-200">
              <span className="text-sm font-black text-blue-600 uppercase">Guide Portal</span>
              <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-zinc-100 rounded-lg">✕</button>
            </div>
            <div className="p-4 space-y-6">
              <div>
                <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] mb-4 px-4">Operations</h3>
                <div className="space-y-1">
                  {GUIDE_NAV.operations.map((item) => (
                    <div key={item.path} onClick={() => setIsOpen(false)}>
                      <NavLink item={item} pathname={pathname} />
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] mb-4 px-4">Crisis Information</h3>
                <div className="space-y-1">
                  {GUIDE_NAV.crisisInfo.map((item) => (
                    <div key={item.path} onClick={() => setIsOpen(false)}>
                      <NavLink item={item} pathname={pathname} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}

export function GuideHeader() {
  const { user, logout } = useAuthStore();

  return (
    <header className="h-[72px] bg-white border-b border-zinc-200 px-4 lg:px-6 flex items-center justify-between sticky top-0 z-10 dashboard-shell">
      <div className="flex items-center gap-4">
        <MobileGuideMenu />
        <div>
          <p className={`${typography.statLabel} tracking-[0.2em] text-blue-600 leading-none mb-0.5`}>Guide Operations</p>
          <h1 className={`${typography.pageTitle} leading-none`}>Guide Operations</h1>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <NotificationPanel linkPrefix="/guide" />
        <div className="flex items-center gap-2 px-3 py-2 bg-zinc-50 rounded-2xl border border-zinc-100">
          <div className="bg-purple-100 p-1.5 rounded-lg">
            <Users size={16} className="text-purple-600" />
          </div>
          <div className="hidden md:block leading-none text-left">
            <p className="text-sm font-black text-zinc-900 truncate max-w-[120px]">{user?.name || "Guide"}</p>
            <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">Tourism Guide</p>
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
