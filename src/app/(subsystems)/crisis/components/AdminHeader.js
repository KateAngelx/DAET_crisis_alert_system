import React from "react";
import { Bell, User } from "lucide-react";
import { useCrisisStore } from "../store/crisisStore";
import { Link } from "react-router";
import { MobileAdminMenu } from "./MobileAdminMenu";

export function AdminHeader() {
  const alerts = useCrisisStore((state) => state.alerts);
  const unreadCount = alerts.filter(a => a.status === "Active").length;

  return (
    <header className="h-[72px] bg-white border-b border-gray-200 px-4 lg:px-6 flex items-center justify-between sticky top-0 z-10">
      <div className="flex items-center gap-4">
        <MobileAdminMenu />
        <Link to="/admin" className="lg:hidden">
          <h1 className="text-lg font-semibold text-gray-900">CONNECT-DAET</h1>
        </Link>
        <h1 className="text-xl lg:text-2xl font-semibold text-gray-900 hidden sm:block">
          System 6: Crisis Management
        </h1>
      </div>
      
      <div className="flex items-center gap-4">
        <button className="relative p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <Bell size={24} className="text-gray-600" />
          {unreadCount > 0 && (
            <span className="absolute top-0 right-0 bg-red-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
              {unreadCount}
            </span>
          )}
        </button>
        
        <div className="flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-lg">
          <User size={20} className="text-gray-600" />
          <div>
            <p className="text-sm font-medium text-gray-900">Admin User</p>
            <p className="text-xs text-gray-500">System Manager</p>
          </div>
        </div>
      </div>
    </header>
  );
}