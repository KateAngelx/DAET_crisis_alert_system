"use client";

import React, { useEffect } from "react";
import { 
  AlertTriangle, 
  MapPin, 
  Clock, 
  ShieldCheck, 
  Info,
} from "lucide-react";
import { useCrisisStore, useAuthStore } from "@/app/store/crisisStore";
import { Card } from "@/app/components/ui/Card";
import { InfoPageHero, PublicPageShell, PublicPageContent, publicLayout } from "@/app/components/InfoPageHero";
import { AsyncState, ErrorState } from "@/app/components/ui/AsyncState";
import { AlertCardSkeletonList } from "@/app/components/ui/Skeletons";

export default function PublicAlertsPage() {
  const { alerts, fetchAlerts, loading, error } = useCrisisStore();
  const { isAuthenticated } = useAuthStore();

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);
  
  const activeAlerts = alerts.filter(a => a.status === "Active");
  const criticalCount = activeAlerts.filter(a => a.severity === "Critical").length;

  return (
    <PublicPageShell>
      <InfoPageHero
        title="Safety & Crisis Advisories"
        description="Official announcements from the Daet Crisis Command Center. Each advisory lists the crisis type, severity, affected area, time issued, and instructions for tourists."
      />

      <PublicPageContent>
        {!loading && criticalCount > 0 && (
          <div className="mb-6 p-4 bg-red-600 rounded-2xl flex items-center justify-between shadow-xl shadow-red-600/20 animate-in fade-in slide-in-from-top-4">
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
          <h2 className={`${publicLayout.sectionTitle} flex items-center gap-2`}>
            Active Announcements {!loading && <span className="text-zinc-400">({activeAlerts.length})</span>}
          </h2>

          <AsyncState
            loading={loading}
            error={error}
            isEmpty={!loading && !error && activeAlerts.length === 0}
            onRetry={fetchAlerts}
            loadingFallback={<AlertCardSkeletonList count={4} />}
            errorFallback={
              <ErrorState message={error} onRetry={fetchAlerts} title="Could not load advisories" />
            }
            emptyFallback={
              <div className="py-20 text-center bg-zinc-50 rounded-3xl border-2 border-dashed border-zinc-200">
                <div className="p-4 bg-green-50 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                  <ShieldCheck className="text-green-600" size={32} />
                </div>
                <h3 className="text-xl font-black uppercase mb-4">No Active Alerts</h3>
                <p className="text-zinc-500 text-sm font-medium">No crisis is currently reported for Daet. This page will update when LGU publishes a new advisory.</p>
              </div>
            }
          >
            {activeAlerts.map((alert) => (
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
                    
                    <h3 className="text-xl font-black tracking-tight uppercase leading-none">
                      {alert.title}
                    </h3>
                    
                    <p className="text-zinc-600 font-medium leading-relaxed text-sm">
                      {alert.message}
                    </p>

                    <div className="flex flex-wrap items-center gap-4 pt-4 border-t border-zinc-100">
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
                    <div className="w-full p-4 bg-zinc-50 rounded-2xl flex flex-col items-center text-center">
                      <ShieldCheck className="text-green-500 mb-1" size={24} />
                      <span className="text-[9px] font-black text-zinc-400 uppercase leading-tight">LGU Issued</span>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </AsyncState>
        </div>

        <div className="mt-12 p-8 bg-zinc-900 rounded-3xl text-white">
          <h3 className="text-xl font-black uppercase mb-4 flex items-center gap-2 text-left">
            <Info size={20} className="text-blue-400" /> Safety Instructions for Tourists
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm font-medium opacity-90 text-left">
            <p>1. During typhoon season (June–December), check this page before visiting beaches or remote areas.</p>
            <p>2. Save emergency numbers: <strong>911</strong> (national), <strong>117</strong> (PNP), municipal hotline <strong>(054) 440-1234</strong>.</p>
            <p>3. When a Critical alert is posted, follow the listed instructions and avoid named affected areas.</p>
            {!isAuthenticated && (
              <p>4. Register your account to receive email, SMS, and app notifications when LGU issues a new alert.</p>
            )}
            {isAuthenticated && (
              <p>4. Check your Notifications inbox when LGU issues a new alert for your registered contact details.</p>
            )}
          </div>
        </div>
      </PublicPageContent>
    </PublicPageShell>
  );
}
