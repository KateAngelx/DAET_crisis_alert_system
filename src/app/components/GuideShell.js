"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuthStore } from "@/app/store/crisisStore";
import {
  LayoutDashboard, ShieldCheck, FileText, LogOut, Compass, History, Menu, X, LifeBuoy, BookOpen, Sun, Users, UserRound,
} from "lucide-react";
import { BrandLogo } from "@/app/components/BrandLogo";
import { GUIDE_NAV, isNavActive } from "@/lib/dashboardNav";
import { NotificationPanel } from "@/app/components/NotificationPanel";
import { typography, iconSize } from "@/lib/designSystem";
import { InstalledBottomNav } from "@/app/components/shell/InstalledBottomNav";

/** Icons by nav item id (labels can change; ids do not). */
const ICONS = {
  dashboard: Sun,
  groups: Compass,
  help: LifeBuoy,
  alerts: ShieldCheck,
  history: History,
  reports: FileText,
  howto: BookOpen,
  profile: UserRound,
};

const GUIDE_SECTIONS = [
  ["Main", GUIDE_NAV.main],
  ["More", GUIDE_NAV.more],
];

// Phones: the four main items in a bottom bar; More opens the side menu.
const GUIDE_BOTTOM_NAV = GUIDE_NAV.main.map((item) => ({ href: item.path, short: item.short, icon: ICONS[item.id] }));

function Logo() {
  return (
    <div className="h-[72px] border-b border-zinc-200 bg-zinc-50/80 px-6 flex items-center gap-3">
      <BrandLogo size={32} />
      <div className="leading-none">
        <span className={`${typography.brand} text-blue-600 block`}>CONNECT-DAET</span>
        <span className={`${typography.badge} text-zinc-400 tracking-widest`}>Guide Portal</span>
      </div>
    </div>
  );
}

function NavLink({ item, pathname }) {
  const Icon = ICONS[item.id] || LayoutDashboard;
  const active = isNavActive(pathname, item.path);

  return (
    <Link
      href={item.path}
      className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-200 ${
        active ? "bg-blue-50 text-blue-600 ring-1 ring-blue-100" : "text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900"
      }`}
    >
      <Icon size={iconSize.nav} />
      <span className="min-w-0 flex-1 truncate font-bold text-sm">{item.label}</span>
    </Link>
  );
}

export function GuideSidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuthStore();

  return (
    <aside className="w-[280px] bg-white border-r border-zinc-200 flex flex-col h-screen sticky top-0 hidden lg:flex dashboard-shell">
      <Logo />

      <div className="flex-1 overflow-y-auto px-4 py-6 custom-scrollbar">
        {GUIDE_SECTIONS.map(([title, items], index) => (
          <div key={title} className={index === GUIDE_SECTIONS.length - 1 ? "" : "mb-8"}>
            <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] mb-4 px-4">{title}</h3>
            <div className="space-y-1">
              {items.map((item) => (
                <NavLink key={item.path} item={item} pathname={pathname} />
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="p-4 border-t border-zinc-100 space-y-3">
        <Link
          href="/guide/profile"
          className={`flex items-center gap-3 rounded-2xl border px-4 py-3 transition-colors ${
            pathname === "/guide/profile" ? "border-purple-200 bg-purple-50" : "border-zinc-100 bg-zinc-50 hover:bg-purple-50"
          }`}
        >
          <span className="rounded-lg bg-purple-100 p-1.5">
            <UserRound size={16} className="text-purple-700" />
          </span>
          <span className="min-w-0 flex-1 leading-tight">
            <span className="block truncate text-sm font-black text-zinc-900">{user?.name || "My profile"}</span>
            <span className="block text-[10px] font-black uppercase tracking-widest text-purple-700">My profile</span>
          </span>
        </Link>
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

export function MobileGuideMenu({ open, onOpen, onClose }) {
  const pathname = usePathname();
  const { user, logout } = useAuthStore();

  return (
    <>
      <button
        onClick={onOpen}
        className="lg:hidden p-2 hover:bg-zinc-100 rounded-lg transition-colors"
        aria-label="Open menu"
      >
        <Menu size={iconSize.nav} className="text-zinc-600" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm" onClick={onClose} />
          <div className="fixed inset-y-0 left-0 w-[min(280px,85vw)] bg-white z-50 lg:hidden overflow-y-auto shadow-2xl animate-in slide-in-from-left duration-300 dashboard-shell">
            <div className="flex items-center justify-between p-4 border-b border-zinc-200">
              <span className="text-sm font-black text-blue-600 uppercase">Guide Portal</span>
              <button onClick={onClose} className="p-2 hover:bg-zinc-100 rounded-lg" aria-label="Close menu">
                <X size={24} />
              </button>
            </div>
            <div className="p-4 space-y-6">
              {GUIDE_SECTIONS.map(([title, items]) => (
                <div key={title}>
                  <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] mb-4 px-4">{title}</h3>
                  <div className="space-y-1">
                    {items.map((item) => (
                      <div key={item.path} onClick={onClose}>
                        <NavLink item={item} pathname={pathname} />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="border-t border-zinc-100 p-4 space-y-2">
              <Link
                href="/guide/profile"
                onClick={onClose}
                className={`flex items-center gap-3 rounded-2xl border px-4 py-3 transition-colors ${
                  pathname === "/guide/profile" ? "border-purple-200 bg-purple-50" : "border-zinc-100 bg-zinc-50"
                }`}
              >
                <span className="rounded-lg bg-purple-100 p-1.5">
                  <UserRound size={16} className="text-purple-700" />
                </span>
                <span className="min-w-0 flex-1 leading-tight">
                  <span className="block truncate text-sm font-black text-zinc-900">{user?.name || "My profile"}</span>
                  <span className="block text-[10px] font-black uppercase tracking-widest text-purple-700">Profile & settings</span>
                </span>
              </Link>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  logout();
                }}
                className="flex w-full items-center justify-center gap-2 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-black text-red-600"
              >
                <LogOut size={iconSize.nav} /> Sign out
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}

export function GuideHeader() {
  const { user, logout } = useAuthStore();
  const [menuOpen, setMenuOpen] = React.useState(false);

  // Phones in a browser get the same bottom bar as the installed app.
  React.useEffect(() => {
    document.documentElement.dataset.mobileDock = "true";
    return () => {
      delete document.documentElement.dataset.mobileDock;
    };
  }, []);

  return (
    <header className="h-16 shrink-0 bg-white border-b border-zinc-200 px-3 sm:px-4 lg:px-6 flex items-center justify-between sticky top-0 z-10 dashboard-shell">
      <div className="flex min-w-0 items-center gap-2 sm:gap-4">
        <MobileGuideMenu
          open={menuOpen}
          onOpen={() => setMenuOpen(true)}
          onClose={() => setMenuOpen(false)}
        />
        <div className="min-w-0">
          <p className={`${typography.statLabel} hidden tracking-[0.2em] text-zinc-400 leading-none mb-0.5 sm:block`}>Guide portal</p>
          <h1 className="truncate text-sm font-black tracking-tight leading-tight text-zinc-800 sm:text-2xl md:text-[28px]">Guide</h1>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1.5 sm:gap-3">
        <NotificationPanel />
        <div className="flex items-center gap-1 sm:gap-2 rounded-2xl border border-zinc-100 bg-zinc-50 px-1.5 py-1.5 sm:px-3 sm:py-2">
          <Link href="/guide/profile" className="flex items-center gap-1 sm:gap-2 rounded-xl hover:opacity-80" aria-label="My profile">
            <div className="rounded-lg bg-purple-100 p-1.5">
              <Users size={16} className="text-purple-600" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-purple-700 md:hidden">Profile</span>
            <div className="hidden md:block leading-none text-left">
              <p className="text-sm font-black text-zinc-900 truncate max-w-[120px]">{user?.name || "Guide"}</p>
              <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">Tourism Guide</p>
            </div>
          </Link>
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
        items={GUIDE_BOTTOM_NAV}
        onMore={() => setMenuOpen(true)}
        menuOpen={menuOpen}
      />
    </header>
  );
}
