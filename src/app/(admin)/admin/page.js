"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { 
  Users, 
  Calendar, 
  DollarSign, 
  AlertTriangle,
  TrendingUp,
  ArrowRight,
  Lock 
} from "lucide-react";
import { Card } from "@/app/components/ui/Card";
import { useCrisisStore } from "@/app/store/crisisStore";

export default function AdminDashboard() {
  // Kunin ang alerts at totalUsers mula sa store
  const { alerts, totalUsers, fetchTotalUsers, fetchAlerts } = useCrisisStore();
  
  // I-fetch ang live data pag-load ng dashboard
  useEffect(() => {
    fetchTotalUsers();
    fetchAlerts();
  }, [fetchTotalUsers, fetchAlerts]);

  const activeAlerts = alerts.filter((a) => a.status === "Active");

  const modules = [
    { name: "Museum", status: "Placeholder" },
    { name: "AR/VR", status: "Placeholder" },
    { name: "Events", status: "Placeholder" },
    { name: "Crisis Management", status: "Active", active: true },
    { name: "Shop", status: "Placeholder" },
    { name: "Tours", status: "Placeholder" },
    { name: "Feedback", status: "Placeholder" },
    { name: "Analytics", status: "Placeholder" },
    { name: "Rewards", status: "Placeholder" },
  ];

  return (
    <div className="space-y-6">
      <div className="text-left">
        <h1 className="text-3xl font-bold text-gray-900 mb-2 font-sans">Dashboard Overview</h1>
        <p className="text-gray-600 font-sans">Welcome to CONNECT-DAET.ai Admin Panel</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* TOTAL USERS (Ngayon ay Live na mula sa DB) */}
        <Card className="text-left">
          <div className="flex items-center justify-between mb-4 font-sans">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Users size={24} className="text-blue-600" />
            </div>
            <span className="text-xs text-green-600 font-medium flex items-center gap-1 font-sans">
              <TrendingUp size={12} />
              +Live
            </span>
          </div>
          <p className="text-sm text-gray-600 mb-1 font-sans">Total Users</p>
          <p className="text-3xl font-bold text-gray-900 font-sans">{totalUsers.toLocaleString()}</p>
        </Card>

        {/* ACTIVE BOOKINGS (Placeholder) */}
        <Card className="bg-gray-50 border-dashed opacity-70 cursor-not-allowed text-left">
          <div className="flex items-center justify-between mb-4 font-sans">
            <div className="p-3 bg-gray-200 rounded-lg text-gray-400">
              <Calendar size={24} />
            </div>
            <Lock size={16} className="text-gray-400" />
          </div>
          <p className="text-sm text-gray-400 mb-1 font-sans">Active Bookings</p>
          <p className="text-xl font-bold text-gray-400 italic font-sans leading-none">Module Placeholder</p>
        </Card>

        {/* DAILY REVENUE (Placeholder) */}
        <Card className="bg-gray-50 border-dashed opacity-70 cursor-not-allowed text-left">
          <div className="flex items-center justify-between mb-4 font-sans">
            <div className="p-3 bg-gray-200 rounded-lg text-gray-400">
              <DollarSign size={24} />
            </div>
            <Lock size={16} className="text-gray-400" />
          </div>
          <p className="text-sm text-gray-400 mb-1 font-sans">Daily Revenue</p>
          <p className="text-xl font-bold text-gray-400 italic font-sans leading-none">Module Placeholder</p>
        </Card>

        {/* ACTIVE ALERTS (Live Data) */}
        <Card className="bg-red-50 border-2 border-red-200 text-left">
          <div className="flex items-center justify-between mb-4 font-sans">
            <div className="p-3 bg-red-100 rounded-lg">
              <AlertTriangle size={24} className="text-red-600" />
            </div>
            <Link 
              href="/crisis/admin"
              className="text-xs text-red-600 font-medium flex items-center gap-1 hover:underline font-sans"
            >
              View All
              <ArrowRight size={12} />
            </Link>
          </div>
          <p className="text-sm text-gray-600 mb-1 font-sans">Active Alerts</p>
          <p className="text-3xl font-bold text-red-600 font-sans">{activeAlerts.length}</p>
        </Card>
      </div>

      {/* Main Crisis Module CTA */}
      <Card className="bg-gradient-to-r from-blue-600 to-blue-700 text-white text-left">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="max-w-xl">
            <div className="flex items-center gap-2 mb-2 font-sans">
              <AlertTriangle size={24} className="text-white" />
              <h2 className="text-xl font-bold uppercase tracking-tight">Crisis Management Module</h2>
            </div>
            <p className="text-blue-100 mb-6 font-sans text-sm leading-relaxed">
              System 6 is fully operational. Monitor conditions and broadcast emergency alerts to tourists in real-time.
            </p>
            <Link
              href="/crisis/admin"
              className="inline-flex items-center gap-2 bg-white text-blue-600 px-6 py-3 rounded-full font-bold hover:bg-blue-50 transition-all shadow-lg active:scale-95 font-sans uppercase text-xs tracking-widest"
            >
              Manage Alerts
              <ArrowRight size={18} />
            </Link>
          </div>
          <div className="hidden lg:block">
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-8">
              <div className="text-center font-sans">
                <p className="text-5xl font-black mb-1">{activeAlerts.length}</p>
                <p className="text-xs font-bold uppercase tracking-widest text-blue-100">Live Active Alerts</p>
              </div>
            </div>
          </div>
        </div>
      </Card>

      <div className="text-left">
        <h2 className="text-xl font-bold text-gray-900 mb-4 tracking-tight font-sans">System Modules Status</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {modules.map((module) => (
            <Card key={module.name} className={module.active ? "border-2 border-blue-600 shadow-md ring-1 ring-blue-600/10" : "opacity-80 bg-gray-50"}>
              <div className="flex items-center justify-between font-sans">
                <div className="text-left">
                  <h3 className="font-bold text-gray-900 text-sm">{module.name}</h3>
                  <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{module.status}</p>
                </div>
                <div className={`w-3 h-3 rounded-full shadow-inner ${module.active ? "bg-green-500 animate-pulse ring-4 ring-green-500/20" : "bg-gray-300"}`} />
              </div>
            </Card>
          ))}
        </div>
      </div>

      <Card className="bg-amber-50 border border-amber-200 shadow-sm text-left">
        <div className="flex items-start gap-4">
          <div className="p-2 bg-amber-100 rounded-lg shrink-0">
            <AlertTriangle size={20} className="text-amber-600" />
          </div>
          <div>
            <h3 className="font-bold text-amber-900 mb-1 font-sans">Prototype Notice</h3>
            <p className="text-sm text-amber-800 leading-relaxed font-sans">
              This environment is a technical demonstration. Currently, the <strong>Crisis Management (System 6)</strong> component is the only live module.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}