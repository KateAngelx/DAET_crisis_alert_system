"use client";
import React, { useEffect, useState, useLayoutEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight, ShieldCheck, Bell, MapPin, PhoneCall, Radio, FileText, Users, Navigation
} from "lucide-react";
import { useCrisisStore, useAuthStore } from "@/app/store/crisisStore";
import { useNotificationStore } from "@/app/store/notificationStore";
import { HeroStatSkeleton } from "@/app/components/ui/Skeletons";
import { DashboardStatCard } from "@/app/components/dashboard/DashboardStatCard";
import { InfoOutlineCard } from "@/app/components/ui/InfoOutlineCard";
import { typography, iconSize, statGrid, getInfoCardAccent } from "@/lib/designSystem";
import { CommunicationChannelsOverview } from "@/app/components/CommunicationChannelsOverview";
import { PublicLiveAnalyticsSection } from "@/app/components/analytics/PublicAnalyticsOverview";
import { PublicFeedbackSection } from "@/app/components/feedback/PublicFeedbackSection";
import { BrandLogo } from "@/app/components/BrandLogo";
import { siteInfo } from "@/lib/siteInfo";
export default function Home() {
  const { fetchAlerts, alerts, loading, error } = useCrisisStore();
  const { isAuthenticated, user } = useAuthStore();
  const { unreadCount, fetchNotifications } = useNotificationStore();
  const [mounted, setMounted] = useState(false);
  const router = useRouter();
  useEffect(() => {
    setMounted(true);
    fetchAlerts();
  }, [fetchAlerts]);

  useEffect(() => {
    if (!mounted || !isAuthenticated || !user?.id) return;
    fetchNotifications(user.id);
  }, [mounted, isAuthenticated, user?.id, fetchNotifications]);

  useLayoutEffect(() => {
    if (!mounted || !isAuthenticated) return;
    if (user?.role === 'admin') router.replace('/admin');
    if (user?.role === 'guide') router.replace('/guide');
  }, [mounted, isAuthenticated, user, router]);

  if (!mounted || (isAuthenticated && (user?.role === 'admin' || user?.role === 'guide'))) return null;

  const activeAlerts = alerts.filter((a) => a.status === "Active" && a.is_public);
  const criticalCount = activeAlerts.filter((a) => a.severity === "Critical").length;

  return (
    <div className="flex flex-col bg-white font-sans text-left">
      
      {/* HERO SECTION */}
      <section
        data-landing-section="hero"
        className="relative pt-10 pb-12 sm:pt-12 sm:pb-14 lg:pb-16 min-h-[calc(100dvh-4rem)] sm:min-h-0 overflow-hidden bg-zinc-50 border-b border-zinc-200 flex flex-col justify-center"
      >
        <div className="absolute inset-0 w-full h-full bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        <div className="absolute top-0 right-0 -translate-y-12 translate-x-1/3 w-[800px] h-[800px] bg-blue-100 rounded-full blur-3xl opacity-60 mix-blend-multiply pointer-events-none"></div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center w-full">
          
          <div className="flex flex-col items-start gap-5 sm:gap-6 z-10 min-w-0">
            {isAuthenticated && (
              <div className="animate-in fade-in slide-in-from-bottom-2 duration-700 w-full">
                <h2 className={`${typography.pageTitle} text-blue-600 leading-none mb-1.5`}>
                  Mabuhay, {user?.name || 'Traveler'}!
                </h2>
                <p className="text-sm text-zinc-500 font-medium">
                  Check active alerts, affected areas, and safety instructions for Daet.
                </p>
              </div>
            )}

            <div className="space-y-3 w-full">
              <div className="flex items-center gap-3">
                <BrandLogo size={44} />
                <span className={`${typography.brand} text-blue-600`}>{siteInfo.brandName}</span>
              </div>
              <p className="text-[11px] sm:text-xs font-black uppercase tracking-[0.12em] sm:tracking-[0.15em] text-zinc-600 leading-snug max-w-md">
                {siteInfo.officeName} — {siteInfo.tagline}
              </p>
              <h1 className={`${typography.heroTitle} text-zinc-950`}>
                Current <span className="text-blue-600">Alerts.</span>{" "}
                <span className="text-zinc-400">Affected Areas.</span>
              </h1>
              <p className="text-sm text-zinc-500 font-medium max-w-md leading-relaxed">
                View official crisis updates for Daet, Camarines Norte — including alert type, severity, location, reported time, and safety instructions for tourists.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 w-full sm:w-auto">
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
            <div className="pt-6 sm:pt-8 border-t border-zinc-200 w-full flex items-center justify-center gap-6 sm:gap-10">
              <div className="text-center min-w-0">
                <p className="text-xl sm:text-2xl font-black text-zinc-900 leading-none mb-1">{activeAlerts.length}</p>
                <p className="text-[9px] sm:text-[10px] font-bold text-zinc-500 uppercase tracking-widest leading-tight">Active Alerts</p>
              </div>
              <div className="text-center min-w-0">
                <p className="text-xl sm:text-2xl font-black text-red-600 tabular-nums leading-none mb-1">{criticalCount}</p>
                <p className="text-[9px] sm:text-[10px] font-bold text-zinc-500 uppercase tracking-widest leading-tight">Critical</p>
              </div>
              <div className="text-center min-w-0">
                <p className="text-xl sm:text-2xl font-black text-zinc-900 leading-none mb-1">24/7</p>
                <p className="text-[9px] sm:text-[10px] font-bold text-zinc-500 uppercase tracking-widest leading-tight">Monitoring</p>
              </div>
            </div>
            )}
            {error && (
              <p className="text-xs font-bold text-red-500 mt-2">Could not load alert counts. Showing cached data.</p>
            )}
          </div>

          {/* Mobile preview — fills hero on small screens */}
          <div className="relative w-full max-w-sm mx-auto xl:hidden">
            <div className="bg-zinc-900 rounded-[32px] shadow-2xl overflow-hidden border-[6px] border-white">
              <div className="w-full bg-zinc-950 px-4 py-3 flex items-center justify-between border-b border-white/10">
                <div className="flex items-center gap-2 min-w-0">
                  <BrandLogo size={20} />
                </div>
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse shrink-0" />
              </div>
              <div className="bg-gradient-to-br from-zinc-800 to-zinc-900 p-5 space-y-3">
                <p className="text-[9px] font-black uppercase tracking-widest text-blue-400 leading-tight">
                  {siteInfo.brandName} · {siteInfo.officeName}
                </p>
                <div className="w-full h-24 bg-blue-900/30 rounded-2xl border border-blue-500/20 flex items-center justify-center">
                  <Bell size={28} className="text-blue-400 animate-pulse" />
                </div>
                <div className="w-full py-3 bg-blue-600/20 text-blue-400 rounded-xl border border-blue-500/20 text-center text-[9px] font-black uppercase tracking-widest">
                  Emergency Alert System
                </div>
              </div>
            </div>
          </div>

          {/* Desktop visual */}
          <div className="relative h-[550px] w-full hidden xl:block perspective-1000">
            
            <div className="absolute top-12 right-4 bg-white p-6 rounded-[32px] shadow-2xl border border-zinc-100 w-72 animate-in slide-in-from-right-8 duration-700 delay-100 z-30 hover:-translate-y-2 transition-transform">
              <div className="flex items-center gap-3 mb-3">
                <div className="bg-red-100 p-2.5 rounded-xl text-red-600">
                  <Bell size={20} className="animate-pulse" />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-red-600">Critical Alert</p>
                  <p className="text-sm font-bold text-zinc-900">Official weather advisory</p>
                </div>
              </div>
              <p className="text-xs text-zinc-500 font-medium">Shows alert type, severity, affected area, and safety instructions from {siteInfo.officeName}.</p>
            </div>

            <div className="absolute bottom-16 left-0 bg-white p-6 rounded-[32px] shadow-2xl border border-zinc-100 w-72 animate-in slide-in-from-bottom-8 duration-700 delay-300 z-30 hover:-translate-y-2 transition-transform">
              <div className="flex items-center gap-3 mb-3">
                <div className="bg-blue-100 p-2.5 rounded-xl text-blue-600">
                  <MapPin size={20} />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-blue-600">Affected Area</p>
                  <p className="text-sm font-bold text-zinc-900">Location & travel guidance</p>
                </div>
              </div>
              <p className="text-xs text-zinc-500 font-medium">Restricted zones, route status, and tourist safety guidance published by {siteInfo.officeName}.</p>
            </div>

            <div className="absolute inset-0 m-auto w-[320px] h-[450px] bg-zinc-900 rounded-[48px] shadow-2xl overflow-hidden z-20 border-[8px] border-white flex flex-col">
              <div className="w-full bg-zinc-950 p-4 flex items-center justify-between border-b border-white/10">
                <BrandLogo size={22} />
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              </div>
              <div className="flex-1 bg-gradient-to-br from-zinc-800 to-zinc-900 p-6 flex flex-col gap-4">
                <div className="w-full h-32 bg-blue-900/30 rounded-2xl border border-blue-500/20 flex items-center justify-center">
                  <Bell size={32} className="text-blue-400 animate-pulse" />
                </div>
                <div className="w-3/4 h-8 bg-zinc-800/50 rounded-lg border border-white/5" />
                <div className="w-full h-8 bg-zinc-800/50 rounded-lg border border-white/5" />
                <div data-mockup-footer className="mt-auto w-full py-4 bg-blue-600/20 text-blue-400 rounded-2xl border border-blue-500/20 text-center text-[10px] font-black uppercase tracking-widest">
                  Emergency Alert System
                </div>
              </div>
            </div>
            
          </div>
        </div>
      </section>

      {isAuthenticated && user?.role === "tourist" && (
        <section data-landing-section="alert-status" className="py-8 sm:py-10 bg-white border-b border-zinc-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <h3 className={`${typography.cardTitle} mb-4`}>Your Current Alert Status</h3>
            <div className={statGrid.dashboardThree}>
              <DashboardStatCard compact label="Active Alerts" value={activeAlerts.length} accent="red" />
              <DashboardStatCard compact label="My Reports" value="Track" accent="blue" />
              <DashboardStatCard
                compact
                label="My Notifications"
                value={unreadCount > 0 ? unreadCount : "—"}
                accent="purple"
              />
            </div>
          </div>
        </section>
      )}

      <section className="py-8 sm:py-10 bg-white border-b border-zinc-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <CommunicationChannelsOverview showRegisterCta={!isAuthenticated} />
          <p className="mt-6 pt-6 border-t border-zinc-100 text-xs text-zinc-500 font-medium">
            Past emergencies marked resolved by the Daet Municipal Tourism Office are kept for reference under Resolved in the menu above.
          </p>
        </div>
      </section>

      {/* SERVICES SECTION — guests only; signed-in tourists use Crisis Hub directly */}
      {!isAuthenticated && (
      <section className="py-12 sm:py-16 bg-white relative z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 text-left">
          
          <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <h3 className="text-xl font-black uppercase tracking-tight text-zinc-900 mb-4">
                What You Can Check Here
              </h3>
              <p className="text-zinc-500 font-medium max-w-xl text-sm leading-relaxed">
                Each section shows specific crisis information: active alerts, affected locations, report status, and official announcements from the Daet Municipal Tourism Office.
              </p>
            </div>
            <Link 
              href={isAuthenticated ? "/crisis/reports" : "/login"} 
              className="shrink-0 flex items-center gap-2 bg-blue-50 text-blue-600 px-6 py-3.5 rounded-full font-black text-xs uppercase tracking-widest hover:bg-blue-100 transition-colors border border-blue-100"
            >
              <PhoneCall size={16} /> Report an Incident
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 max-w-5xl mx-auto">
            <ServiceCard
              title="Crisis Hub"
              icon={ShieldCheck}
              accent="blue"
              desc="Active emergency alerts, affected-area map, safety instructions, and official announcements from the Daet Municipal Tourism Office."
              href="/crisis"
            />
            <ServiceCard
              title="Roads & Travel"
              icon={Navigation}
              accent="green"
              desc="Route status, detours, area hazards, and tourism-office recommended paths on one map."
              href="/routes"
            />
            <ServiceCard
              title="Incident Reporting"
              icon={FileText}
              accent="orange"
              desc="Report a hazard or emergency with location details and track response status from the tourism office."
              href="/crisis/reports"
            />
            <ServiceCard
              title="Alert Notifications"
              icon={Radio}
              accent="purple"
              desc="Sign in to receive private in-app updates when the tourism office responds to your reports or account activity occurs."
              href={isAuthenticated ? "/notifications" : "/login"}
            />
          </div>

          <div className="mt-12 p-5 sm:p-6 rounded-xl border border-blue-600 bg-white flex items-start gap-4">
             <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-blue-200 bg-blue-50 text-blue-700">
               <ShieldCheck size={20} strokeWidth={2.25} />
             </div>
             <div>
                <p className="text-xs font-black uppercase text-blue-700 tracking-widest mb-1">Emergency Contacts</p>
                <p className="text-sm text-zinc-600 font-medium leading-relaxed">
                  For immediate danger, call <strong>911</strong> or <strong>117 (PNP)</strong>. This system provides official crisis updates and report tracking — it does not dispatch emergency responders.
                </p>
             </div>
          </div>

        </div>
      </section>
      )}

      <PublicFeedbackSection />

      <PublicLiveAnalyticsSection className="-mx-4 md:-mx-6 lg:-mx-8 mt-0 z-0" />

    </div>
  );
}

function ServiceCard({ title, desc, icon: Icon, accent = "blue", href = "#" }) {
  const styles = getInfoCardAccent(accent);
  return (
    <InfoOutlineCard
      href={href}
      accent={accent}
      icon={Icon}
      label={title}
      description={desc}
      footer={
        <span className={`text-[9px] font-black uppercase tracking-widest transition-colors ${styles.label}`}>Open</span>
      }
    />
  );
}
