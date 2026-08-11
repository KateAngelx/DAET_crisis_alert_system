"use client";

import { useState } from "react";
import Link from "next/link"; // Inayos mula sa react-router para sa Next.js
import { usePathname } from "next/navigation"; // Inayos mula sa react-router para sa Next.js
import { 
  Menu, 
  X, 
  LayoutDashboard, 
  Users, 
  Workflow, 
  Building2, 
  Glasses, 
  Calendar, 
  AlertTriangle, 
  ShoppingBag, 
  Map, 
  MessageSquare, 
  BarChart3, 
  Gift 
} from "lucide-react";

export function MobileAdminMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname(); // Ginamit ang usePathname para sa route syncing

  const coreAdmin = [
    { path: "/admin", label: "Dashboard", icon: <LayoutDashboard size={20} /> },
    { path: "/admin/users", label: "Users", icon: <Users size={20} /> },
    { path: "/admin/workflow", label: "Workflow", icon: <Workflow size={20} /> },
  ];

  const tourismModules = [
    { path: "/museum/admin", label: "Museum", icon: <Building2 size={20} /> },
    { path: "/arvr/admin", label: "AR / VR", icon: <Glasses size={20} /> },
    { path: "/events/admin", label: "Events", icon: <Calendar size={20} /> },
    { 
      path: "/crisis/admin", // In-update para sa bagong route structure
      label: "Crisis Management", 
      icon: <AlertTriangle size={20} />, 
      isLive: true 
    },
    { path: "/shop/admin", label: "Shop", icon: <ShoppingBag size={20} /> },
    { path: "/tours/admin", label: "Tours", icon: <Map size={20} /> },
    { path: "/feedback/admin", label: "Feedback", icon: <MessageSquare size={20} /> },
    { path: "/analytics/admin", label: "Analytics", icon: <BarChart3 size={20} /> },
    { path: "/rewards/admin", label: "Rewards", icon: <Gift size={20} /> },
  ];

  const isActive = (path) => {
    if (path === "/admin") {
      return pathname === "/admin";
    }
    return pathname.startsWith(path);
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="lg:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors"
        aria-label="Open menu"
      >
        <Menu size={24} className="text-gray-600" />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 w-[280px] bg-white z-50 lg:hidden overflow-y-auto shadow-2xl animate-in slide-in-from-left duration-300">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h2 className="text-lg font-bold text-blue-600 tracking-tighter">CONNECT-DAET</h2>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
                aria-label="Close menu"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-4 space-y-6">
              <div>
                <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4 px-4">
                  Core Admin
                </h3>
                <div className="space-y-1">
                  {coreAdmin.map((item) => (
                    <Link
                      key={item.path}
                      href={item.path}
                      onClick={() => setIsOpen(false)}
                      className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-all ${
                        isActive(item.path)
                          ? "bg-blue-50 text-blue-600 font-bold shadow-sm ring-1 ring-blue-100"
                          : "text-gray-600 hover:bg-gray-50"
                      }`}
                    >
                      {item.icon}
                      <span className="text-sm">{item.label}</span>
                    </Link>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4 px-4">
                  Smart Tourism Modules
                </h3>
                <div className="space-y-1">
                  {tourismModules.map((item) => (
                    <Link
                      key={item.path}
                      href={item.path}
                      onClick={() => setIsOpen(false)}
                      className={`flex items-center justify-between px-4 py-3 rounded-2xl transition-all ${
                        isActive(item.path)
                          ? "bg-blue-600 text-white shadow-lg shadow-blue-200 font-bold"
                          : "text-gray-600 hover:bg-gray-50"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {item.icon}
                        <span className="text-sm">{item.label}</span>
                      </div>
                      {item.isLive && (
                        <span className={`text-[9px] font-black px-1.5 py-0.5 rounded tracking-tighter ${
                          isActive(item.path) ? "bg-white text-blue-600" : "bg-green-500 text-white"
                        }`}>
                          LIVE
                        </span>
                      )}
                    </Link>
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