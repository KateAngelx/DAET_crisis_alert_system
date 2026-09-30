"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AlertTriangle, CheckCircle2, FileText, Home, Info, Menu, Route, User, X } from "lucide-react";
import { useInstalledApp } from "@/lib/useInstalledApp";
import { BrandLogo } from "@/app/components/BrandLogo";
import { siteInfo } from "@/lib/siteInfo";
import { typography } from "@/lib/designSystem";
import { useAuthStore } from "../store/crisisStore";
import { NotificationPanel } from "@/app/components/NotificationPanel";
import { isPublicNavActive } from "@/lib/navUtils";

const GUEST_NAV = [
  { name: "Home", short: "Home", href: "/", icon: Home },
  { name: "Crisis Hub", short: "Crisis", href: "/crisis", icon: AlertTriangle },
  { name: "Resolved", short: "Resolved", href: "/crisis/resolved", icon: CheckCircle2 },
  { name: "Roads & Travel", short: "Roads", href: "/routes", icon: Route },
  { name: "About", short: "About", href: "/about", icon: Info },
];

const AUTH_NAV = [
  { name: "Home", short: "Home", href: "/", icon: Home },
  { name: "Crisis Hub", short: "Crisis", href: "/crisis", icon: AlertTriangle },
  { name: "Resolved", short: "Resolved", href: "/crisis/resolved", icon: CheckCircle2 },
  { name: "Roads & Travel", short: "Roads", href: "/routes", icon: Route },
  { name: "My Reports", short: "Reports", href: "/crisis/reports", icon: FileText },
];

export function PublicHeader() {
  const pathname = usePathname();
  const [accountOpen, setAccountOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const installed = useInstalledApp();
  const { user, isAuthenticated, logout } = useAuthStore();

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    setAccountOpen(false);
    setMenuOpen(false);
  }, [pathname]);

  const navItems = mounted && isAuthenticated ? AUTH_NAV : GUEST_NAV;

  const linkClass = (href) => {
    const active = isPublicNavActive(pathname, href);
    return active
      ? "bg-blue-600 text-white shadow-lg shadow-blue-200"
      : "text-zinc-600 hover:bg-white/80 dark:hover:bg-zinc-800";
  };

  const showGuestActions = !mounted || !isAuthenticated;

  const guestActions = (
    <div className="flex items-center gap-1.5 shrink-0">
      <Link
        href="/login"
        className="inline-flex items-center justify-center h-8 px-2.5 sm:px-4 rounded-full border border-zinc-200/80 bg-white/70 text-[10px] font-black uppercase tracking-widest text-zinc-700 hover:bg-white transition-colors"
      >
        Login
      </Link>
      <Link
        href="/register"
        className="inline-flex items-center justify-center h-8 px-2.5 sm:px-4 rounded-full bg-blue-600 text-[10px] font-black uppercase tracking-widest text-white hover:bg-blue-700 transition-colors shadow-md shadow-blue-600/20"
      >
        Register
      </Link>
    </div>
  );

  return (
    <>
      <header className="fixed top-3 inset-x-0 z-50 px-3 sm:px-4">
        <div className="max-w-7xl mx-auto h-12 sm:h-14 px-2.5 sm:px-4 flex items-center justify-between gap-2 rounded-2xl border border-white/50 bg-white/35 dark:bg-zinc-950/40 dark:border-white/10 backdrop-blur-2xl backdrop-saturate-150 shadow-[0_8px_30px_rgba(15,23,42,0.06)]">
          <Link href="/" className="flex items-center gap-2 shrink-0 min-w-0" aria-label={`${siteInfo.officeName} — Home`}>
            <BrandLogo size={32} className="shrink-0" />
            <span className={`truncate max-[340px]:hidden ${typography.brand} text-blue-600`}>{siteInfo.brandName}</span>
          </Link>

          <nav className="hidden xl:flex items-center gap-1" aria-label="Primary">
            {navItems.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                aria-current={isPublicNavActive(pathname, item.href) ? "page" : undefined}
                className={`px-4 py-2 rounded-full text-xs font-black uppercase tracking-widest transition-all ${linkClass(item.href)}`}
              >
                <span className="font-sans leading-none">{item.name}</span>
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2 shrink-0">
            {mounted && isAuthenticated && <NotificationPanel />}

            {showGuestActions ? guestActions : null}

            {mounted && isAuthenticated ? (
              <div className="hidden xl:flex items-center gap-2">
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
                    <span className="text-[9px] font-bold uppercase text-blue-600 tracking-widest">
                      {user?.role || "tourist"}
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

            {!installed ? (
              <button
                type="button"
                onClick={() => setMenuOpen((open) => !open)}
                className="xl:hidden inline-flex items-center justify-center h-8 w-8 rounded-full border border-white/80 bg-white/70 text-zinc-700 hover:bg-white dark:border-zinc-700 dark:text-zinc-200"
                aria-label={menuOpen ? "Close menu" : "Open menu"}
                aria-expanded={menuOpen}
              >
                {menuOpen ? <X size={18} /> : <Menu size={18} />}
              </button>
            ) : null}

            {mounted && isAuthenticated ? (
              <div className="relative xl:hidden">
                <button
                  type="button"
                  onClick={() => setAccountOpen((open) => !open)}
                  className="p-2 rounded-full border border-white/80 bg-white/70 text-zinc-700 hover:bg-white dark:border-zinc-700 dark:text-zinc-200"
                  aria-label="Account menu"
                  aria-expanded={accountOpen}
                >
                  <User size={18} />
                </button>
                {accountOpen && (
                  <div className="absolute right-0 top-full mt-2 w-52 rounded-2xl border border-white/70 bg-white/90 p-2 shadow-xl backdrop-blur-xl dark:border-zinc-800 dark:bg-zinc-950/90">
                    <p className="px-3 py-2 text-[11px] font-black uppercase tracking-tight text-zinc-900 dark:text-zinc-100 truncate">
                      {user?.name}
                    </p>
                    <p className="px-3 -mt-1 pb-2 text-[9px] font-bold uppercase tracking-widest text-blue-600">
                      {user?.role || "tourist"}
                    </p>
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
      </header>
      <div className="h-[3.75rem] sm:h-[4.25rem] shrink-0" aria-hidden="true" />

      {menuOpen && !installed ? (
        <nav
          className="xl:hidden fixed top-[4.25rem] sm:top-[4.75rem] inset-x-3 z-50 max-w-7xl mx-auto rounded-2xl border border-white/70 bg-white/95 p-2 shadow-xl backdrop-blur-xl dark:border-zinc-800 dark:bg-zinc-950/95"
          aria-label="Sections"
        >
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isPublicNavActive(pathname, item.href);
            return (
              <Link
                key={item.name}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`flex items-center gap-3 px-3 py-3 rounded-xl text-xs font-black uppercase tracking-widest ${
                  active ? "bg-blue-600 text-white" : "text-zinc-700 hover:bg-zinc-50 dark:text-zinc-200 dark:hover:bg-zinc-900"
                }`}
              >
                <Icon size={16} />
                {item.name}
              </Link>
            );
          })}
        </nav>
      ) : null}

      {accountOpen && (
        <button
          type="button"
          className="fixed inset-0 z-40 xl:hidden"
          aria-label="Close account menu"
          onClick={() => setAccountOpen(false)}
        />
      )}

      {installed ? (
      <nav
        className="xl:hidden fixed bottom-0 inset-x-0 z-50 border-t border-zinc-200 bg-white/95 backdrop-blur-md dark:border-white/10 dark:bg-zinc-950/95 pb-[env(safe-area-inset-bottom)]"
        aria-label="Mobile"
      >
        <div className="grid grid-cols-5 max-w-lg mx-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isPublicNavActive(pathname, item.href);
            return (
              <Link
                key={item.name}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`flex flex-col items-center justify-center gap-0.5 min-h-[52px] px-0.5 py-1.5 text-[9px] font-black uppercase tracking-tight leading-none ${
                  active ? "text-blue-600" : "text-zinc-500"
                }`}
              >
                <Icon size={18} strokeWidth={active ? 2.5 : 2} />
                <span className="truncate max-w-full">{item.short}</span>
              </Link>
            );
          })}
        </div>
      </nav>
      ) : null}
    </>
  );
}
