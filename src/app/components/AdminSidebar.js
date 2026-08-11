"use client";
import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuthStore } from "@/app/store/crisisStore";
import { 
  LayoutDashboard, Users, Workflow, Building2, Glasses, Calendar,
  AlertTriangle, ShoppingBag, Map, MessageSquare, BarChart3, Gift, Zap, LogOut 
} from "lucide-react";

function Logo() {
  return (
    <div className="h-[72px] border-b border-gray-200 px-6 flex items-center gap-3">
      <div className="bg-blue-600 rounded-lg size-8 flex items-center justify-center">
        <Zap size={20} className="text-white" fill="white" />
      </div>
      <span className="text-xl font-bold text-blue-600 tracking-tighter uppercase">CONNECT-DAET</span>
    </div>
  );
}

export function AdminSidebar() {
  const pathname = usePathname();
  const { logout } = useAuthStore();

  const coreAdmin = [
    { path: "/admin", label: "Dashboard", icon: <LayoutDashboard size={20} /> },
    { path: "/admin/users", label: "Users", icon: <Users size={20} /> },
    { path: "/admin/workflow", label: "Workflow", icon: <Workflow size={20} /> },
  ];

  const tourismModules = [
    { path: "/museum/admin", label: "Museum", icon: <Building2 size={20} /> },
    { path: "/arvr/admin", label: "AR / VR", icon: <Glasses size={20} /> },
    { path: "/events/admin", label: "Events", icon: <Calendar size={20} /> },
    { path: "/crisis/admin", label: "Crisis Management", icon: <AlertTriangle size={20} />, isLive: true },
    { path: "/shop/admin", label: "Shop", icon: <ShoppingBag size={20} /> },
    { path: "/tours/admin", label: "Tours", icon: <Map size={20} /> },
    { path: "/feedback/admin", label: "Feedback", icon: <MessageSquare size={20} /> },
    { path: "/analytics/admin", label: "Analytics", icon: <BarChart3 size={20} /> },
    { path: "/rewards/admin", label: "Rewards", icon: <Gift size={20} /> },
  ];

  const isActive = (path) => path === "/admin" ? pathname === "/admin" : pathname.startsWith(path);

  return (
    <aside className="w-[280px] bg-white border-r border-gray-200 flex flex-col h-screen sticky top-0 hidden lg:flex font-sans">
      <Logo />
      
      <div className="flex-1 overflow-y-auto px-4 py-6 no-scrollbar">
        <div className="mb-8">
          <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4 px-4">Core Administration</h3>
          <div className="space-y-1">
            {coreAdmin.map((item) => (
              <Link key={item.path} href={item.path} className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-200 ${isActive(item.path) ? "bg-blue-50 text-blue-600 shadow-sm ring-1 ring-blue-100" : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"}`}>
                {item.icon}
                <span className="font-bold text-sm">{item.label}</span>
              </Link>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4 px-4">Smart Tourism Modules</h3>
          <div className="space-y-1">
            {tourismModules.map((item) => (
              <Link key={item.path} href={item.path} className={`flex items-center justify-between px-4 py-3 rounded-2xl transition-all duration-200 ${isActive(item.path) ? "bg-blue-600 text-white shadow-lg shadow-blue-200" : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"}`}>
                <div className="flex items-center gap-3">
                  {item.icon}
                  <span className="font-bold text-sm">{item.label}</span>
                </div>
                {item.isLive && (
                  <span className={`text-[9px] font-black px-1.5 py-0.5 rounded tracking-tighter ${isActive(item.path) ? "bg-white text-blue-600" : "bg-green-500 text-white"}`}>LIVE</span>
                )}
              </Link>
            ))}
          </div>
        </div>
      </div>

      <div className="p-4 border-t border-gray-100 space-y-3">
        <div className="bg-gray-50 rounded-2xl p-4">
          <p className="text-[10px] font-bold text-gray-400 uppercase mb-1 tracking-widest leading-none">System Health</p>
          <div className="flex items-center gap-2">
            <div className="size-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-xs font-bold text-gray-700">All Pipelines Operational</span>
          </div>
        </div>
        <button onClick={logout} className="w-full flex items-center justify-center gap-2 bg-red-50 text-red-600 px-4 py-3 rounded-2xl hover:bg-red-100 transition-colors font-bold text-sm shadow-sm">
          <LogOut size={18} /> Secure Logout
        </button>
      </div>
    </aside>
  );
}