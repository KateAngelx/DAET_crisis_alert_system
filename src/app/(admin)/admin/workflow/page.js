"use client";

import React, { useEffect } from "react";
import {
  ArrowRight, Zap, Database, Users, AlertTriangle, CheckCircle, Activity, ShieldCheck, RefreshCcw,
} from "lucide-react";
import { AdminPanel } from "@/app/components/admin/AdminPanel";
import { DashboardPageHeader } from "@/app/components/dashboard/DashboardPageHeader";
import { adminShell } from "@/lib/designSystem";
import { RoleContextBanner } from "@/app/components/dashboard/RoleContextBanner";
import { ROLE_INTERFACE } from "@/lib/roleInterfaceCopy";
import { useCrisisStore } from "@/app/store/crisisStore";

export default function AdminWorkflowPage() {
  const { alerts, totalUsers, fetchTotalUsers, fetchAlerts, loading } = useCrisisStore();

  useEffect(() => {
    fetchTotalUsers();
    fetchAlerts();
  }, [fetchTotalUsers, fetchAlerts]);

  const activeAlertsCount = alerts.filter((a) => a.status === "Active").length;

  return (
    <>
      <DashboardPageHeader
        title={ROLE_INTERFACE.admin.workflow.title}
        description={ROLE_INTERFACE.admin.workflow.description}
        action={
          <div className="flex items-center gap-2 bg-green-50 text-green-700 px-4 py-2 rounded-2xl border border-green-100">
            <ShieldCheck size={18} />
            <span className="text-xs font-black uppercase tracking-widest">Operational</span>
          </div>
        }
      />
      <RoleContextBanner helper={ROLE_INTERFACE.admin.workflow.helper} tone="info" />

      <AdminPanel className="border-zinc-800" noPadding bodyClassName="p-6 sm:p-8 bg-zinc-900 text-white overflow-hidden relative">
        <div className="absolute top-0 right-0 p-8 opacity-10">
          <Activity size={120} className={loading ? "animate-pulse" : ""} />
        </div>

        <h2 className="text-xs font-black uppercase tracking-[0.2em] text-red-400 mb-8 flex items-center gap-2">
          {loading ? (
            <RefreshCcw size={14} className="animate-spin" />
          ) : (
            <div className="size-2 bg-red-500 rounded-full animate-ping" />
          )}
          Live Alert Pipeline
        </h2>

        <div className="flex flex-col lg:flex-row items-center justify-between gap-8 relative z-10">
          {[
            { icon: AlertTriangle, label: "Alert Issued", sub: `${activeAlertsCount} Active`, color: "bg-red-600" },
            { icon: Database, label: "Record Saved", sub: "Alert stored in system", color: "bg-indigo-600" },
            { icon: Zap, label: "Public Feed Updated", sub: "Crisis Hub & Advisories", color: "bg-blue-600" },
            { icon: Users, label: "Users Notified", sub: `${totalUsers} Registered`, color: "bg-green-600" },
          ].map((step, i, arr) => (
            <React.Fragment key={step.label}>
              <div className="flex flex-col items-center text-center group">
                <div className={`size-16 ${step.color} rounded-2xl flex items-center justify-center mb-3 shadow-lg group-hover:scale-105 transition-transform`}>
                  <step.icon size={28} />
                </div>
                <p className="font-black text-sm uppercase">{step.label}</p>
                <p className="text-[10px] text-zinc-400 mt-2 uppercase font-black tracking-widest">{step.sub}</p>
              </div>
              {i < arr.length - 1 && <ArrowRight className="hidden lg:block text-zinc-700" />}
            </React.Fragment>
          ))}
        </div>
      </AdminPanel>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <AdminPanel title="Crisis response flow">
          <div className="space-y-4">
            <WorkflowStep num="01" title="Issue Alert" desc="Admin publishes alert with type, severity, location, and safety instructions." />
            <WorkflowStep num="02" title="Public Notification" desc="Alert appears on Crisis Hub, Advisories, and registered user notifications." />
            <WorkflowStep num="03" title="Monitor & Update" desc="Staff track affected areas and update alert status as conditions change." />
            <WorkflowStep num="04" title="Resolve Alert" desc="Marking an alert Resolved removes it from the public active feed." />
          </div>
        </AdminPanel>

        <AdminPanel title="User registration flow">
          <div className="space-y-4">
            <WorkflowStep num="01" title="Tourist Registers" desc="Visitor creates an account with contact details for alert notifications." />
            <WorkflowStep num="02" title="Profile Created" desc="Account is added to the tourism office user registry as a tourist." />
            <WorkflowStep num="03" title="Alert Delivery" desc="When the tourism office issues an alert, registered users receive notifications by configured channels." />
            <WorkflowStep num="04" title="Report Submission" desc="Registered users can submit incident reports and track response status." />
          </div>
        </AdminPanel>
      </div>

      <AdminPanel title="Channel status">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className={`size-10 ${loading ? "bg-blue-500" : "bg-green-500"} rounded-full flex items-center justify-center text-white shadow-lg`}>
              {loading ? <RefreshCcw size={20} className="animate-spin" /> : <CheckCircle size={24} />}
            </div>
            <div>
              <p className="font-black text-zinc-900 leading-none mb-1">Alert delivery active</p>
              <p className="text-xs text-zinc-500">Public feeds and notification channels are responding normally.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => { fetchTotalUsers(); fetchAlerts(); }}
            className={adminShell.btnGhost}
          >
            <RefreshCcw size={14} className={loading ? "animate-spin" : ""} />
            Refresh Status
          </button>
        </div>
      </AdminPanel>
    </>
  );
}

function WorkflowStep({ num, title, desc }) {
  return (
    <div className="flex gap-4 group">
      <span className="text-xl font-black text-zinc-200 group-hover:text-red-200 transition-colors">{num}</span>
      <div>
        <h4 className="font-black text-sm text-zinc-900 mb-0.5 uppercase">{title}</h4>
        <p className="text-xs text-zinc-500 leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}
