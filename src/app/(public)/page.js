"use client";
import React, { useEffect, useState, useLayoutEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight, ShieldCheck, Bell, MapPin, PhoneCall, Radio, FileText, Users
} from "lucide-react";
import { useCrisisStore, useAuthStore } from "@/app/store/crisisStore";
import { HeroStatSkeleton } from "@/app/components/ui/Skeletons";
import { typography, iconSize, statGrid } from "@/lib/designSystem";

export default function Home() {
  const { fetchAlerts, alerts, loading, error } = useCrisisStore();
  const { isAuthenticated, user } = useAuthStore();
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
    fetchAlerts();
  }, [fetchAlerts]);

  useLayoutEffect(() => {
    if (!mounted || !isAuthenticated) return;
    if (user?.role === 'admin') router.replace('/admin');
    if (user?.role === 'guide') router.replace('/guide');
  }, [mounted, isAuthenticated, user, router]);

  if (!mounted || (isAuthenticated && (user?.role === 'admin' || user?.role === 'guide'))) return null;

  const activeAlerts = alerts.filter((a) => a.status === "Active" && a.is_public);
  const criticalCount = activeAlerts.filter((a) => a.severity === "Critical").length;

  return (
    <div className="flex flex-col min-h-screen bg-white font-sans text-left">
      
      {/* HERO SECTION */}
      <section className="relative pt-8 pb-8 overflow-hidden bg-zinc-50 border-b border-zinc-200">
        <div className="absolute inset-0 w-full h-full bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        <div className="absolute top-0 right-0 -translate-y-12 translate-x-1/3 w-[800px] h-[800px] bg-blue-100 rounded-full blur-3xl opacity-60 mix-blend-multiply pointer-events-none"></div>

        <div className="relative max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          
          <div className="flex flex-col items-start gap-6 z-10">
            {isAuthenticated && (
              <div className="animate-in fade-in slide-in-from-bottom-2 duration-700">
                <h2 className={`${typography.pageTitle} text-blue-600 leading-none mb-1.5`}>
                  Mabuhay, {user?.name || 'Traveler'}!
                </h2>
                <p className="text-sm text-zinc-500 font-medium">
                  Check active alerts, affected areas, and safety instructions for Daet.
                </p>
              </div>
            )}

            <div className="space-y-2">
              <h1 className={`${typography.heroTitle} text-zinc-950`}>
                Current <span className="text-blue-600">Alerts.</span>{" "}
                <span className="text-zinc-400">Affected Areas.</span>
              </h1>
              <p className="text-sm text-zinc-500 font-medium max-w-md leading-relaxed">
                View official crisis updates for Daet, Camarines Norte — including alert type, severity, location, reported time, and safety instructions for tourists.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
              <Link
                href="/crisis"
                className="group flex items-center justify-center gap-3 bg-blue-600 text-white px-8 py-4 rounded-full font-black uppercase text-xs tracking-widest hover:bg-blue-700 transition-all shadow-xl shadow-blue-600/20 active:scale-95"
              >
                View Live Alerts
                <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
              </Link>

              {isAuthenticated ? (
                <Link
                  href="/crisis/reports"
                  className="flex items-center justify-center gap-3 px-8 py-4 rounded-full border border-zinc-200 bg-white hover:bg-zinc-50 transition-all shadow-sm active:scale-95"
                >
                  <FileText size={18} className="text-blue-600" />
                  <span className="text-xs font-black text-zinc-900 uppercase tracking-widest">
                    My Reports
                  </span>
                </Link>
              ) : (
                <Link
                  href="/register"
                  className="flex items-center justify-center gap-3 px-8 py-4 rounded-full border border-zinc-200 bg-white hover:bg-zinc-50 transition-all shadow-sm active:scale-95"
                >
                  <Users size={18} className="text-blue-600" />
                  <span className="text-xs font-black text-zinc-900 uppercase tracking-widest">
                    Register for Alerts
                  </span>
                </Link>
              )}
            </div>

            {loading ? (
              <HeroStatSkeleton />
            ) : (
            <div className="pt-8 border-t border-zinc-200 w-full flex items-center gap-8">
              <div>
                <p className="text-2xl font-black text-zinc-900 leading-none mb-1">{activeAlerts.length}</p>
                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Active Alerts</p>
              </div>
              <div>
                <p className="text-2xl font-black text-red-600 leading-none mb-1">{criticalCount}</p>
                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Critical</p>
              </div>
              <div>
                <p className="text-2xl font-black text-zinc-900 leading-none mb-1">24/7</p>
                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Monitoring</p>
              </div>
            </div>
            )}
            {error && (
              <p className="text-xs font-bold text-red-500 mt-2">Could not load alert counts. Showing cached data.</p>
            )}
          </div>

          {/* Right Content - Visual Presentation */}
          <div className="relative h-[550px] w-full hidden lg:block perspective-1000">
            
            <div className="absolute top-12 right-4 bg-white p-6 rounded-[32px] shadow-2xl border border-zinc-100 w-72 animate-in slide-in-from-right-8 duration-700 delay-100 z-30 hover:-translate-y-2 transition-transform">
              <div className="flex items-center gap-3 mb-3">
                <div className="bg-red-100 p-2.5 rounded-xl text-red-600">
                  <Bell size={20} className="animate-pulse" />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-red-600">Critical — Weather</p>
                  <p className="text-sm font-bold text-zinc-900">Typhoon Signal No. 2</p>
                </div>
              </div>
              <p className="text-xs text-zinc-500 font-medium">Reported 6:30 AM · Affects Bagasbas Beach. Avoid coastal areas until LGU clearance.</p>
            </div>

            <div className="absolute bottom-16 left-0 bg-white p-6 rounded-[32px] shadow-2xl border border-zinc-100 w-72 animate-in slide-in-from-bottom-8 duration-700 delay-300 z-30 hover:-translate-y-2 transition-transform">
              <div className="flex items-center gap-3 mb-3">
                <div className="bg-blue-100 p-2.5 rounded-xl text-blue-600">
                  <MapPin size={20} />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-blue-600">Restricted Area</p>
                  <p className="text-sm font-bold text-zinc-900">Bagasbas Beach</p>
                </div>
              </div>
              <p className="text-xs text-zinc-500 font-medium">Status: Active · Tourists advised to stay inland and follow barangay evacuation routes.</p>
            </div>

            <div className="absolute inset-0 m-auto w-[320px] h-[450px] bg-zinc-900 rounded-[48px] shadow-2xl overflow-hidden z-20 border-[8px] border-white flex flex-col">
              <div className="w-full bg-zinc-950 p-4 flex items-center justify-between border-b border-white/10">
                <div className="flex items-center gap-2">
                  <ShieldCheck size={16} className="text-blue-500" />
                  <span className="text-[10px] font-black text-white uppercase tracking-widest">CONNECT-DAET</span>
                </div>
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              </div>
              <div className="flex-1 bg-gradient-to-br from-zinc-800 to-zinc-900 p-6 flex flex-col gap-4">
                <div className="w-full h-32 bg-blue-900/30 rounded-2xl border border-blue-500/20 flex items-center justify-center">
                  <Bell size={32} className="text-blue-400 animate-pulse" />
                </div>
                <div className="w-3/4 h-8 bg-zinc-800/50 rounded-lg border border-white/5" />
                <div className="w-full h-8 bg-zinc-800/50 rounded-lg border border-white/5" />
                <div className="mt-auto w-full py-4 bg-blue-600/20 text-blue-400 rounded-2xl border border-blue-500/20 text-center text-[10px] font-black uppercase tracking-widest">
                  Emergency Alert System
                </div>
              </div>
            </div>
            
          </div>
        </div>
      </section>

      {isAuthenticated && user?.role === 'tourist' && (
        <section className="py-16 bg-white border-b border-zinc-100">
          <div className="max-w-7xl mx-auto px-6">
            <h3 className={`${typography.cardTitle} mb-4`}>Your Current Alert Status</h3>
            <div className={statGrid.dashboardThree}>
              <Link href="/crisis/alerts" className="p-4 sm:p-6 rounded-2xl border border-zinc-100 bg-zinc-50 hover:border-blue-200 hover:shadow-md transition-all no-underline min-w-0">
                <p className={`${typography.statLabel} text-zinc-400 mb-1`}>Active Alerts</p>
                <p className={`${typography.statValue} text-red-600 mb-2`}>{activeAlerts.length}</p>
                <p className={`${typography.bodySm} font-bold text-blue-600 uppercase tracking-widest`}>View Advisories →</p>
              </Link>
              <Link href="/crisis/reports" className="p-4 sm:p-6 rounded-2xl border border-zinc-100 bg-zinc-50 hover:border-blue-200 hover:shadow-md transition-all no-underline min-w-0">
                <p className={`${typography.statLabel} text-zinc-400 mb-1`}>My Reports</p>
                <p className={`${typography.statValue} text-blue-600 mb-2`}>Track</p>
                <p className={`${typography.bodySm} font-bold text-blue-600 uppercase tracking-widest`}>View Reports →</p>
              </Link>
              <Link href="/notifications" className="p-4 sm:p-6 rounded-2xl border border-zinc-100 bg-zinc-50 hover:border-blue-200 hover:shadow-md transition-all no-underline min-w-0">
                <p className={`${typography.statLabel} text-zinc-400 mb-1`}>Notifications</p>
                <p className={`${typography.statValue} text-purple-600 mb-2`}>{criticalCount > 0 ? criticalCount : '—'}</p>
                <p className={`${typography.bodySm} font-bold text-blue-600 uppercase tracking-widest`}>Open Inbox →</p>
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* SERVICES SECTION */}
      <section className="py-16 bg-white relative z-20">
        <div className="max-w-7xl mx-auto px-6 text-left">
          
          <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <h3 className="text-xl font-black uppercase tracking-tight text-zinc-900 mb-4">
                What You Can Check Here
              </h3>
              <p className="text-zinc-500 font-medium max-w-xl text-sm leading-relaxed">
                Each section shows specific crisis information: active alerts, affected locations, report status, and official announcements from Daet LGU.
              </p>
            </div>
            <Link 
              href={isAuthenticated ? "/crisis/reports" : "/login"} 
              className="shrink-0 flex items-center gap-2 bg-blue-50 text-blue-600 px-6 py-3.5 rounded-full font-black text-xs uppercase tracking-widest hover:bg-blue-100 transition-colors border border-blue-100"
            >
              <PhoneCall size={16} /> Report an Incident
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <ServiceCard
              title="Crisis Hub"
              icon={<ShieldCheck size={28} />}
              desc="See active alerts with severity, location, time reported, and affected-area map."
              href="/crisis"
            />
            <ServiceCard
              title="Safety Advisories"
              icon={<Bell size={28} />}
              desc="Read official announcements, safety instructions, and restricted or evacuation areas."
              href="/crisis/alerts"
            />
            <ServiceCard
              title="Incident Reporting"
              icon={<FileText size={28} />}
              desc="Report a hazard or emergency with location details and track LGU response status."
              href="/crisis/reports"
            />
            <ServiceCard
              title="Alert Notifications"
              icon={<Radio size={28} />}
              desc="Get notified when a new alert is issued for your registered contact details."
              href="/notifications"
            />
          </div>

          <div className="mt-12 p-8 bg-blue-50 border border-blue-100 rounded-3xl flex items-start gap-6">
             <ShieldCheck className="text-blue-600 shrink-0" size={24} />
             <div>
                <p className="text-xs font-black uppercase text-blue-600 tracking-widest mb-1">Emergency Contacts</p>
                <p className="text-sm text-blue-800 font-medium leading-relaxed">
                  For immediate danger, call <strong>911</strong> or <strong>117 (PNP)</strong>. This system provides official crisis updates and report tracking — it does not dispatch emergency responders.
                </p>
             </div>
          </div>

        </div>
      </section>
    </div>
  );
}

function ServiceCard({ title, desc, icon, href = "#" }) {
  return (
    <Link 
      href={href} 
      className="p-8 rounded-[40px] border border-blue-600 bg-white shadow-xl hover:-translate-y-2 z-10 hover:shadow-blue-600/10 transition-all text-left flex flex-col h-full group"
    >
      <div className="p-4 rounded-2xl w-fit mb-6 bg-blue-600 text-white transition-colors">
        {icon}
      </div>
      <h4 className="text-xl font-black uppercase mb-2 tracking-tight leading-none group-hover:text-blue-600 transition-colors">
        {title}
      </h4>
      <p className="text-zinc-500 text-xs font-medium leading-relaxed mb-8 flex-1">
        {desc}
      </p>
      <div className="flex items-center justify-between mt-auto">
        <span className="text-[9px] font-black uppercase tracking-widest text-blue-600">
          Open
        </span>
        <div className="size-2 bg-blue-600 rounded-full animate-pulse" />
      </div>
    </Link>
  );
}
