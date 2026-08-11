"use client";
import React from "react";
import { Bell, User, LogOut } from "lucide-react";
import { useCrisisStore, useAuthStore } from "../store/crisisStore";
import Link from "next/link";
import { MobileAdminMenu } from "./MobileAdminMenu";

export function AdminHeader() {
  const alerts = useCrisisStore((state) => state.alerts) || [];
  const { user, logout } = useAuthStore();
  const unreadCount = alerts.filter(a => a.status === "Active").length;

  return (
    <header className="h-[72px] bg-white border-b border-gray-200 px-4 lg:px-6 flex items-center justify-between sticky top-0 z-10">
      <div className="flex items-center gap-4">
        <MobileAdminMenu />
        <Link href="/crisis/admin" className="lg:hidden">
          <h1 className="text-lg font-bold text-slate-900 tracking-tighter uppercase">Connect-Daet</h1>
        </Link>
        <h1 className="text-xl lg:text-2xl font-bold text-slate-900 hidden sm:block tracking-tight">
          System 6: Crisis Management
        </h1>
      </div>
      
      <div className="flex items-center gap-4">
        <button className="relative p-2 hover:bg-slate-100 rounded-xl transition-colors" aria-label="Unread alerts">
          <Bell size={24} className="text-slate-600" />
          {unreadCount > 0 && (
            <span className="absolute top-0 right-0 bg-red-600 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center border-2 border-white animate-in zoom-in duration-200">
              {unreadCount}
            </span>
          )}
        </button>
        
        <div className="flex items-center gap-3 px-3 py-2 bg-slate-50 rounded-xl border border-slate-100">
          <div className="bg-blue-600 p-1.5 rounded-lg">
            <User size={18} className="text-white" />
          </div>
          <div className="hidden md:block leading-none text-left">
            <p className="text-sm font-bold text-slate-900 truncate max-w-[120px]">{user?.name || "Admin User"}</p>
            <p className="text-[10px] text-slate-500 font-medium">System Manager</p>
          </div>
          <button onClick={logout} className="ml-1 p-2 text-red-500 hover:bg-red-100 rounded-lg transition-colors" title="Logout">
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </header>
  );
}