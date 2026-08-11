"use client";

import React, { useState } from "react";
import { 
  AlertTriangle, 
  MapPin, 
  Clock, 
  ShieldCheck, 
  Info,
  ChevronRight,
  Bell
} from "lucide-react";
import { useCrisisStore } from "@/app/store/crisisStore";
import { Card } from "@/app/components/ui/Card";

export default function PublicAlertsPage() {
  const { alerts } = useCrisisStore();
  
  // Filter only ACTIVE alerts for the public
  const activeAlerts = alerts.filter(a => a.status === "Active");
  const criticalCount = activeAlerts.filter(a => a.severity === "Critical").length;

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black font-sans text-left">
      {/* Hero Section */}
      <div className="bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-white/10 pt-24 pb-12">
        <div className="max-w-4xl mx-auto px-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-blue-600 rounded-lg shadow-lg shadow-blue-600/20">
              <Bell size={20} className="text-white" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600">
              Official Safety Feed
            </span>
          </div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tighter uppercase mb-4">
            Safety & Crisis Advisories
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400 font-medium max-w-2xl leading-relaxed">
            Real-time emergency updates and safety protocols provided by the Daet Municipality 
            Crisis Command Center.
          </p>
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-6 py-12">
        {/* Urgent Ticker if Critical Alerts Exist */}
        {criticalCount > 0 && (
          <div className="mb-8 p-4 bg-red-600 rounded-2xl flex items-center justify-between shadow-xl shadow-red-600/20 animate-in fade-in slide-in-from-top-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="text-white animate-pulse" size={24} />
              <p className="text-white font-black uppercase text-xs tracking-widest">
                {criticalCount} Critical Alert(s) Active
              </p>
            </div>
            <span className="text-[10px] font-bold text-white/80 uppercase">Daet, Camarines Norte</span>
          </div>
        )}

        <div className="space-y-6">
          <h2 className="text-xl font-black uppercase tracking-tight mb-4 flex items-center gap-2">
            Active Announcements <span className="text-zinc-400">({activeAlerts.length})</span>
          </h2>

          {activeAlerts.length > 0 ? (
            activeAlerts.map((alert) => (
              <Card 
                key={alert.id} 
                className={`p-6 border-l-[12px] transition-all hover:scale-[1.01] ${
                  alert.severity === 'Critical' ? 'border-red-600' : 
                  alert.severity === 'High' ? 'border-orange-500' : 'border-blue-500'
                }`}
              >
                <div className="flex flex-col md:flex-row justify-between gap-6">
                  <div className="flex-1 space-y-4">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 rounded text-[10px] font-black uppercase tracking-widest ${
                        alert.severity === 'Critical' ? 'bg-red-100 text-red-700' : 'bg-zinc-100 text-zinc-600'
                      }`}>
                        {alert.severity} Priority
                      </span>
                      <span className="text-zinc-400 text-[10px] font-bold uppercase tracking-widest">•</span>
                      <span className="text-zinc-500 text-[10px] font-black uppercase tracking-widest">
                        {alert.type}
                      </span>
                    </div>
                    
                    <h3 className="text-2xl font-black tracking-tight uppercase leading-none">
                      {alert.title}
                    </h3>
                    
                    <p className="text-zinc-600 dark:text-zinc-400 font-medium leading-relaxed">
                      {alert.message}
                    </p>

                    <div className="flex flex-wrap items-center gap-4 pt-4 border-t border-zinc-100 dark:border-white/5">
                      <div className="flex items-center gap-1.5 text-zinc-500 text-xs font-bold uppercase">
                        <MapPin size={14} className="text-blue-600" />
                        {alert.location}
                      </div>
                      <div className="flex items-center gap-1.5 text-zinc-400 text-xs font-bold uppercase">
                        <Clock size={14} />
                        Broadcast: {alert.timestamp}
                      </div>
                    </div>
                  </div>

                  <div className="md:w-32 flex items-center justify-center">
                    <div className="w-full p-4 bg-zinc-50 dark:bg-zinc-800 rounded-2xl flex flex-col items-center text-center">
                      <ShieldCheck className="text-green-500 mb-1" size={24} />
                      <span className="text-[9px] font-black text-zinc-400 uppercase leading-tight">Verified Source</span>
                    </div>
                  </div>
                </div>
              </Card>
            ))
          ) : (
            <div className="py-20 text-center bg-white dark:bg-zinc-900 rounded-[32px] border-2 border-dashed border-zinc-200 dark:border-white/10">
              <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <ShieldCheck className="text-green-600" size={32} />
              </div>
              <h3 className="text-xl font-black uppercase mb-1">Daet is Secure</h3>
              <p className="text-zinc-500 text-sm font-medium">No active emergency alerts at this moment.</p>
            </div>
          )}
        </div>

        {/* Footer Info Card */}
        <div className="mt-16 p-8 bg-zinc-900 rounded-[32px] text-white">
          <h3 className="text-lg font-black uppercase mb-4 flex items-center gap-2 text-left">
            <Info size={20} className="text-blue-400" /> Traveler Guidance
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm font-medium opacity-80 text-left">
            <p>1. Monitor this feed during typhoon months (June - Dec) for rapid updates.</p>
            <p>2. Keep local emergency hotlines saved on your mobile device.</p>
            <p>3. Follow local authorities immediately when 'Critical' status is issued.</p>
            <p>4. Check reward points in your account for acknowledging safety instructions.</p>
          </div>
        </div>
      </main>
    </div>
  );
}