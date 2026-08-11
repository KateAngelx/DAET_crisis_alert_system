"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  Bell, Menu, X, Zap, User 
} from "lucide-react";
import { useCrisisStore, useAuthStore } from "../store/crisisStore"; 

export function PublicHeader() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, isAuthenticated, logout } = useAuthStore();

  const alerts = useCrisisStore((state) => state.alerts) || [];
  const activeCriticalCount = alerts.filter(
    (a) => a.severity === "Critical" && a.status === "Active" && a.is_public
  ).length;

  const navItems = [
    { name: "Home", href: "/", functional: true },
    { name: "Museum", href: "#", functional: false },
    { name: "AR/VR", href: "#", functional: false },
    { name: "Events", href: "#", functional: false },
    { name: "Crisis", href: "/crisis", functional: true, highlight: true },
    { name: "Shop", href: "#", functional: false },
    { name: "Tours", href: "#", functional: false },
    { name: "Feedback", href: "#", functional: false },
  ];

  const isActive = (path) => path === "/" ? pathname === "/" : pathname.startsWith(path);

  return (
    <header className="sticky top-0 z-50 w-full bg-background/80 backdrop-blur-md border-b border-gray-200 dark:border-white/10">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        
        {/* Logo Section */}
        <Link href="/" className="flex items-center gap-2 font-black text-blue-600 tracking-tighter">
          <div className="bg-blue-600 rounded-lg size-8 flex items-center justify-center shadow-lg shadow-blue-600/20">
            <Zap size={20} className="text-white" fill="white" />
          </div>
          <span className="text-xl hidden sm:block uppercase tracking-tighter font-sans leading-none">CONNECT-DAET</span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden xl:flex items-center gap-1">
          {navItems.map((item) => (
            <Link
              key={item.name}
              href={item.functional ? item.href : "#"}
              className={`px-4 py-2 rounded-full text-xs font-black uppercase tracking-widest transition-all ${
                !item.functional ? "opacity-30 cursor-not-allowed" :
                isActive(item.href) 
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-200" 
                  : "text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              }`}
            >
              <span className="font-sans leading-none">{item.name}</span>
            </Link>
          ))}
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <Link href="/crisis" className="relative p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors">
            <Bell size={22} className="text-zinc-600 dark:text-zinc-400" />
            {activeCriticalCount > 0 && (
              <span className="absolute top-1 right-1 bg-red-600 size-2.5 rounded-full border-2 border-white dark:border-zinc-900 animate-pulse" />
            )}
          </Link>

          {/* Profile & Auth Section */}
          <div className="hidden sm:flex items-center gap-2">
            {isAuthenticated ? (
              <>
                {/* Bagong Profile UI */}
                <div className="flex items-center gap-2 bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 pl-2 pr-4 py-1.5 rounded-full">
                  <div className="bg-blue-600 p-1.5 rounded-full text-white">
                    <User size={14} />
                  </div>
                  <span className="text-[11px] font-black uppercase tracking-tight text-zinc-900 dark:text-zinc-100">
                    {user?.name}
                  </span>
                </div>
                
                <button 
                  onClick={logout}
                  className="text-[10px] font-black uppercase text-red-500 bg-red-50 dark:bg-red-950/30 px-4 py-2.5 rounded-full hover:bg-red-100 transition-all font-sans border border-red-100 dark:border-red-900/50"
                >
                  Logout
                </button>
              </>
            ) : (
              <Link 
                href="/login" 
                className="text-[10px] font-black uppercase bg-zinc-900 dark:bg-zinc-100 text-white dark:text-black px-6 py-2.5 rounded-full hover:opacity-90 transition-all shadow-lg font-sans"
              >
                Login / Join
              </Link>
            )}
          </div>

          <button 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="xl:hidden p-2 rounded-lg hover:bg-zinc-100"
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="xl:hidden border-t border-gray-200 dark:border-white/10 bg-background p-4 space-y-2 animate-in slide-in-from-top">
          {navItems.map((item) => (
            <Link
              key={item.name}
              href={item.functional ? item.href : "#"}
              onClick={() => item.functional && setMobileMenuOpen(false)}
              className={`flex items-center justify-between px-6 py-4 rounded-2xl transition-all ${
                !item.functional ? "opacity-20 cursor-not-allowed" :
                isActive(item.href) ? "bg-blue-600 text-white font-black" : "text-zinc-600 hover:bg-zinc-50 dark:hover:bg-zinc-900"
              }`}
            >
              <span className="text-sm font-black uppercase tracking-widest font-sans">{item.name}</span>
            </Link>
          ))}
          {/* Mobile Profile View */}
          {isAuthenticated && (
             <div className="pt-4 border-t border-zinc-100 mt-4">
                <div className="flex items-center gap-3 px-6 mb-4">
                   <User size={18} className="text-blue-600" />
                   <span className="text-sm font-black uppercase">{user?.name}</span>
                </div>
                <button onClick={logout} className="w-full text-left px-6 py-4 text-red-500 font-black uppercase text-sm">Logout</button>
             </div>
          )}
        </div>
      )}
    </header>
  );
}