"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, Zap, User } from "lucide-react";
import { useAuthStore } from "../store/crisisStore";
import { NotificationPanel } from "@/app/components/NotificationPanel";
import { isPublicNavActive } from "@/lib/navUtils";
import { typography, iconSize } from "@/lib/designSystem";

const BASE_NAV = [
  { name: "Home", href: "/" },
  { name: "Crisis Hub", href: "/crisis" },
  { name: "Advisories", href: "/crisis/alerts" },
  { name: "About", href: "/about" },
  { name: "FAQ", href: "/faq" },
];

export function PublicHeader() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { user, isAuthenticated, logout } = useAuthStore();

  useEffect(() => setMounted(true), []);

  const navItems = mounted && isAuthenticated
    ? [...BASE_NAV, { name: "My Reports", href: "/crisis/reports" }]
    : BASE_NAV;

  const linkClass = (href) => {
    const active = isPublicNavActive(pathname, href);
    return active
      ? "bg-blue-600 text-white shadow-lg shadow-blue-200"
      : "text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800";
  };

  return (
    <header className="sticky top-0 z-50 w-full bg-background/80 backdrop-blur-md border-b border-gray-200 dark:border-white/10">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className={`flex items-center gap-2 text-blue-600 ${typography.brand}`}>
          <div className="bg-blue-600 rounded-lg size-8 flex items-center justify-center shadow-lg shadow-blue-600/20">
            <Zap size={iconSize.brand} className="text-white" fill="white" />
          </div>
          <span className={`hidden sm:block ${typography.brand}`}>CONNECT-DAET</span>
        </Link>

        <nav className="hidden xl:flex items-center gap-1">
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

        <div className="flex items-center gap-3">
          {mounted && isAuthenticated && <NotificationPanel />}

          <div className="hidden sm:flex items-center gap-2">
            {!mounted ? (
              <>
                <Link
                  href="/login"
                  className="text-[10px] font-black uppercase text-zinc-600 px-5 py-2.5 rounded-full hover:bg-zinc-100 transition-all font-sans border border-zinc-200"
                >
                  Login
                </Link>
                <Link
                  href="/register"
                  className="text-[10px] font-black uppercase bg-blue-600 text-white px-5 py-2.5 rounded-full hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 font-sans"
                >
                  Register
                </Link>
              </>
            ) : isAuthenticated ? (
              <>
                <Link
                  href="/profile"
                  className="flex items-center gap-2 bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 pl-2 pr-4 py-1.5 rounded-full hover:border-blue-200 transition-colors"
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
                  onClick={logout}
                  className="text-[10px] font-black uppercase text-red-500 bg-red-50 dark:bg-red-950/30 px-4 py-2.5 rounded-full hover:bg-red-100 transition-all font-sans border border-red-100 dark:border-red-900/50"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="text-[10px] font-black uppercase text-zinc-600 px-5 py-2.5 rounded-full hover:bg-zinc-100 transition-all font-sans border border-zinc-200"
                >
                  Login
                </Link>
                <Link
                  href="/register"
                  className="text-[10px] font-black uppercase bg-blue-600 text-white px-5 py-2.5 rounded-full hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 font-sans"
                >
                  Register
                </Link>
              </>
            )}
          </div>

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="xl:hidden p-2 rounded-lg hover:bg-zinc-100"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="xl:hidden border-t border-gray-200 dark:border-white/10 bg-background p-4 space-y-2 animate-in slide-in-from-top">
          {navItems.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              onClick={() => setMobileMenuOpen(false)}
              aria-current={isPublicNavActive(pathname, item.href) ? "page" : undefined}
              className={`flex items-center justify-between px-6 py-4 rounded-2xl transition-all ${
                isPublicNavActive(pathname, item.href)
                  ? "bg-blue-600 text-white font-black"
                  : "text-zinc-600 hover:bg-zinc-50 dark:hover:bg-zinc-900"
              }`}
            >
              <span className="text-sm font-black uppercase tracking-widest font-sans">{item.name}</span>
            </Link>
          ))}
          {mounted && !isAuthenticated && (
            <div className="pt-4 border-t border-zinc-100 mt-2 space-y-2">
              <Link
                href="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-center px-6 py-4 rounded-2xl text-zinc-600 hover:bg-zinc-50 border border-zinc-200 text-sm font-black uppercase tracking-widest"
              >
                Login
              </Link>
              <Link
                href="/register"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-center px-6 py-4 rounded-2xl bg-blue-600 text-white text-sm font-black uppercase tracking-widest"
              >
                Register
              </Link>
            </div>
          )}
          {mounted && isAuthenticated && (
            <div className="pt-4 border-t border-zinc-100 mt-4 space-y-2">
              <Link
                href="/profile"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 px-6 py-4 rounded-2xl text-zinc-600 hover:bg-zinc-50"
              >
                <User size={18} className="text-blue-600" />
                <span className="text-sm font-black uppercase">My Profile</span>
              </Link>
              <button onClick={logout} className="w-full text-left px-6 py-4 text-red-500 font-black uppercase text-sm">
                Logout
              </button>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
