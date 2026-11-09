"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AlertTriangle, CheckCircle2, FileText, HelpCircle, Home, Info, Menu, Route, User, X } from "lucide-react";
import { BrandLogo } from "@/app/components/BrandLogo";
import { siteInfo } from "@/lib/siteInfo";
import { useAuthStore } from "../store/crisisStore";
import { NotificationPanel } from "@/app/components/NotificationPanel";
import { HeaderPoints } from "@/app/components/HeaderPoints";
import { isPublicNavActive } from "@/lib/navUtils";
import { useInstalledApp } from "@/lib/useInstalledApp";
import { usePublicVisibility } from "@/lib/usePublicVisibility";

const GUEST_NAV = [
  { name: "Home", short: "Home", href: "/", icon: Home },
  { name: "Crisis Hub", short: "Crisis", href: "/crisis", icon: AlertTriangle },
  { name: "Resolved", short: "Resolved", href: "/crisis/resolved", icon: CheckCircle2 },
  { name: "Roads & Travel", short: "Roads", href: "/routes", icon: Route },
  { name: "About", short: "About", href: "/about", icon: Info },
  { name: "FAQs", short: "FAQ", href: "/faq", icon: HelpCircle },
];

const AUTH_NAV = [
  { name: "Home", short: "Home", href: "/", icon: Home },
  { name: "Crisis Hub", short: "Crisis", href: "/crisis", icon: AlertTriangle },
  { name: "Resolved", short: "Resolved", href: "/crisis/resolved", icon: CheckCircle2 },
  { name: "Roads & Travel", short: "Roads", href: "/routes", icon: Route },
  { name: "My Reports", short: "Reports", href: "/crisis/reports", icon: FileText },
  { name: "FAQs", short: "FAQ", href: "/faq", icon: HelpCircle },
];

export function PublicHeader() {
  const pathname = usePathname();
  const [accountOpen, setAccountOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { user, isAuthenticated, logout } = useAuthStore();
  const visibility = usePublicVisibility();
  const installedApp = useInstalledApp();

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    setAccountOpen(false);
    setMenuOpen(false);
  }, [pathname]);

  const navItems = (mounted && isAuthenticated ? AUTH_NAV : GUEST_NAV).filter(
    (item) => visibility.roadsAndHazards || item.href !== "/routes"
  );

  const linkClass = (href) => {
    const active = isPublicNavActive(pathname, href);
    return active
      ? "bg-blue-600 text-white shadow-lg shadow-blue-200"
      : "text-zinc-600 hover:bg-white/80 dark:hover:bg-zinc-800";
  };

  const showGuestActions = !mounted || !isAuthenticated;

  const guestActions = (
    <div className="flex items-center gap-1 shrink-0">
      <Link
        href="/login"
        className="hidden min-[340px]:inline-flex h-7 items-center justify-center rounded-full border border-zinc-200 bg-zinc-50 px-2.5 text-[10px] font-black uppercase tracking-wide text-zinc-700 hover:bg-zinc-100 transition-colors sm:h-8 sm:px-3"
      >
        Login
      </Link>
      <Link
        href="/register"
        className="inline-flex h-7 items-center justify-center rounded-full bg-blue-600 px-2.5 text-[10px] font-black uppercase tracking-wide text-white hover:bg-blue-700 transition-colors shadow-sm shadow-blue-600/20 whitespace-nowrap sm:h-8 sm:px-3"
      >
        Register
      </Link>
    </div>
  );

  return (
    <>
      <header
        data-public-header
        className="fixed top-0 inset-x-0 z-50 md:bg-white md:border-b md:border-zinc-200 md:dark:bg-zinc-950 md:dark:border-zinc-800 md:shadow-sm"
      >
        <div data-public-header-frame className="max-md:pt-[max(0.5rem,env(safe-area-inset-top))] max-md:px-3 sm:max-md:px-4 md:pt-0 md:px-0">
          <div data-public-header-shell className="max-md:rounded-xl max-md:bg-white max-md:border max-md:border-zinc-200 max-md:shadow-[0_4px_18px_rgba(15,23,42,0.08)] md:rounded-none md:bg-transparent md:shadow-none md:border-0">
            <div className="mx-auto grid h-12 w-full max-w-7xl min-w-0 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-1.5 overflow-visible px-2 md:h-16 md:gap-2 md:px-6 lg:px-8">
              <div className="col-start-1 flex min-w-0 items-center gap-1.5">
              {!installedApp ? (
                <button
                  type="button"
                  className="lg:hidden -ml-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-zinc-700 hover:bg-zinc-100"
                  aria-label={menuOpen ? "Close menu" : "Open menu"}
                  aria-expanded={menuOpen}
                  onClick={() => {
                    setAccountOpen(false);
                    setMenuOpen((open) => !open);
                  }}
                >
                  {menuOpen ? <X size={22} /> : <Menu size={22} />}
                </button>
              ) : null}
              <Link
                href="/"
                className="flex min-w-0 items-center gap-1.5"
                aria-label={`CONNECT-DAET — ${siteInfo.officeName} Home`}
              >
                <span className="md:hidden">
                  <BrandLogo size={24} />
                </span>
                <span className="hidden md:block">
                  <BrandLogo size={30} />
                </span>
                <span className="hidden md:inline truncate text-[13px] sm:text-[16px] lg:text-[20px] font-black uppercase tracking-wide text-blue-600">
                  CONNECT-DAET
                </span>
              </Link>
              </div>

              <nav className="col-start-2 hidden items-center justify-center gap-1 px-2 lg:flex" aria-label="Primary">
                {navItems.map((item) => (
                  <Link
                    key={item.name}
                    href={item.href}
                    aria-current={isPublicNavActive(pathname, item.href) ? "page" : undefined}
                    className={`shrink-0 whitespace-nowrap rounded-full px-2 py-2 text-[10px] lg:text-[11px] font-black uppercase tracking-wider transition-all ${linkClass(item.href)}`}
                  >
                    <span className="font-sans leading-none">{item.name}</span>
                  </Link>
                ))}
              </nav>

              <div className="relative z-20 col-start-3 flex items-center justify-end gap-1.5 bg-white md:gap-2">
                {mounted && isAuthenticated && <NotificationPanel />}

                {showGuestActions ? guestActions : null}

                {mounted && isAuthenticated ? (
                  <div className="hidden lg:flex items-center gap-2">
                    <Link
                      href="/profile"
                      className="flex items-center gap-2 bg-white/70 dark:bg-zinc-900 border border-white/80 dark:border-zinc-800 pl-2 pr-4 py-1.5 rounded-full hover:border-blue-200 transition-colors"
                    >
                      <div className="bg-blue-600 p-1.5 rounded-full text-white">
                        <User size={14} />
                      </div>
                      <div className="leading-none">
                        <span className="text-[11px] font-black uppercase tracking-tight text-zinc-900 dark:text-zinc-100 block">
                          {user?.name}
                        </span>
                        <span className="text-[9px] font-bold uppercase tracking-widest text-blue-600">
                          {user?.role === "tourist" ? <HeaderPoints variant="inline" /> : (user?.role || "tourist")}
                        </span>
                      </div>
                    </Link>
                    <button
                      type="button"
                      onClick={logout}
                      className="text-[10px] font-black uppercase text-red-500 bg-red-50 dark:bg-red-950/30 px-4 py-2 rounded-full hover:bg-red-100 transition-all font-sans border border-red-100 dark:border-red-900/50"
                    >
                      Logout
                    </button>
                  </div>
                ) : null}

                {mounted && isAuthenticated ? (
                  <div className="relative lg:hidden">
                    <button
                      type="button"
                      onClick={() => setAccountOpen((open) => !open)}
                      className="inline-flex h-10 min-w-9 max-w-14 flex-col items-center justify-center gap-0.5 rounded-xl border border-zinc-200/90 bg-white px-1 text-zinc-700 hover:bg-zinc-50 transition-colors dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
                      aria-label="Account menu"
                      aria-expanded={accountOpen}
                    >
                      <User size={16} />
                      <HeaderPoints />
                    </button>
                    {accountOpen && (
                      <div className="absolute right-0 top-full mt-2 w-52 rounded-2xl border border-white/70 bg-white/90 p-2 shadow-xl backdrop-blur-xl dark:border-zinc-800 dark:bg-zinc-950/90">
                        <p className="px-3 py-2 text-[11px] font-black uppercase tracking-tight text-zinc-900 dark:text-zinc-100 truncate">
                          {user?.name}
                        </p>
                        <p className="px-3 -mt-1 pb-2 text-[9px] font-bold uppercase tracking-widest text-blue-600">
                          {user?.role || "tourist"}
                        </p>
                        <HeaderPoints variant="menu" />
                        <Link
                          href="/profile"
                          className="block px-3 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest text-zinc-700 hover:bg-zinc-50 dark:text-zinc-200 dark:hover:bg-zinc-900"
                        >
                          My Profile
                        </Link>
                        <button
                          type="button"
                          onClick={logout}
                          className="w-full text-left px-3 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest text-red-500 hover:bg-red-50"
                        >
                          Logout
                        </button>
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="hidden md:block h-16 shrink-0" aria-hidden="true" />

      {menuOpen && !installedApp ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 bg-black/40 lg:hidden"
            aria-label="Close menu"
            onClick={() => setMenuOpen(false)}
          />
          <nav
            data-public-browser-nav
            className="fixed top-12 md:top-16 inset-x-0 z-50 max-h-[calc(100dvh-3rem)] overflow-y-auto border-b border-zinc-200 bg-white shadow-lg lg:hidden"
            aria-label="Pages"
          >
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isPublicNavActive(pathname, item.href);
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`flex items-center gap-3 border-b border-zinc-100 px-4 py-3 text-sm font-semibold ${
                    active ? "bg-blue-50 text-blue-700" : "text-zinc-800"
                  }`}
                  onClick={() => setMenuOpen(false)}
                >
                  <Icon size={18} />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </>
      ) : null}

      {accountOpen && (
        <button
          type="button"
          className="fixed inset-0 z-40 lg:hidden"
          aria-label="Close account menu"
          onClick={() => setAccountOpen(false)}
        />
      )}

      {installedApp ? (
      <nav
        data-public-mobile-nav
        className="public-mobile-dock lg:hidden fixed z-50 bottom-[max(0.75rem,env(safe-area-inset-bottom))] inset-x-3 sm:inset-x-4 pointer-events-none"
        aria-label="Mobile"
      >
        <div className="pointer-events-auto mx-auto max-w-lg rounded-2xl border border-zinc-200 bg-white shadow-[0_8px_28px_rgba(15,23,42,0.12)]">
          <div
            className="grid"
            style={{ gridTemplateColumns: `repeat(${navItems.length}, minmax(0, 1fr))` }}
          >
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isPublicNavActive(pathname, item.href);
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`flex flex-col items-center justify-center gap-0.5 min-h-[52px] px-0.5 py-2 text-[8px] sm:text-[9px] font-black uppercase tracking-tight leading-none transition-colors first:rounded-bl-2xl last:rounded-br-2xl ${
                    active ? "text-blue-600 bg-blue-50/90" : "text-zinc-600 hover:text-zinc-900"
                  }`}
                >
                  <Icon size={18} strokeWidth={active ? 2.5 : 2} />
                  <span className="truncate max-w-full px-0.5">{item.short}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </nav>
      ) : null}
    </>
  );
}
