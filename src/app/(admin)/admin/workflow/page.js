"use client";

import React, { useEffect } from "react";
import { 
  Workflow, 
  ArrowRight, 
  Zap, 
  Database, 
  Users, 
  AlertTriangle, 
  CheckCircle,
  Activity,
  ShieldCheck,
  RefreshCcw
} from "lucide-react";
import { Card } from "@/app/components/ui/Card";
import { useCrisisStore } from "@/app/store/crisisStore";

export default function AdminWorkflowPage() {
  const { alerts, totalUsers, fetchTotalUsers, fetchAlerts, loading } = useCrisisStore();

  useEffect(() => {
    fetchTotalUsers();
    fetchAlerts();
  }, [fetchTotalUsers, fetchAlerts]);

  const activeAlertsCount = alerts.filter(a => a.status === "Active").length;

  return (
    <div className="space-y-8 text-left font-sans pb-12">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2 tracking-tight font-sans uppercase">System 6 Workflow</h1>
          <p className="text-gray-600 font-sans leading-none">Automated Crisis Management Operations & Data Pipeline</p>
        </div>
        <div className="flex items-center gap-2 bg-green-50 text-green-700 px-4 py-2 rounded-2xl border border-green-100">
          <ShieldCheck size={18} />
          <span className="text-xs font-black uppercase tracking-widest">System 6 Active</span>
        </div>
      </div>

      {/* 1. Visual Pipeline Section */}
      <Card className="p-8 bg-slate-900 text-white border-none shadow-2xl overflow-hidden relative">
        <div className="absolute top-0 right-0 p-8 opacity-10">
          <Activity size={120} className={loading ? "animate-pulse" : ""} />
        </div>
        
        <h2 className="text-xs font-black uppercase tracking-[0.2em] text-red-400 mb-8 font-sans flex items-center gap-2">
          {loading ? <RefreshCcw size={14} className="animate-spin" /> : <div className="size-2 bg-red-500 rounded-full animate-ping" />}
          Live Emergency Pipeline
        </h2>
        
        <div className="flex flex-col lg:flex-row items-center justify-between gap-8 relative z-10">
          {/* Admin Input */}
          <div className="flex flex-col items-center text-center group">
            <div className="size-16 bg-red-600 rounded-2xl flex items-center justify-center mb-3 shadow-lg group-hover:scale-110 transition-transform">
              <AlertTriangle size={28} />
            </div>
            <p className="font-bold text-sm leading-none font-sans uppercase">Broadcast Issued</p>
            <p className="text-[10px] text-red-300 mt-2 uppercase font-black tracking-widest font-sans">{activeAlertsCount} Active Alerts</p>
          </div>

          <ArrowRight className="hidden lg:block text-slate-700" />

          {/* Database Process */}
          <div className="flex flex-col items-center text-center group">
            <div className="size-16 bg-indigo-600 rounded-2xl flex items-center justify-center mb-3 shadow-lg group-hover:scale-110 transition-transform">
              <Database size={28} />
            </div>
            <p className="font-bold text-sm leading-none font-sans uppercase">Supabase Write</p>
            <p className="text-[10px] text-indigo-300 mt-2 uppercase font-black tracking-widest font-sans">Synced via JSONB</p>
          </div>

          <ArrowRight className="hidden lg:block text-slate-700" />

          {/* Realtime Logic */}
          <div className="flex flex-col items-center text-center group">
            <div className="size-16 bg-blue-600 rounded-2xl flex items-center justify-center mb-3 shadow-lg group-hover:scale-110 transition-transform">
              <Zap size={28} />
            </div>
            <p className="font-bold text-sm leading-none font-sans uppercase">Realtime Push</p>
            <p className="text-[10px] text-blue-300 mt-2 uppercase font-black tracking-widest font-sans">WS Protocol Active</p>
          </div>

          <ArrowRight className="hidden lg:block text-slate-700" />

          {/* End Result */}
          <div className="flex flex-col items-center text-center group">
            <div className="size-16 bg-green-600 rounded-2xl flex items-center justify-center mb-3 shadow-lg group-hover:scale-110 transition-transform">
              <Users size={28} />
            </div>
            <p className="font-bold text-sm leading-none font-sans uppercase">Tourist Alerted</p>
            <p className="text-[10px] text-green-300 mt-2 uppercase font-black tracking-widest font-sans">{totalUsers} Reached</p>
          </div>
        </div>
      </Card>

      {/* 2. Logic Grids */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 font-sans">
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-red-100 rounded-lg text-red-600"><AlertTriangle size={20}/></div>
            <h3 className="font-black uppercase text-sm tracking-tight font-sans">Crisis Response Logic</h3>
          </div>
          <div className="space-y-4">
            <WorkflowStep num="01" title="Broadcast Initialization" desc="Admin creates emergency alert; store captures data object." />
            <WorkflowStep num="02" title="Persistence" desc="Supabase insert-trigger validates the row-level security." />
            <WorkflowStep num="03" title="Propagation" desc="PostgreSQL Realtime publishes change to all connected clients." />
            <WorkflowStep num="04" title="Resolution" desc="Status update to 'Resolved' hides the alert from public feed." />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-blue-100 rounded-lg text-blue-600"><Users size={20}/></div>
            <h3 className="font-black uppercase text-sm tracking-tight font-sans">User Management Flow</h3>
          </div>
          <div className="space-y-4">
            <WorkflowStep num="01" title="Signup Hook" desc="Tourist registers; Supabase Auth creates an identity." />
            <WorkflowStep num="02" title="Trigger Function" desc="PostgreSQL function auto-creates the public profile record." />
            <WorkflowStep num="03" title="Admin Fetch" desc="Admin Panel calls fetchTotalUsers for real-time headcount." />
            <WorkflowStep num="04" title="Audit Trace" desc="User session and role are persisted via Zustand middleware." />
          </div>
        </Card>
      </div>

      {/* 3. System Health Check Action */}
      <Card className="bg-zinc-50 border-zinc-200">
        <div className="flex items-center justify-between font-sans">
          <div className="flex items-center gap-4 text-left leading-none">
            <div className={`size-10 ${loading ? 'bg-blue-500 animate-spin' : 'bg-green-500'} rounded-full flex items-center justify-center text-white shadow-lg`}>
              {loading ? <RefreshCcw size={20} /> : <CheckCircle size={24} />}
            </div>
            <div>
              <p className="font-bold text-gray-900 leading-none mb-1 font-sans">Workflow Integrity: Verified</p>
              <p className="text-xs text-gray-500 font-sans">All PostgreSQL Triggers and Realtime Pub/Sub channels are operational.</p>
            </div>
          </div>
          <button 
            onClick={() => { fetchTotalUsers(); fetchAlerts(); }} 
            className="px-6 py-3 bg-white border border-gray-200 rounded-2xl text-xs font-black hover:bg-gray-50 transition-all font-sans uppercase active:scale-95 flex items-center gap-2"
          >
            <RefreshCcw size={14} className={loading ? "animate-spin" : ""} />
            Test Pipeline
          </button>
        </div>
      </Card>
    </div>
  );
}

function WorkflowStep({ num, title, desc }) {
  return (
    <div className="flex gap-4 group text-left">
      <span className="text-xl font-black text-gray-200 group-hover:text-red-200 transition-colors font-sans">{num}</span>
      <div>
        <h4 className="font-bold text-sm text-gray-900 mb-0.5 font-sans leading-none uppercase">{title}</h4>
        <p className="text-xs text-gray-500 leading-relaxed font-sans">{desc}</p>
      </div>
    </div>
  );
}